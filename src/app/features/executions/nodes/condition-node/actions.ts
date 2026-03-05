"use server";

import { conditionNodeChannel } from "@/inngest/channels/condition-node";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type ConditionNodeToken = Realtime.Token<typeof conditionNodeChannel,
["status", "result"]
>;

export async function fetchConditionNodeRealtimeToken(): Promise<ConditionNodeToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: conditionNodeChannel(),
        topics: ["status", "result"],
    })
    return token;
}