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
