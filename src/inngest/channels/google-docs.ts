import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DOCS_CHANNEL_NAME = "google-docs-execution";

export const googleDocsChannel = channel(GOOGLE_DOCS_CHANNEL_NAME)
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
