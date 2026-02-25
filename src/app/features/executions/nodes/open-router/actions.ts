"use server";

import { openRouterChannel } from "@/inngest/channels/open-router";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type OpenRouterToken = Realtime.Token<typeof openRouterChannel,
["status"]
>;

export async function fetchOpenRouterRealtimeToken(): Promise<OpenRouterToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: openRouterChannel(),
        topics: ["status"],
    })
    return token;
}