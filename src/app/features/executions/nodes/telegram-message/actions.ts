"use server";

import { telegramMessageChannel } from "@/inngest/channels/telegram-message";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";


export type TelegramMessageToken = Realtime.Token<typeof telegramMessageChannel,
["status", "result"]
>;

export async function fetchTelegramMessageRealtimeToken(): Promise<TelegramMessageToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: telegramMessageChannel(),
        topics: ["status", "result"],
    })
    return token;
}