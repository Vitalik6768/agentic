import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import z from "zod";
import { PAGINATIONS } from "@/config/constans";
import { ExecutionStatus } from "generated/prisma";

const getCurrentMonthRangeUtc = () => {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { periodStart, periodEnd };
};

export const executionsRouter = createTRPCRouter({
  

  
  
  
  getCurrentMonthUsage: protectedProcedure
    .query(async ({ ctx }) => {
      const { periodStart, periodEnd } = getCurrentMonthRangeUtc();

      const usage = await db.monthlyUsage.findUnique({
        where: {
          userId_periodStart: {
            userId: ctx.session.user.id,
            periodStart,
          },
        },
        select: {
          executions: true,
        },
      });

      return {
        periodStart,
        periodEnd,
        executions: usage?.executions ?? 0,
      };
    }),
  getCurrentMonthStats: protectedProcedure
    .query(async ({ ctx }) => {
      const { periodStart, periodEnd } = getCurrentMonthRangeUtc();

      const usage = await db.monthlyUsage.findUnique({
        where: {
          userId_periodStart: {
            userId: ctx.session.user.id,
            periodStart,
          },
        },
        select: {
          executions: true,
        },
      });

      const failedProductionExecutions = await db.execution.count({
        where: {
          billable: true,
          status: ExecutionStatus.FAILED,
          startedAt: {
            gte: periodStart,
            lt: periodEnd,
          },
          workflow: {
            userId: ctx.session.user.id,
          },
        },
      });

      const productionExecutions = usage?.executions ?? 0;

      return {
        periodStart,
        periodEnd,
        productionExecutions,
        failedProductionExecutions,
      };
    }),
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return db.execution.findUniqueOrThrow({
        where: {
          id: input.id,
          workflow: {
            userId: ctx.session.user.id,
          },
        },
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),
  getLatestWorkflowOutput: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return db.execution.findFirst({
        where: {
          workflowId: input.workflowId,
          workflow: {
            userId: ctx.session.user.id,
          },
        },
        orderBy: {
          startedAt: "desc",
        },
        select: {
          id: true,
          status: true,
          output: true,
          startedAt: true,
          completedAt: true,
        },
      });
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
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;
      const [items, totalCount] = await Promise.all([
        db.execution.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            workflow: {
            userId: ctx.session.user.id,
   
          },
        },
          orderBy: {
            startedAt: "desc",
          },
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        db.execution.count({
          where: {
            workflow: {
              userId: ctx.session.user.id,
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