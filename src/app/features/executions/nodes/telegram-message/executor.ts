import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import ky from "ky";
import { telegramMessageChannel } from "@/inngest/channels/telegram-message";
import { db } from "@/server/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type TelegramMessageData = {
  variableName?: string;
  varibleName?: string;
  message?: string;
  chatId?: string;
  credentialId?: string;
};

type TelegramSendMessageResponse = {
  ok: boolean;
  description?: string;
  result?: Record<string, unknown>;
};

export const telegramMessageExecutor: NodeExecutor<TelegramMessageData> = async ({
  data,
  userId,
  nodeId,
  context,
  step,
  publish,
}) => {
  const variableName = data.variableName ?? data.varibleName;

  await publish(
    telegramMessageChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.credentialId) {
    await publish(telegramMessageChannel().status({ nodeId, status: "error" }));
    await publish(
      telegramMessageChannel().result({
        nodeId,
        status: "error",
        error: "Telegram credential is required",
      })
    );
    throw new NonRetriableError("Telegram credential is required");
  }

  if (!data.message) {
    await publish(telegramMessageChannel().status({ nodeId, status: "error" }));
    await publish(
      telegramMessageChannel().result({
        nodeId,
        status: "error",
        error: "Message is required",
      })
    );
    throw new NonRetriableError("Message is required");
  }

  const credential = await step.run(`get-telegram-credential-${nodeId}`, async () => {
    return db.credential.findFirst({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    await publish(telegramMessageChannel().status({ nodeId, status: "error" }));
    await publish(
      telegramMessageChannel().result({
        nodeId,
        status: "error",
        error: "Telegram credential not found",
      })
    );
    throw new NonRetriableError("Telegram credential not found");
  }

  const renderedMessage = Handlebars.compile(data.message)(context).trim();
  const contextChatId = (context as { telegram?: { chat?: { id?: number | string } } }).telegram?.chat?.id;
  const renderedChatId = data.chatId ? Handlebars.compile(data.chatId)(context).trim() : "";
  const finalChatId = renderedChatId || (contextChatId != null ? String(contextChatId) : "");

  if (!finalChatId) {
    await publish(telegramMessageChannel().status({ nodeId, status: "error" }));
    await publish(
      telegramMessageChannel().result({
        nodeId,
        status: "error",
        error: "Chat ID is required. Configure chatId or run from Telegram Trigger context.",
      })
    );
    throw new NonRetriableError("Chat ID is required");
  }

  if (!renderedMessage) {
    await publish(telegramMessageChannel().status({ nodeId, status: "error" }));
    await publish(
      telegramMessageChannel().result({
        nodeId,
        status: "error",
        error: "Rendered message is empty",
      })
    );
    throw new NonRetriableError("Rendered message is empty");
  }

  try {
    const responseData = await step.run(`telegram-send-message-${nodeId}`, async () => {
      const response = await ky
        .post(`https://api.telegram.org/bot${decrypt(credential.value)}/sendMessage`, {
          json: {
            chat_id: finalChatId,
            text: renderedMessage,
          },
        })
        .json<TelegramSendMessageResponse>();

      if (!response.ok) {
        throw new NonRetriableError(response.description ?? "Telegram API error");
      }

      return response.result ?? {};
    });

    await publish(
      telegramMessageChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(
          {
            chatId: finalChatId,
            message: renderedMessage,
            response: responseData,
          },
          null,
          2
        ),
      })
    );
    await publish(telegramMessageChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName || "telegramMessage"]: responseData,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Telegram message error";
    await publish(
      telegramMessageChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(telegramMessageChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};