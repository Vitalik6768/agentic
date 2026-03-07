"use server";

import { agentNodeChannel } from "@/inngest/channels/agent-node";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type AgentNodeToken = Realtime.Token<typeof agentNodeChannel,
["status", "result"]
>;

export async function fetchAgentNodeRealtimeToken(): Promise<AgentNodeToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: agentNodeChannel(),
        topics: ["status", "result"],
    })
    return token;
}