import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { generateSlug } from "random-word-slugs";
import z from "zod";
// import { PAGINATIONS } from "@/config/constans";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import type { Node, Edge } from "@xyflow/react";
// import { sendWorkflowExecution } from "@/inngest/utils";
import { NodeType } from "generated/prisma";
import { PAGINATIONS } from "@/config/constans";
// import type { Edge } from "@xyflow/react";

export const workflowsRouter = createTRPCRouter({
  // create: protectedProcedure.mutation(async ({ ctx }) => {
  //   return db.workflow.create({
  //     data: {
  //       name: "New Workflow",
  //       userId: ctx.session.user.id,
  //     },
  //   });
  // }),

  // execute: protectedProcedure
  //   .input(z.object({
  //     id: z.string(),
  //   }))
  //   .mutation(async ({ ctx, input }) => {
  //     const workflow = await db.workflow.findUniqueOrThrow({
  //       where: {
  //         id: input.id,
  //         userId: ctx.session.user.id,
  //       },
  //     });
  //     await sendWorkflowExecution({
  //       workflowId: input.id,
  //       userId: ctx.session.user.id,
  //     });
  //   }),
  create: protectedProcedure.mutation(async ({ ctx }) => {
    return db.workflow.create({
      data: {
        name: generateSlug(2, { format: "kebab" }),
        userId: ctx.session.user.id,
        nodes: {
          create: {
            type: NodeType.INITIAL,
            position: { x: 0, y: 0 },
            name: NodeType.INITIAL,
          },
        },
      },
    });
  }),
  remove: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db.workflow.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
    }),
  updateName: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
      })
    )
    .mutation(({ ctx, input }) => {
      return db.workflow.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: {
          name: input.name,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nodes: z.array(z.object({
          id: z.string(),
          type: z.string().nullish(),
          position: z.object({
            x: z.number(),
            y: z.number(),
          }),
          data: z.record(z.string(), z.any()).optional(),
        })),
        edges: z.array(z.object({
          id: z.string(),
          source: z.string(),
          target: z.string(),
          sourceHandle: z.string().nullish(),
          targetHandle: z.string().nullish(),
        })),
      })
    )
    .mutation( async ({ ctx, input }) => {

      const { id, nodes, edges } = input;

      const workflow = await db.workflow.findUniqueOrThrow({
        where: {
          id,
          userId: ctx.session.user.id,
        },
      });

      return  await db.$transaction(async (tx) => {
        await tx.node.deleteMany({
          where: {
            workflowId: id,
          },
        });

        await tx.node.createMany({
          data: nodes.map((node) => ({
            id: node.id,
            workflowId: id,
            name:node.type ?? "unknown",
            type: node.type as NodeType,
            position: node.position,
            data: node.data ?? {},
          })),
        });

        await tx.connection.createMany({
          data: edges.map((edge) => ({
            workflowId: id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            fromOutput: edge.sourceHandle ?? "main",
            toInput: edge.targetHandle ?? "main",
          })),
        });

        await tx.workflow.update({
          where: {
            id,
          },
          data: {
            updatedAt: new Date(),
          },
        });
        return workflow;
      });
    }),
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const workflow = await db.workflow.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },

        include: {
          nodes: true,
          connections: true,
        },
      });

      if (!workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      const nodes: Node[] =
        workflow?.nodes.map((node) => ({
          id: node.id,
          position: node.position as { x: number; y: number },
          type: node.type,
          data: (node.data as Record<string, unknown>) || {},
        })) || [];

      const edges: Edge[] =
        workflow?.connections.map((connection) => ({
          id: connection.id,
          source: connection.fromNodeId,
          target: connection.toNodeId,
          sourceHandle: connection.fromOutput,
          targetHandle: connection.toInput,
        })) || [];
      return {
        id: workflow?.id,
        name: workflow?.name,
        nodes,
        edges,
      };
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATIONS.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATIONS.MIN_PAGE_SIZE)
          .max(PAGINATIONS.MAX_PAGE_SIZE)
          .default(PAGINATIONS.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const [items, totalCount] = await Promise.all([
        db.workflow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            userId: ctx.session.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        db.workflow.count({
          where: {
            userId: ctx.session.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        }),
      ]);
      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;
      return {
        items,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        page,
      };
    }),
});