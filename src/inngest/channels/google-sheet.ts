import { channel, topic } from "@inngest/realtime";

export const GOOGLE_SHEET_CHANNEL_NAME = "google-sheet-execution";

export const googleSheetChannel = channel(GOOGLE_SHEET_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  )
  .addTopic(
    topic("result").type<{
      nodeId: string;
      status: "success" | "error";
      output?: string;
      error?: string;
    }>(),
  );

