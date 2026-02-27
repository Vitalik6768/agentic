import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import z from "zod";
import { PAGINATIONS } from "@/config/constans";
// import { CredentialType, NodeType } from "@/generated/prisma/enums";
// import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@/types";
import { encrypt } from "@/lib/encryption";
// import { CredentialType } from "@/types";

export const credentialsRouter = createTRPCRouter({
  
  create: protectedProcedure
  .input(z.object({
    name: z.string().min(1),
    type: z.nativeEnum(CredentialType),
    value: z.string().min(1, "Name is required"),
  }))
  .mutation(async ({ ctx, input }) => {
    const { name, type, value } = input;

    return db.credential.create({
      data: {
        name,
        userId: ctx.session.user.id,
        type,
        value: encrypt(value),
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
      return db.credential.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        value: z.string().min(1),
        type: z.nativeEnum(CredentialType),
      })
    )
    .mutation( async ({ ctx, input }) => {

      const { id, name, value, type } = input;

      await db.credential.findUniqueOrThrow({
        where: {
          id,
          userId: ctx.session.user.id,
        },
      });
      return db.credential.update({
        where: { id, userId: ctx.session.user.id },
        data: { name, value: encrypt(value), type },
      });

    }),
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return db.credential.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
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
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;
      const [items, totalCount] = await Promise.all([
        db.credential.findMany({
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
        db.credential.count({
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
    getByType: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(CredentialType),
      })
    )
    .query(({ ctx, input }) => {
      const { type } = input;
      return db.credential.findMany({
        where: {
          userId: ctx.session.user.id,
          type,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }),
});