"use server";

import { loopNodeChannel } from "@/inngest/channels/loop-node";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type LoopToken = Realtime.Token<typeof loopNodeChannel,
["status", "result"]
>;

export async function fetchLoopRealtimeToken(): Promise<LoopToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: loopNodeChannel(),
        topics: ["status", "result"],
    })
    return token;
}