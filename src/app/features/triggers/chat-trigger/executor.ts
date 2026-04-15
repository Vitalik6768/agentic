// import type { NodeExecutor } from "@/features/executions/types";
import type { NodeExecutor } from "../../executions/types";
import { chatTriggerChannel } from "@/inngest/channels/chat-trigger";

type ChatTriggerData = Record<string, unknown>;

export const chatTriggerExecutor: NodeExecutor<ChatTriggerData> = async ({ nodeId, context, publish }) => {
    await publish(chatTriggerChannel().status({
        nodeId,
        status: "loading",
    }));
    await publish(chatTriggerChannel().status({
        nodeId,
        status: "success",
    }));
  
    return context;
}