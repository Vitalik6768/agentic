import Handlebars from "handlebars";
import { InterfaceType } from "generated/prisma";
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/server/db";
import type { TextInterfaceToolConfig } from "../types";

type TextInterfaceToolRuntime = {
  userId: string;
  safeContext: Record<string, unknown>;
  config?: TextInterfaceToolConfig;
};

const outputSchema = z.object({
  success: z.boolean(),
  interfaceId: z.string().optional(),
  interfaceName: z.string().optional(),
  operation: z.enum(["GET_CONTENT", "ADD_CONTENT"]).optional(),
  content: z.string().optional(),
  addedContent: z.string().optional(),
  error: z.string().optional(),
});

export const createTextInterfaceTool = ({
  userId,
  safeContext,
  config,
}: TextInterfaceToolRuntime) => {
  return tool({
    description:
      "Read or append content to a configured Text Interface. Configure interface first from node tool settings.",
    inputSchema: z.object({
      content: z.string().optional(),
    }),
    outputSchema,
    execute: async ({ content }) => {
      if (!config?.interfaceId) {
        return {
          success: false,
          error: "Text Interface tool is not configured. Set an interface first.",
        };
      }

      const item = await db.interface.findFirst({
        where: {
          id: config.interfaceId,
          userId,
          type: InterfaceType.TEXT,
        },
        include: {
          text: true,
        },
      });

      if (!item) {
        return {
          success: false,
          error: "Configured text interface was not found.",
        };
      }

      const currentContent = item.text?.contentHtml ?? "";
      const operation = config.operation ?? "GET_CONTENT";

      if (operation === "GET_CONTENT") {
        return {
          success: true,
          interfaceId: item.id,
          interfaceName: item.name,
          operation,
          content: currentContent,
        };
      }

      const contentSource = config.contentSource ?? "TEMPLATE";
      const renderedBody =
        contentSource === "AGENT_INPUT"
          ? (content ?? "")
          : Handlebars.compile(config.body ?? "")(safeContext);

      if (!renderedBody.trim()) {
        return {
          success: false,
          interfaceId: item.id,
          interfaceName: item.name,
          operation,
          error:
            contentSource === "AGENT_INPUT"
              ? "No content provided by agent input."
              : "Template content is empty.",
        };
      }

      const nextContent = `${currentContent}${renderedBody}`;

      await db.$transaction(async (tx) => {
        await tx.textInterface.upsert({
          where: {
            interfaceId: item.id,
          },
          create: {
            interfaceId: item.id,
            contentHtml: nextContent,
          },
          update: {
            contentHtml: nextContent,
          },
        });

        await tx.interface.update({
          where: {
            id: item.id,
          },
          data: {
            updatedAt: new Date(),
          },
        });
      });

      return {
        success: true,
        interfaceId: item.id,
        interfaceName: item.name,
        operation,
        addedContent: renderedBody,
        content: nextContent,
      };
    },
  });
};
