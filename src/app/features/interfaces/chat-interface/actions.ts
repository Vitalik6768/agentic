"use server";

import { chatInterfaceChannel } from "@/inngest/channels/chat-interface";
import { inngest } from "@/inngest/client";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

export type ChatInterfaceToken = Realtime.Token<typeof chatInterfaceChannel, ["result", "status"]>;

/**
 * Issues a short-lived realtime subscription token for the chat UI.
 *
 * The client listens for `chat-interface.result` events keyed by `chatRunId`.
 */
export async function fetchChatInterfaceRealtimeToken(): Promise<ChatInterfaceToken> {
  return getSubscriptionToken(inngest, {
    channel: chatInterfaceChannel(),
    topics: ["result", "status"],
  });
}

