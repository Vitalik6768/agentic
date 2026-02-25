import { channel, topic } from "@inngest/realtime";

export const OPEN_ROUTER_CHANNEL_NAME = "open-router-execution";

export const openRouterChannel = channel(OPEN_ROUTER_CHANNEL_NAME).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>()
)