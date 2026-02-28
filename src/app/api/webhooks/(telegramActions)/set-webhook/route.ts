import { decrypt } from "@/lib/encryption";
import { db } from "@/server/db";
import { CredentialType, NodeType } from "generated/prisma";
import { type NextRequest, NextResponse } from "next/server";

type TelegramSetWebhookResponse = {
  ok: boolean;
  description?: string;
  result?: boolean;
  error_code?: number;
};

type BodyPayload = {
  workflowId?: string;
  webhookUrl?: string;
};

const getWorkflowId = (request: NextRequest, body: BodyPayload | null) => {
  const workflowIdFromQuery = new URL(request.url).searchParams.get("workflowId");
  return workflowIdFromQuery ?? body?.workflowId ?? "";
};

const getWebhookUrl = (
  request: NextRequest,
  workflowId: string,
  body: BodyPayload | null,
) => {
  const requestUrl = new URL(request.url);
  const webhookUrlFromQuery = requestUrl.searchParams.get("webhookUrl");

  if (webhookUrlFromQuery) {
    return webhookUrlFromQuery;
  }

  if (body?.webhookUrl) {
    return body.webhookUrl;
  }

  const webhookEndpoint = new URL("/api/webhooks/telegram", requestUrl.origin);
  webhookEndpoint.searchParams.set("workflowId", workflowId);
  return webhookEndpoint.toString();
};

const extractCredentialId = (nodeData: unknown): string | null => {
  if (!nodeData || typeof nodeData !== "object") {
    return null;
  }

  const value = (nodeData as { credentialId?: unknown }).credentialId;
  return typeof value === "string" && value.length > 0 ? value : null;
};

const handleSetWebhook = async (request: NextRequest) => {
  try {
    let body: BodyPayload | null = null;

    if (request.method === "POST") {
      try {
        body = (await request.json()) as BodyPayload;
      } catch {
        body = null;
      }
    }

    const workflowId = getWorkflowId(request, body);
    if (!workflowId) {
      return NextResponse.json(
        { success: false, message: "Workflow ID is required" },
        { status: 400 },
      );
    }

    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      select: { id: true, userId: true },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, message: "Workflow not found" },
        { status: 404 },
      );
    }

    const telegramTriggerNode = await db.node.findFirst({
      where: {
        workflowId,
        type: NodeType.TELEGRAM_TRIGGER,
      },
      select: {
        data: true,
      },
    });

    if (!telegramTriggerNode) {
      return NextResponse.json(
        { success: false, message: "Telegram trigger node not found in workflow" },
        { status: 400 },
      );
    }

    const credentialId = extractCredentialId(telegramTriggerNode.data);
    if (!credentialId) {
      return NextResponse.json(
        {
          success: false,
          message: "Telegram trigger is not configured with a credential",
        },
        { status: 400 },
      );
    }

    const credential = await db.credential.findFirst({
      where: {
        id: credentialId,
        userId: workflow.userId,
        type: CredentialType.TELEGRAM_BOT,
      },
      select: {
        value: true,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { success: false, message: "Telegram credential not found" },
        { status: 404 },
      );
    }

    const botToken = decrypt(credential.value);
    const webhookUrl = getWebhookUrl(request, workflowId, body);

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "edited_message"],
        }),
      },
    );

    const result = (await telegramResponse.json()) as TelegramSetWebhookResponse;

    if (!telegramResponse.ok || !result.ok) {
      return NextResponse.json(
        {
          success: false,
          message: result.description ?? "Telegram API failed to set webhook",
          telegram: result,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Telegram webhook set successfully",
        workflowId,
        webhookUrl,
        telegram: result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to set Telegram webhook" },
      { status: 500 },
    );
  }
};

export async function GET(request: NextRequest) {
  return handleSetWebhook(request);
}

export async function POST(request: NextRequest) {
  return handleSetWebhook(request);
}
