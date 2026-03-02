import axios from "axios";
import { sendWorkflowExecution } from "@/inngest/utills";
import { db } from "@/server/db";
import { NodeType } from "generated/prisma";
import { type NextRequest, NextResponse } from "next/server";

const CRON_JOB_API_BASE_URL = "https://api.cron-job.org";

const getCronApiKey = () => process.env.CRONE_SECRET ?? process.env.CRON_SECRET ?? null;

const resolveCronJobId = (
  request: NextRequest,
  scheduleCronJobId: string | null | undefined,
) => {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("cronJobId");
  const fromHeader = request.headers.get("x-cron-job-id");
  return scheduleCronJobId ?? fromQuery ?? fromHeader ?? null;
};

const cleanupCronArtifacts = async (request: NextRequest, workflowId: string) => {
  const schedule = await db.workflowSchedule.findUnique({
    where: { workflowId },
    select: { cronJobId: true },
  });
  const cronJobId = resolveCronJobId(request, schedule?.cronJobId);
  const cronApiKey = getCronApiKey();

  if (cronJobId && cronApiKey) {
    try {
      await axios.delete(`${CRON_JOB_API_BASE_URL}/jobs/${cronJobId}`, {
        headers: {
          Authorization: `Bearer ${cronApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      });
    } catch (error) {
      console.error("Failed deleting cron-job.org job", error);
    }
  }

  await db.workflowSchedule.deleteMany({
    where: { workflowId },
  });
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json(
        { success: false, message: "workflowId is required" },
        { status: 400 },
      );
    }

    const [workflow, scheduleTriggerNode] = await Promise.all([
      db.workflow.findUnique({
        where: { id: workflowId },
        select: { id: true, userId: true, published: true },
      }),
      db.node.findFirst({
        where: { workflowId, type: NodeType.SCHEDULE_TRIGGER },
        select: { id: true },
      }),
    ]);

    if (!workflow) {
      await cleanupCronArtifacts(request, workflowId);
      return NextResponse.json(
        { success: false, message: "Workflow not found. Cron job cleaned up." },
        { status: 404 },
      );
    }

    if (!scheduleTriggerNode) {
      await cleanupCronArtifacts(request, workflowId);
      return NextResponse.json(
        {
          success: false,
          message: "Workflow has no schedule trigger. Cron job and DB schedule removed.",
        },
        { status: 400 },
      );
    }

    if (workflow.published !== true) {
      return NextResponse.json(
        { success: false, message: "Workflow is not published" },
        { status: 403 },
      );
    }

    await sendWorkflowExecution({
      workflowId,
      userId: workflow.userId,
      initialData: {
        meta: {
          disableRealtime: true,
          triggerSource: "schedule",
        },
      },
    });

    return NextResponse.json(
      { success: true, message: "Scheduled workflow executed" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to process cron webhook" },
      { status: 500 },
    );
  }
}
