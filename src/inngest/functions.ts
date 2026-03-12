import { db } from "@/server/db";
import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { ExecutionStatus, type NodeType, type Prisma } from "generated/prisma";
import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { getExecutor } from "@/app/features/registry/executer-regestry";
import { topologicalSort } from "./utills";
import { openRouterChannel } from "./channels/open-router";
import { telegramTriggerChannel } from "./channels/telegram-trigger";
import { telegramMessageChannel } from "./channels/telegram-message";
import { webhookTriggerChannel } from "./channels/webhook_trigger";
import { interfaceTableChannel } from "./channels/interface-table";
import type { Realtime } from "@inngest/realtime";
import { conditionNodeChannel } from "./channels/condition-node";
import { agentNodeChannel } from "./channels/agent-node";
import { serpApiNodeChannel } from "./channels/serp-api-node";
import { extractorNodeChannel } from "./channels/extractor-node";


export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 0,
    onFailure: async ({ event, step }) => {
      await step.run("update-execution", async () => {
        return await db.execution.update({
          where: {
            inngestEventId: event.data.event.id,
          },
          data: {
            status: ExecutionStatus.FAILED,
            error: event.data.error.message,
            errorStack: event.data.error.stack,
          },
        });
      });
    },
  },
  {
    event: "workflow/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      telegramTriggerChannel(),
      telegramMessageChannel(),
      openRouterChannel(),
      webhookTriggerChannel(),
      interfaceTableChannel(),
      conditionNodeChannel(),
      agentNodeChannel(),
      serpApiNodeChannel(),
      extractorNodeChannel(),
    ],
  },
  // async ({ event, step, publish }) => {
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.id;
    if (!workflowId) {
      throw new NonRetriableError("Workflow ID is required");
    }

    if (!inngestEventId) {
      throw new NonRetriableError("Inngest event ID is required");
    }

    await db.execution.upsert({
      where: {
        inngestEventId,
      },
      create: {
        workflowId,
        inngestEventId,
      },
      update: {},
    });
    const workflow = await db.workflow.findUniqueOrThrow({
      where: {
        id: workflowId,
        userId: event.data.userId,
      },
      select: {
        userId: true,
        published: true,
        nodes: true,
        connections: true,
      },
    });
    const sortedNodes = topologicalSort(
      workflow.nodes as unknown as import("@xyflow/react").Node[],
      workflow.connections,
    ) as unknown as typeof workflow.nodes;
    const userId = workflow.userId;

    let context = event.data.initialData ?? {};
    const disableRealtimeFromEvent =
      (event.data.initialData as { meta?: { disableRealtime?: unknown } } | undefined)?.meta?.disableRealtime === true;
    const disableRealtime = workflow.published === true || disableRealtimeFromEvent;
    const publishFn: Realtime.PublishFn = disableRealtime
      ? (async () => undefined) as Realtime.PublishFn
      : publish;

    const incomingConnectionsByNode = new Map<string, typeof workflow.connections>();
    const outgoingConnectionsByNode = new Map<string, typeof workflow.connections>();
    for (const connection of workflow.connections) {
      const incoming = incomingConnectionsByNode.get(connection.toNodeId) ?? [];
      incoming.push(connection);
      incomingConnectionsByNode.set(connection.toNodeId, incoming);

      const outgoing = outgoingConnectionsByNode.get(connection.fromNodeId) ?? [];
      outgoing.push(connection);
      outgoingConnectionsByNode.set(connection.fromNodeId, outgoing);
    }

    const activeNodeIds = new Set<string>();
    for (const node of sortedNodes) {
      const incoming = incomingConnectionsByNode.get(node.id) ?? [];
      if (incoming.length === 0) {
        activeNodeIds.add(node.id);
      }
    }

    // execute only activated nodes; branch outputs activate downstream nodes
    for (const node of sortedNodes) {
      if (!activeNodeIds.has(node.id)) {
        continue;
      }

      const executor = getExecutor(node.type);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context,
        step,
        publish: publishFn,
      });

      const outgoing = outgoingConnectionsByNode.get(node.id) ?? [];
      const selectedOutput =
        (context.condition as Record<string, unknown> | undefined)?.[node.id] &&
        typeof (context.condition as Record<string, unknown>)[node.id] === "object"
          ? ((context.condition as Record<string, unknown>)[node.id] as { route?: unknown }).route
          : undefined;

      for (const connection of outgoing) {
        if (
          typeof selectedOutput === "string" &&
          selectedOutput.length > 0 &&
          connection.fromOutput !== selectedOutput
        ) {
          continue;
        }
        activeNodeIds.add(connection.toNodeId);
      }
    }
    await db.execution.update({
      where: {
        inngestEventId,
        workflowId,
      },
      data: {
        status: ExecutionStatus.SUCCESS,
        completedAt: new Date(),
        output: context as Prisma.InputJsonValue,
      },
    });
    return { workflowId, result: context };
  },
);