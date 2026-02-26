"use server";

import { setNodeChannel } from "@/inngest/channels/set-node";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type SetNodeToken = Realtime.Token<typeof setNodeChannel,
["status", "result"]
>;

export async function fetchSetNodeRealtimeToken(): Promise<SetNodeToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: setNodeChannel(),
        topics: ["status", "result"],
    })
    return token;
}