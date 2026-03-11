"use server";

import { serpApiNodeChannel } from "@/inngest/channels/serp-api-node";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type SerpApiNodeToken = Realtime.Token<typeof serpApiNodeChannel,
["status", "result"]
>;

export async function fetchSerpApiNodeRealtimeToken(): Promise<SerpApiNodeToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: serpApiNodeChannel(),
        topics: ["status", "result"],
    })
    return token;
}