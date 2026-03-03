import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { db } from "@/server/db";
import { interfaceTextChannel } from "@/inngest/channels/interface-text";
import { InterfaceType } from "generated/prisma";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
  // return JSON.stringify(context, null, 2);
});

type InterfaceTextNodeData = {
  variableName?: string;
  // Backward compatibility for existing saved nodes.
  varibleName?: string;
  interfaceId?: string;
  operation?: "ADD_CONTENT" | "GET_CONTENT";
  // Backward compatibility for previously saved method values.
  method?: "ADD" | "GET";
  body?: string;
};

export const interfaceTextNodeExecutor: NodeExecutor<InterfaceTextNodeData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  const variableName = data.variableName ?? data.varibleName;

  await publish(
    interfaceTextChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!variableName) {
    await publish(
      interfaceTextChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      interfaceTextChannel().result({
        nodeId,
        status: "error",
        error: "Variable name is required",
      })
    );
    throw new NonRetriableError("Variable name is required");
  }

  if (!data.interfaceId) {
    await publish(
      interfaceTextChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      interfaceTextChannel().result({
        nodeId,
        status: "error",
        error: "Interface is required",
      })
    );
    throw new NonRetriableError("Interface is required");
  }

  const operation = data.operation ?? (data.method === "ADD" ? "ADD_CONTENT" : "GET_CONTENT");
  if (operation === "ADD_CONTENT" && !data.body?.trim()) {
    await publish(
      interfaceTextChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      interfaceTextChannel().result({
        nodeId,
        status: "error",
        error: "Content is required for Add Content",
      })
    );
    throw new NonRetriableError("Content is required for Add Content");
  }

  try {
    const result = await step.run(`interface-text-${nodeId}`, async () => {
      const item = await db.interface.findFirst({
        where: {
          id: data.interfaceId,
          userId,
          type: InterfaceType.TEXT,
        },
        include: {
          text: true,
        },
      });

      if (!item) {
        throw new NonRetriableError("Text interface not found");
      }

      const currentContent = item.text?.contentHtml ?? "";

      if (operation === "GET_CONTENT") {
        const responsePayload = {
          interfaceText: {
            interfaceId: item.id,
            interfaceName: item.name,
            operation,
            content: currentContent,
          },
        };

        return {
          ...context,
          [variableName]: responsePayload,
        };
      }

      const renderedBody = Handlebars.compile(data.body ?? "")(context);
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

      const responsePayload = {
        interfaceText: {
          interfaceId: item.id,
          interfaceName: item.name,
          operation,
          addedContent: renderedBody,
          content: nextContent,
        },
      };

      return {
        ...context,
        [variableName]: responsePayload,
      };
    });

    await publish(
      interfaceTextChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(result[variableName], null, 2),
      })
    );

    await publish(
      interfaceTextChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown interface text error";
    await publish(
      interfaceTextChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(
      interfaceTextChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};