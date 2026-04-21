// import type { NodeExecutor } from "@/features/executions/types";
import type { NodeExecutor } from "../../executions/types";
import { chatTriggerChannel } from "@/inngest/channels/chat-trigger";
import { NonRetriableError } from "inngest";

type ChatTriggerData = {
  variableName?: string;
};

export const chatTriggerExecutor: NodeExecutor<ChatTriggerData> = async ({ data, nodeId, context, step, publish }) => {
  const variableName =
    typeof data?.variableName === "string" && data.variableName.trim()
      ? data.variableName.trim()
      : "chat";

  await publish(
    chatTriggerChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run(`execute chat trigger ${nodeId}`, async () => {
      const contextRecord = context as Record<string, unknown>;
      const chatPayload =
        "chat" in contextRecord ? contextRecord.chat : contextRecord;

      return {
        ...contextRecord,
        [variableName]: chatPayload,
      };
    });

    await publish(
      chatTriggerChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(result, null, 2),
      }),
    );
    await publish(
      chatTriggerChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown chat trigger error";
    await publish(
      chatTriggerChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      }),
    );
    await publish(
      chatTriggerChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(errorMessage);
  }
};