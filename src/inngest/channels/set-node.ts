import { channel, topic } from "@inngest/realtime";

export const SET_NODE_CHANNEL_NAME = "set-node-execution";

export const setNodeChannel = channel(SET_NODE_CHANNEL_NAME).addTopic(
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