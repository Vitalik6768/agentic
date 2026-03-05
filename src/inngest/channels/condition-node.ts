import { channel, topic } from "@inngest/realtime";

export const CONDITION_NODE_CHANNEL_NAME = "condition-node";

export const conditionNodeChannel = channel(CONDITION_NODE_CHANNEL_NAME).addTopic(
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