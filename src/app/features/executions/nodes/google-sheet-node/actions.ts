"use server";

import { inngest } from "@/inngest/client";
import { googleSheetChannel } from "@/inngest/channels/google-sheet";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";

export type GoogleSheetToken = Realtime.Token<typeof googleSheetChannel, ["status", "result"]>;

export async function fetchGoogleSheetRealtimeToken(): Promise<GoogleSheetToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleSheetChannel(),
    topics: ["status", "result"],
  });
  return token;
}

