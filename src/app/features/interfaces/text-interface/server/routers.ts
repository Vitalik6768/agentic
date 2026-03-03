import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { InterfaceType } from "generated/prisma";
import z from "zod";

export const textInterfaceRouter = createTRPCRouter({
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
          type: InterfaceType.TEXT,
        },
        include: {
          text: true,
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Text interface not found",
        });
      }

      return item;
    }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        contentHtml: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.interface.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
          type: InterfaceType.TEXT,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Text interface not found",
        });
      }

      await db.$transaction(async (tx) => {
        await tx.textInterface.upsert({
          where: {
            interfaceId: input.id,
          },
          create: {
            interfaceId: input.id,
            contentHtml: input.contentHtml,
          },
          update: {
            contentHtml: input.contentHtml,
          },
        });

        await tx.interface.update({
          where: {
            id: input.id,
          },
          data: {
            updatedAt: new Date(),
          },
        });
      });

      return {
        id: input.id,
      };
    }),
});
