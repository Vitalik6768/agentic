"use server";

import { inngest } from "@/inngest/client";
import { googleDocsFileChannel } from "@/inngest/channels/google-docs-file";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

export type GoogleDocsFileToken = Realtime.Token<typeof googleDocsFileChannel, ["status", "result"]>;

export async function fetchGoogleDocsFileRealtimeToken(): Promise<GoogleDocsFileToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleDocsFileChannel(),
    topics: ["status", "result"],
  });
  return token;
}
