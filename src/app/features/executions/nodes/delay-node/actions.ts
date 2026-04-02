"use server";

import { delayNodeChannel } from "@/inngest/channels/delay-node";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type DelayNodeToken = Realtime.Token<typeof delayNodeChannel,
["status", "result"]
>;

export async function fetchDelayNodeRealtimeToken(): Promise<DelayNodeToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: delayNodeChannel(),
        topics: ["status", "result"],
    })
    return token;
}