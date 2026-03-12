"use server";

import { extractorNodeChannel } from "@/inngest/channels/extractor-node";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type ExtractorNodeToken = Realtime.Token<typeof extractorNodeChannel,
["status", "result"]
>;

export async function fetchExtractorNodeRealtimeToken(): Promise<ExtractorNodeToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: extractorNodeChannel(),
        topics: ["status", "result"],
    })
    return token;
}