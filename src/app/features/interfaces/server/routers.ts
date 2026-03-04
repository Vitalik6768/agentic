import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { InterfaceType } from "generated/prisma";
import { generateSlug } from "random-word-slugs";
import z from "zod";

export const interfacesRouter = createTRPCRouter({
  getMany: protectedProcedure.query(async ({ ctx }) => {
    const items = await db.interface.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        text: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return { items };
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).optional(),
        type: z.nativeEnum(InterfaceType),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const created = await db.interface.create({
        data: {
          name: input.name ?? generateSlug(2, { format: "kebab" }),
          slug: generateSlug(3, { format: "kebab" }),
          type: input.type,
          userId: ctx.session.user.id,
          ...(input.type === InterfaceType.TEXT
            ? {
                text: {
                  create: {},
                },
              }
            : {}),
          ...(input.type === InterfaceType.TABLE
            ? {
                table: {
                  create: {
                    dataJson: {
                      version: 1,
                      rows: [
                        { id: "r_header", cells: ["Column 1", "Column 2"] },
                        { id: "r_1", cells: ["", ""] },
                      ],
                    },
                  },
                },
              }
            : {}),
        },
      });

      return created;
    }),

  remove: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return db.interface.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
    }),
});
