import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { InterfaceType } from "generated/prisma";
import z from "zod";

const tableRowSchema = z.object({
  id: z.string().min(1),
  cells: z.array(z.string()),
});

const tableCellBindingSchema = z.object({
  workflowId: z.string().min(1),
  path: z.string().min(1),
  mode: z.literal("latestOutput"),
});

const tableDataSchema = z
  .object({
    version: z.literal(1),
    rows: z.array(tableRowSchema).min(1),
    bindings: z.record(z.string(), tableCellBindingSchema).optional(),
  })
  .superRefine((value, ctx) => {
    const headerSize = value.rows[0]?.cells.length ?? 0;
    const seenRowIds = new Set<string>();

    value.rows.forEach((row, index) => {
      if (seenRowIds.has(row.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rows", index, "id"],
          message: "Row id must be unique",
        });
      }
      seenRowIds.add(row.id);

      if (row.cells.length !== headerSize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rows", index, "cells"],
          message: "All rows must have the same number of cells",
        });
      }
    });
  });

export const tableInterfaceRouter = createTRPCRouter({
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
          type: InterfaceType.TABLE,
        },
        include: {
          table: true,
        },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table interface not found",
        });
      }

      return item;
    }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        dataJson: tableDataSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.interface.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
          type: InterfaceType.TABLE,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Table interface not found",
        });
      }

      await db.$transaction(async (tx) => {
        await tx.tableInterface.upsert({
          where: {
            interfaceId: input.id,
          },
          create: {
            interfaceId: input.id,
            dataJson: input.dataJson,
          },
          update: {
            dataJson: input.dataJson,
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
