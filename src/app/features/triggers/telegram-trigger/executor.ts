// import type { NodeExecutor } from "@/features/executions/types";
import { telegramTriggerChannel } from "@/inngest/channels/telegram-trigger";
import type { NodeExecutor } from "../../executions/types";

type TelegramTriggerData = Record<string, unknown>;

export const telegramTriggerExecutor: NodeExecutor<TelegramTriggerData> = async ({ nodeId, context, step, publish }) => {
    await publish(telegramTriggerChannel().status({
        nodeId,
        status: "loading",
    }));
const result = await step.run(`execute telegram trigger ${nodeId}`, async () => context)
await publish(telegramTriggerChannel().status({
    nodeId,
    status: "success",
}));
  
return context;
}