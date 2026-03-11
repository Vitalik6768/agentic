import { channel, topic } from "@inngest/realtime";

export const SERP_API_NODE_CHANNEL_NAME = "serp-api-node";


export const serpApiNodeChannel = channel(SERP_API_NODE_CHANNEL_NAME).addTopic(
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