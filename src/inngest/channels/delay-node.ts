import { channel, topic } from "@inngest/realtime";

export const  DELAY_NODE_CHANNEL_NAME = "delay-node";

export const delayNodeChannel = channel(DELAY_NODE_CHANNEL_NAME).addTopic(
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