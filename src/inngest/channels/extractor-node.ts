import { channel, topic } from "@inngest/realtime";

export const EXTRACTOR_NODE_CHANNEL_NAME = "extractor-node-execution";

export const extractorNodeChannel = channel(EXTRACTOR_NODE_CHANNEL_NAME).addTopic(
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
);
