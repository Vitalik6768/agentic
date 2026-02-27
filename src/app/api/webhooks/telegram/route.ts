import { sendWorkflowExecution } from "@/inngest/utills";
import { db } from "@/server/db";
import { type NextRequest, NextResponse } from "next/server";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    date?: number;
    text?: string;
    chat?: {
      id?: number;
      type?: string;
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    from?: {
      id?: number;
      is_bot?: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  edited_message?: {
    message_id?: number;
    date?: number;
    text?: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json(
        { success: false, message: "Workflow ID is required" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as TelegramUpdate;
    const message = body.message;

    if (!message) {
      return NextResponse.json(
        {
          success: true,
          message:
            "Telegram update received but skipped (only message updates trigger workflows).",
        },
        { status: 200 },
      );
    }

    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      select: { userId: true },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, message: "Workflow not found" },
        { status: 404 },
      );
    }

    const telegramData = {
      updateId: body.update_id ?? null,
      messageId: message.message_id ?? null,
      timestamp: message.date ?? null,
      text: message.text ?? "",
      chat: {
        id: message.chat?.id ?? null,
        type: message.chat?.type ?? null,
        title: message.chat?.title ?? null,
        username: message.chat?.username ?? null,
        firstName: message.chat?.first_name ?? null,
        lastName: message.chat?.last_name ?? null,
      },
      from: {
        id: message.from?.id ?? null,
        isBot: message.from?.is_bot ?? null,
        firstName: message.from?.first_name ?? null,
        lastName: message.from?.last_name ?? null,
        username: message.from?.username ?? null,
        languageCode: message.from?.language_code ?? null,
      },
      raw: body,
    };

    await sendWorkflowExecution({
      workflowId,
      userId: workflow.userId,
      initialData: {
        telegram: telegramData,
      },
    });

    return NextResponse.json(
      { success: true, message: "Telegram webhook processed successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to process Telegram webhook" },
      { status: 500 },
    );
  }
}