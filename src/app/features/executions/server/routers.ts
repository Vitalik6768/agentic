import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import z from "zod";
import { PAGINATIONS } from "@/config/constans";


export const executionsRouter = createTRPCRouter({
  

  
  
  
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