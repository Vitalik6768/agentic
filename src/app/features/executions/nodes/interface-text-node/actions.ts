"use server";

import { interfaceTextChannel } from "@/inngest/channels/interface-text";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type InterfaceTextToken = Realtime.Token<typeof interfaceTextChannel,
["status", "result"]
>;

export async function fetchInterfaceTextRealtimeToken(): Promise<InterfaceTextToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: interfaceTextChannel(),
        topics: ["status", "result"],
    })
    return token;
}