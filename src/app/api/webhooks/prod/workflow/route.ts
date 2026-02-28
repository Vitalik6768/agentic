import { sendWorkflowExecution } from "@/inngest/utills";
import { db } from "@/server/db";
import { NodeType } from "generated/prisma";
import { type NextRequest, NextResponse } from "next/server";

type WebhookMethod = "GET" | "POST";

const extractConfiguredMethod = (data: unknown): WebhookMethod | null => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const method = (data as { method?: unknown }).method;
  if (method === "GET" || method === "POST") {
    return method;
  }

  return null;
};

const handleWebhook = async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json(
        { success: false, message: "Workflow ID is required" },
        { status: 400 },
      );
    }

    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      select: { userId: true, published: true },
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, message: "Workflow not found" },
        { status: 404 },
      );
    }
    if (workflow.published !== true) {
      return NextResponse.json(
        { success: false, message: "Workflow must be published before webhook execution" },
        { status: 403 },
      );
    }

    const webhookTriggerNode = await db.node.findFirst({
      where: {
        workflowId,
        type: NodeType.WEBHOOK_TRIGGER,
      },
      select: {
        data: true,
      },
    });

    const configuredMethod = extractConfiguredMethod(webhookTriggerNode?.data);
    if (configuredMethod && request.method !== configuredMethod) {
      return NextResponse.json(
        {
          success: false,
          message: `Method ${request.method} is not allowed for this webhook. Expected ${configuredMethod}.`,
        },
        { status: 405 },
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    let body: unknown = null;

    if (request.method !== "GET") {
      if (contentType.includes("application/json")) {
        try {
          body = await request.json();
        } catch {
          body = null;
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        body = Object.fromEntries(formData.entries());
      } else if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        body = Object.fromEntries(formData.entries());
      } else {
        const rawText = await request.text();
        body = rawText.length ? rawText : null;
      }
    }

    const headers = Object.fromEntries(request.headers.entries());
    const query = Object.fromEntries(url.searchParams.entries());

    await sendWorkflowExecution({
      workflowId,
      userId: workflow.userId,
      initialData: {
        meta: {
          disableRealtime: true,
          triggerSource: "prod-webhook",
        },
        webhook: {
          method: request.method,
          headers,
          query,
          body,
        },
      },
    });

    return NextResponse.json(
      { success: true, message: "Production webhook processed successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to process production webhook" },
      { status: 500 },
    );
  }
};

export async function GET(request: NextRequest) {
  return handleWebhook(request);
}

export async function POST(request: NextRequest) {
  return handleWebhook(request);
}
