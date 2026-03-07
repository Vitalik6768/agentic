import { channel, topic } from "@inngest/realtime";

export const AGENT_NODE_CHANNEL_NAME = "agent-node";

export const agentNodeChannel = channel(AGENT_NODE_CHANNEL_NAME).addTopic(
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