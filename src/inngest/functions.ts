import { db } from "@/server/db";
import { inngest } from "./client";
import { NonRetriableError } from "inngest";
import { ExecutionStatus, NodeType, type Prisma } from "generated/prisma";
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
import { extractorNodeChannel } from "./channels/extractor-node";
import { loopNodeChannel } from "./channels/loop-node";
import { breakNodeChannel } from "./channels/break-node";
import { delayNodeChannel } from "./channels/delay-node";
import { chatTriggerChannel } from "./channels/chat-trigger";
import { chatInterfaceChannel } from "./channels/chat-interface";
import { googleSheetChannel } from "./channels/google-sheet";


/**
 * Runs a workflow graph in topological order. Nodes with no incoming edges start
 * as "active"; after each node runs, its outgoing edges activate downstream nodes.
 * Condition nodes stash the chosen route on `context.condition[nodeId].route` so
 * only edges from that output handle are followed.
 */
export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 0,
    // Persist failure on the execution row when the function throws (retries are off).
    onFailure: async ({ event, step, publish }) => {
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

      const chatRunId =
        (event.data.event.data?.initialData as { chat?: { chatRunId?: unknown } } | undefined)?.chat?.chatRunId ??
        (event.data.event.data?.initialData as { meta?: { chatRunId?: unknown } } | undefined)?.meta?.chatRunId;
      if (typeof chatRunId === "string" && chatRunId.length > 0) {
        // If this run was started from the Chat Interface, push the failure to the UI immediately.
        await publish(
          chatInterfaceChannel().result({
            chatRunId,
            status: "error",
            error: event.data.error.message,
          }),
        );
        await publish(
          chatInterfaceChannel().status({
            chatRunId,
            status: "error",
          }),
        );
      }
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
      googleSheetChannel(),
      conditionNodeChannel(),
      agentNodeChannel(),
      extractorNodeChannel(),
      loopNodeChannel(),
      breakNodeChannel(),
      delayNodeChannel(),
      chatTriggerChannel(),
      chatInterfaceChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    type FlowNode = import("@xyflow/react").Node;
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

    const periodStartUtc = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1, 0, 0, 0, 0));
    if (workflow.published === true) {
      // "Production executions" are defined as runs of *published* workflows.
      // We snapshot this onto the execution row (`billable=true`) so later unpublish/publish
      // does not rewrite historical usage. The `updateMany(... billable:false)` guard ensures
      // we increment MonthlyUsage at most once per execution (Inngest can re-deliver events).
      // Mark execution as billable exactly once and increment monthly usage only once.
      await db.$transaction(async (tx) => {
        const updated = await tx.execution.updateMany({
          where: {
            inngestEventId,
            workflowId,
            billable: false,
          },
          data: {
            billable: true,
          },
        });

        if (updated.count === 1) {
          // One row per (user, month). If it doesn't exist yet, create it; otherwise increment.
          await tx.monthlyUsage.upsert({
            where: {
              userId_periodStart: {
                userId: workflow.userId,
                periodStart: periodStartUtc,
              },
            },
            create: {
              userId: workflow.userId,
              periodStart: periodStartUtc,
              executions: 1,
            },
            update: {
              executions: {
                increment: 1,
              },
            },
          });
        }
      });
    }
    const sortedNodes = topologicalSort(
      workflow.nodes as unknown as FlowNode[],
      workflow.connections,
    ) as FlowNode[];
    const nodesById = new Map<string, FlowNode>(
      sortedNodes.map((n) => [n.id, n]),
    );
    const userId = workflow.userId;

    // When present, this execution is expected to report its final output to the Chat Interface
    // via Inngest Realtime (keyed by this id).
    const chatRunId =
      (event.data.initialData as { chat?: { chatRunId?: unknown } } | undefined)?.chat?.chatRunId ??
      (event.data.initialData as { meta?: { chatRunId?: unknown } } | undefined)?.meta?.chatRunId;

    // Shared JSON bag passed through executors; each node may read/write keys.
    let context = event.data.initialData ?? {};
    // Skip Inngest Realtime publishes for published workflows or when callers opt out (e.g. tests).
    const disableRealtimeFromEvent =
      (event.data.initialData as { meta?: { disableRealtime?: unknown } } | undefined)?.meta?.disableRealtime === true;
    const disableRealtime = workflow.published === true || disableRealtimeFromEvent;
    const publishFn: Realtime.PublishFn = disableRealtime
      ? (async () => undefined) as Realtime.PublishFn
      : publish;

    // Index edges by target/source so we can find entry nodes and follow branches efficiently.
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

    // Seed execution from the caller-selected start node(s).
    const startNodeId = (event.data as { startNodeId?: unknown } | undefined)?.startNodeId;
    const startNodeIds = (event.data as { startNodeIds?: unknown } | undefined)?.startNodeIds;

    const requestedStartNodeIds: string[] = [
      ...(typeof startNodeId === "string" && startNodeId.length > 0 ? [startNodeId] : []),
      ...(Array.isArray(startNodeIds)
        ? startNodeIds.filter((id): id is string => typeof id === "string" && id.length > 0)
        : []),
    ];

    const activeNodeIds = new Set<string>();
    for (const nodeId of requestedStartNodeIds) {
      activeNodeIds.add(nodeId);
    }

    // Fallback: if callers didn't provide a start node, run from "real" entry points
    // (nodes with no incoming edges, but at least one outgoing edge). This prevents
    // totally-disconnected nodes from executing.
    if (activeNodeIds.size === 0) {
      for (const node of sortedNodes) {
        const incoming = incomingConnectionsByNode.get(node.id) ?? [];
        const outgoing = outgoingConnectionsByNode.get(node.id) ?? [];
        if (incoming.length === 0 && outgoing.length > 0) {
          activeNodeIds.add(node.id);
        }
      }
    }

    // --- Loop body: run only the subgraph activated from the loop node's outputs, once per item ---
    const getSelectedOutput = (currentContext: Record<string, unknown>, nodeId: string) =>
      (currentContext.condition as Record<string, unknown> | undefined)?.[nodeId] &&
      typeof (currentContext.condition as Record<string, unknown>)[nodeId] === "object"
        ? ((currentContext.condition as Record<string, unknown>)[nodeId] as { route?: unknown }).route
        : undefined;

    // Mark downstream nodes as runnable. If a condition already picked a branch,
    // only edges whose `fromOutput` matches that route are activated.
    /** Break nodes only activate downstream edges on the last iteration of the selected loop. */
    const shouldActivateBreakOutgoing = (
      currentContext: Record<string, unknown>,
      loopNodeId: string,
    ): boolean => {
      const loopBag =
        typeof currentContext.loop === "object" && currentContext.loop !== null
          ? (currentContext.loop as Record<string, unknown>)
          : undefined;
      const state = loopBag?.[loopNodeId];
      if (!state || typeof state !== "object") {
        return false;
      }
      const { index, total } = state as { index?: unknown; total?: unknown };
      if (typeof index !== "number" || typeof total !== "number") {
        return false;
      }
      if (total <= 0) {
        return false;
      }
      return index === total - 1;
    };

    const getOrderedOutgoingConnections = (
      nodeId: string,
      currentContext: Record<string, unknown>,
    ): (typeof workflow.connections) => {
      const outgoing = [...(outgoingConnectionsByNode.get(nodeId) ?? [])];
      const selectedOutput = getSelectedOutput(currentContext, nodeId);
      const filtered = outgoing.filter((connection) => {
        if (
          typeof selectedOutput === "string" &&
          selectedOutput.length > 0 &&
          connection.fromOutput !== selectedOutput
        ) {
          return false;
        }
        return true;
      });

      // Execution ordering policy:
      // - We want depth-first behavior (finish the downstream chain before continuing elsewhere).
      // - When a node has multiple outgoing edges, "next" should prefer the node visually to the right
      //   (higher x coordinate). This makes execution feel aligned with the canvas layout.
      filtered.sort((a, b) => {
        const aPos = nodesById.get(a.toNodeId)?.position;
        const bPos = nodesById.get(b.toNodeId)?.position;
        const ax = typeof aPos?.x === "number" ? aPos.x : 0;
        const bx = typeof bPos?.x === "number" ? bPos.x : 0;
        if (ax !== bx) return bx - ax;

        const ay = typeof aPos?.y === "number" ? aPos.y : 0;
        const by = typeof bPos?.y === "number" ? bPos.y : 0;
        if (ay !== by) return ay - by;

        return a.toNodeId.localeCompare(b.toNodeId);
      });

      return filtered;
    };

    const activateOutgoingNodes = (
      nodeId: string,
      currentContext: Record<string, unknown>,
      targetActiveNodeIds: Set<string>,
    ) => {
      const ordered = getOrderedOutgoingConnections(nodeId, currentContext);
      for (const connection of ordered) {
        targetActiveNodeIds.add(connection.toNodeId);
      }
    };

    const pushOutgoingToStack = (
      nodeId: string,
      currentContext: Record<string, unknown>,
      stack: string[],
      executed: Set<string>,
    ) => {
      const ordered = getOrderedOutgoingConnections(nodeId, currentContext);
      // Stack is LIFO. We push in reverse so the highest-priority connection (right-most)
      // ends up on top of the stack and executes immediately.
      for (let i = ordered.length - 1; i >= 0; i -= 1) {
        const nextId = ordered[i]!.toNodeId;
        if (executed.has(nextId)) continue;
        stack.push(nextId);
      }
    };

    const executeActivatedNodesDfs = async (
      initialContext: Record<string, unknown>,
      initialActiveNodeIds: Set<string>,
    ): Promise<Record<string, unknown>> => {
      // Depth-first executor for a pre-activated subgraph (used for loop iterations).
      // This intentionally differs from a pure topological scan: it runs each node's
      // downstream chain immediately, which matches user expectations from the canvas layout.
      let scopedContext = initialContext;
      const executed = new Set<string>();
      const stack: string[] = [];
      for (const nodeId of initialActiveNodeIds) {
        stack.push(nodeId);
      }
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (executed.has(currentId)) continue;
        if (!initialActiveNodeIds.has(currentId)) continue;

        const scopedNode = nodesById.get(currentId);
        if (!scopedNode) continue;
        executed.add(currentId);

        const scopedExecutor = getExecutor(scopedNode.type as NodeType);
        scopedContext = await scopedExecutor({
          data: scopedNode.data,
          nodeId: scopedNode.id,
          userId,
          context: scopedContext,
          step,
          publish: publishFn,
        });

        if (scopedNode.type === NodeType.BREAK_NODE) {
          const loopNodeId = (scopedNode.data as { loopNodeId?: unknown }).loopNodeId;
          if (
            typeof loopNodeId === "string" &&
            loopNodeId.length > 0 &&
            shouldActivateBreakOutgoing(scopedContext, loopNodeId)
          ) {
            const ordered = getOrderedOutgoingConnections(scopedNode.id, scopedContext);
            for (const conn of ordered) initialActiveNodeIds.add(conn.toNodeId);
            pushOutgoingToStack(scopedNode.id, scopedContext, stack, executed);
          }
        } else {
          const ordered = getOrderedOutgoingConnections(scopedNode.id, scopedContext);
          for (const conn of ordered) initialActiveNodeIds.add(conn.toNodeId);
          pushOutgoingToStack(scopedNode.id, scopedContext, stack, executed);
        }
      }
      return scopedContext;
    };

    // --- Main pass: same activation rules as above; loop nodes expand into per-iteration subgraph runs ---
    {
      // Main depth-first execution pass.
      // Note: this is not a strict "global topo walk". We still compute a topo order for
      // stable metadata (and to resolve node positions), but execution is driven by a stack
      // so we can finish downstream chains first.
      const executed = new Set<string>();
      const stack: string[] = [];
      for (const nodeId of activeNodeIds) {
        stack.push(nodeId);
      }
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (executed.has(currentId)) continue;
        if (!activeNodeIds.has(currentId)) continue;
        const node = nodesById.get(currentId);
        if (!node) continue;
        executed.add(currentId);

        const executor = getExecutor(node.type as NodeType);
        context = await executor({
          data: node.data,
          nodeId: node.id,
          userId,
          context,
          step,
          publish: publishFn,
        });

        if (node.type === NodeType.LOOP_NODE) {
        // Reads `items` from context under the configured variable; for each element,
        // downstream nodes see `current`/`index` on that variable and `context.loop[nodeId]`.
        const loopNodeData = node.data as { variableName?: unknown; varibleName?: unknown };
        const loopVariableCandidate = loopNodeData.variableName ?? loopNodeData.varibleName;
        const loopVariableName =
          typeof loopVariableCandidate === "string" && loopVariableCandidate.trim()
            ? loopVariableCandidate.trim()
            : undefined;
        const loopValue =
          loopVariableName && typeof context[loopVariableName] === "object" && context[loopVariableName] !== null
            ? (context[loopVariableName] as Record<string, unknown>)
            : undefined;
        const loopItems: unknown[] = Array.isArray(loopValue?.items)
          ? (loopValue.items as unknown[])
          : [];

        for (let index = 0; index < loopItems.length; index += 1) {
          const item: unknown = loopItems[index];
          // Fresh activation set per iteration so branches do not leak across items.
          const scopedActiveNodeIds = new Set<string>();
          const scopedContext = {
            ...context,
            ...(loopVariableName
              ? {
                  [loopVariableName]: {
                    ...(loopValue ?? {}),
                    current: item,
                    index,
                  },
                }
              : {}),
            loop: {
              ...(typeof context.loop === "object" && context.loop !== null
                ? (context.loop as Record<string, unknown>)
                : {}),
              [node.id]: {
                index,
                item,
                total: loopItems.length,
                variableName: loopVariableName,
              },
            },
          };

          activateOutgoingNodes(node.id, scopedContext, scopedActiveNodeIds);
          await executeActivatedNodesDfs(scopedContext, scopedActiveNodeIds);
        }
          continue;
        }

        if (node.type === NodeType.BREAK_NODE) {
          const loopNodeId = (node.data as { loopNodeId?: unknown }).loopNodeId;
          if (
            typeof loopNodeId === "string" &&
            loopNodeId.length > 0 &&
            shouldActivateBreakOutgoing(context, loopNodeId)
          ) {
            const ordered = getOrderedOutgoingConnections(node.id, context);
            for (const conn of ordered) activeNodeIds.add(conn.toNodeId);
            pushOutgoingToStack(node.id, context, stack, executed);
          }
        } else {
          const ordered = getOrderedOutgoingConnections(node.id, context);
          for (const conn of ordered) activeNodeIds.add(conn.toNodeId);
          pushOutgoingToStack(node.id, context, stack, executed);
        }
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

    if (typeof chatRunId === "string" && chatRunId.length > 0) {
      // Push the *final* execution output to the chat UI. The UI filters by `chatRunId`
      // so parallel sends don't race each other.
      await publishFn(
        chatInterfaceChannel().result({
          chatRunId,
          status: "success",
          output: context,
        }),
      );
      await publishFn(
        chatInterfaceChannel().status({
          chatRunId,
          status: "success",
        }),
      );
    }
    return { workflowId, result: context };
  },
);