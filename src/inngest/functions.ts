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
import type { Realtime } from "@inngest/realtime";
// import { getExecutor } from "@/features/executions/lib/executer-regestry";
// import { getExecutor } from "@/features/executions/lib/executer-regestry";
// import { ExecutionStatus, NodeType } from "@/generated/prisma";
// import { httpRequestChannel } from "./channels/http-request";
// import { manualTriggerChannel } from "./channels/manual-trigger";
// import { googleFormTriggerChannel } from "./channels/google-form-trigger";
// import { geminiChannel } from "./channels/gemini";
// import { openAiChannel } from "./channels/openai";
// import { discordChannel } from "./channels/discord";
// import { slackChannel } from "./channels/slack";

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
    //   googleFormTriggerChannel(),
    //   geminiChannel(),
    //   openAiChannel(),
    //   discordChannel(),
    //   slackChannel(),
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

    //exucute nodes

    for (const node of sortedNodes) {
      const executor = getExecutor(node.type);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context,
        step,
        publish: publishFn,
      });
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