import { channel, topic } from "@inngest/realtime";

export const LOOP_NODE_CHANNEL_NAME = "loop-node-execution";


export const loopNodeChannel = channel(LOOP_NODE_CHANNEL_NAME).addTopic(
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