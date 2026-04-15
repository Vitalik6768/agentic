"use server";

import { chatTriggerChannel } from "@/inngest/channels/chat-trigger";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type ChatTriggerToken = Realtime.Token<typeof chatTriggerChannel,
["status"]
>;

export async function fetchChatTriggerRealtimeToken(): Promise<ChatTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: chatTriggerChannel(),
        topics: ["status"],
    })
    return token;
}