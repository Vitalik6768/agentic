"use server";

import { interfaceTableChannel } from "@/inngest/channels/interface-table";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type InterfaceTableToken = Realtime.Token<typeof interfaceTableChannel,
["status", "result"]
>;

export async function fetchInterfaceTableRealtimeToken(): Promise<InterfaceTableToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: interfaceTableChannel(),
        topics: ["status", "result"],
    })
    return token;
}