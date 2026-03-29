"use server";

import { breakNodeChannel } from "@/inngest/channels/break-node";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type BreakNodeToken = Realtime.Token<typeof breakNodeChannel,
["status"]
>;

/** Short-lived token so the client can subscribe to this workflow's Break node status topic. */
export async function fetchBreakNodeRealtimeToken(): Promise<BreakNodeToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: breakNodeChannel(),
        topics: ["status"],
    })
    return token;
}