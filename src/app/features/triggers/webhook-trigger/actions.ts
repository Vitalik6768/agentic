"use server";

import { webhookTriggerChannel } from "@/inngest/channels/webhook_trigger";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type WebhookTriggerToken = Realtime.Token<typeof webhookTriggerChannel,
["status", "result"]
>;

export async function fetchWebhookTriggerRealtimeToken(): Promise<WebhookTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: webhookTriggerChannel(),
        topics: ["status", "result"],
    })
    return token;
}