// import type { NodeExecutor } from "@/features/executions/types";
import { telegramTriggerChannel } from "@/inngest/channels/telegram-trigger";
import type { NodeExecutor } from "../../executions/types";
import { NonRetriableError } from "inngest";

type TelegramTriggerData = Record<string, unknown>;

export const telegramTriggerExecutor: NodeExecutor<TelegramTriggerData> = async ({ nodeId, context, step, publish }) => {
  await publish(
    telegramTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run(`execute telegram trigger ${nodeId}`, async () => context);
    await publish(
      telegramTriggerChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(result, null, 2),
      })
    );
    await publish(
      telegramTriggerChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Telegram trigger error";
    await publish(
      telegramTriggerChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(
      telegramTriggerChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(errorMessage);
  }
};