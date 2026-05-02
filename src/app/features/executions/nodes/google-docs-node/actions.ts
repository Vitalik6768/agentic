"use server";

import { inngest } from "@/inngest/client";
import { googleDocsChannel } from "@/inngest/channels/google-docs";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

export type GoogleDocsToken = Realtime.Token<typeof googleDocsChannel, ["status", "result"]>;

export async function fetchGoogleDocsRealtimeToken(): Promise<GoogleDocsToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleDocsChannel(),
    topics: ["status", "result"],
  });
  return token;
}
