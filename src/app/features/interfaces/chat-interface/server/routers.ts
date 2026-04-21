import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { sendWorkflowExecution } from "@/inngest/utills";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { InterfaceType, NodeType } from "generated/prisma";
import { randomUUID } from "crypto";
import z from "zod";

const chatInterfaceSettingsSchema = z
  .object({
    workflowId: z.string().min(1).optional(),
  })
  .strict();

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const parseChatSettings = (value: unknown): z.infer<typeof chatInterfaceSettingsSchema> => {
  if (!isRecord(value)) return {};
  const parsed = chatInterfaceSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
};

export const chatInterfaceRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const item = await db.interface.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
          type: InterfaceType.CHAT,
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat interface not found",
        });
      }

      return {
        ...item,
        settings: parseChatSettings(item.settings),
      };
    }),

  saveSettings: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        settings: chatInterfaceSettingsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.interface.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
          type: InterfaceType.CHAT,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat interface not found",
        });
      }

      await db.interface.update({
        where: {
          id: input.id,
        },
        data: {
          settings: input.settings,
          updatedAt: new Date(),
        },
      });

      return {
        id: input.id,
      };
    }),

  getChatTriggerWorkflows: protectedProcedure.query(async ({ ctx }) => {
    const workflows = await db.workflow.findMany({
      where: {
        userId: ctx.session.user.id,
        nodes: {
          some: {
            type: NodeType.CHAT_TRIGGER,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        published: true,
      },
    });

    return {
      items: workflows,
    };
  }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        interfaceId: z.string(),
        workflowId: z.string(),
        message: z.string().trim().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Correlation id between the UI send action and the eventual workflow result publish.
      // This avoids DB polling and lets the UI update as soon as the run completes.
      const chatRunId = randomUUID();
      const [chatInterface, workflow, chatTriggerNode] = await Promise.all([
        db.interface.findFirst({
          where: {
            id: input.interfaceId,
            userId: ctx.session.user.id,
            type: InterfaceType.CHAT,
          },
          select: {
            id: true,
          },
        }),
        db.workflow.findFirst({
          where: {
            id: input.workflowId,
            userId: ctx.session.user.id,
          },
          select: {
            id: true,
            userId: true,
            published: true,
          },
        }),
        db.node.findFirst({
          where: {
            workflowId: input.workflowId,
            type: NodeType.CHAT_TRIGGER,
          },
          select: {
            id: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
      ]);

      if (!chatInterface) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chat interface not found",
        });
      }

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      if (!chatTriggerNode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selected workflow does not have a Chat Trigger node",
        });
      }

      await sendWorkflowExecution({
        workflowId: workflow.id,
        userId: workflow.userId,
        startNodeId: chatTriggerNode.id,
        initialData: {
          meta: {
            // Chat UI needs realtime even for published workflows.
            disableRealtime: false,
            triggerSource: "chat",
            chatRunId,
          },
          chat: {
            interfaceId: input.interfaceId,
            chatRunId,
            message: input.message,
          },
        },
      });

      return {
        ok: true,
        // Returned to the client so it can wait for the matching realtime `result` event.
        chatRunId,
      };
    }),
});

