import { channel, topic } from "@inngest/realtime";

/** Realtime channel name; the canvas subscribes with a token scoped to this channel. */
export const BREAK_NODE_CHANNEL_NAME = "break-node-execution";

/** Publishes per-node execution status so the editor can show loading/success/error on the Break node. */
export const breakNodeChannel = channel(BREAK_NODE_CHANNEL_NAME).addTopic(
    topic("status").type<{
        nodeId: string;
        status: "loading" | "success" | "error";
    }>()
)