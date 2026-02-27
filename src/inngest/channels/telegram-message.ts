import { channel, topic } from "@inngest/realtime";

export const TELEGRAM_MESSAGE_CHANNEL_NAME = "telegram-message-execution";

export const telegramMessageChannel = channel(TELEGRAM_MESSAGE_CHANNEL_NAME).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>()
).addTopic(
    topic("result").type<{
        nodeId: string;
        status: "success" | "error";
        output?: string;
        error?: string;
    }>()
)