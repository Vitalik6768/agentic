import { channel, topic } from "@inngest/realtime";

export const CHAT_INTERFACE_CHANNEL_NAME = "chat-interface";

/**
 * Chat Interface realtime channel.
 *
 * We key messages by `chatRunId` so the UI can correlate one user-send → one workflow run,
 * without polling the database or relying on "latest execution" heuristics.
 */
export const chatInterfaceChannel = channel(CHAT_INTERFACE_CHANNEL_NAME)
  .addTopic(
    topic("result").type<{
      chatRunId: string;
      status: "success" | "error";
      output?: unknown;
      error?: string;
    }>(),
  )
  .addTopic(
    topic("status").type<{
      chatRunId: string;
      status: "loading" | "success" | "error";
    }>(),
  );

