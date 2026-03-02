import axios, { type AxiosError } from "axios";
import { type NextRequest, NextResponse } from "next/server";
import { setWorkflowCronEnabled, upsertScheduleCronJob } from "@/lib/cron-job";
import { parseScheduleConfig } from "@/lib/workflow-schedule";

const CRON_JOB_API_BASE_URL = "https://api.cron-job.org";

type CronApiError = {
  message?: string;
  [key: string]: unknown;
};

const getApiKey = (request: NextRequest) => {
  const headerKey = request.headers.get("x-cron-job-api-key");
  return headerKey ?? process.env.CRONE_SECRET ?? process.env.CRON_SECRET ?? null;
};

const getJobId = (request: NextRequest, body: unknown): string | null => {
  const fromQuery = new URL(request.url).searchParams.get("jobId");
  if (fromQuery) return fromQuery;

  if (body && typeof body === "object") {
    const fromBody = (body as { jobId?: unknown }).jobId;
    if (typeof fromBody === "string" && fromBody.trim().length > 0) {
      return fromBody.trim();
    }
    if (typeof fromBody === "number" && Number.isFinite(fromBody)) {
      return String(fromBody);
    }
  }

  return null;
};

const toErrorResponse = (error: unknown, fallbackMessage: string) => {
  const axiosError = error as AxiosError<CronApiError>;
  const status = axiosError.response?.status ?? 500;
  const payload = axiosError.response?.data;

  return NextResponse.json(
    {
      success: false,
      message:
        (payload && typeof payload.message === "string" && payload.message) ??
        axiosError.message ??
        fallbackMessage,
      error: payload ?? null,
    },
    { status },
  );
};

const ensureApiKey = (request: NextRequest) => {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Missing cron-job.org API key. Set CRONE_SECRET (or CRON_SECRET) or pass x-cron-job-api-key header.",
      },
      { status: 500 },
    );
  }

  return apiKey;
};

export async function GET(request: NextRequest) {
  const apiKey = ensureApiKey(request);
  if (apiKey instanceof NextResponse) return apiKey;

  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");

    if (jobId) {
      const response = await axios.request({
        method: "GET",
        url: `${CRON_JOB_API_BASE_URL}/jobs/${jobId}`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      });
      return NextResponse.json({ success: true, ...response.data }, { status: 200 });
    }

    const response = await axios.request({
      method: "GET",
      url: `${CRON_JOB_API_BASE_URL}/jobs`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    });
    return NextResponse.json({ success: true, ...response.data }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error, "Failed to fetch cron jobs");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      workflowId?: unknown;
      cronExpression?: unknown;
      timezone?: unknown;
      enabled?: unknown;
      misfirePolicy?: unknown;
      maxDelaySec?: unknown;
    };

    const workflowId =
      typeof body.workflowId === "string" && body.workflowId.trim().length > 0
        ? body.workflowId.trim()
        : null;
    if (!workflowId) {
      return NextResponse.json(
        { success: false, message: "workflowId is required" },
        { status: 400 },
      );
    }

    const parsed = parseScheduleConfig({
      cronExpression: body.cronExpression,
      timezone: body.timezone,
      enabled: body.enabled,
      misfirePolicy: body.misfirePolicy,
      maxDelaySec: body.maxDelaySec,
    });
    if (!parsed) {
      return NextResponse.json(
        { success: false, message: "Invalid schedule config. cronExpression is required." },
        { status: 400 },
      );
    }

    const apiKeyFromHeader = getApiKey(request) ?? undefined;
    const result = await upsertScheduleCronJob({
      workflowId,
      cronExpression: parsed.cronExpression,
      timezone: parsed.timezone,
      enabled: parsed.enabled,
      misfirePolicy: parsed.misfirePolicy,
      maxDelaySec: parsed.maxDelaySec,
      apiKey: apiKeyFromHeader,
    });

    return NextResponse.json(
      {
        success: true,
        workflowId,
        cronJobId: result.cronJobId,
        workflowSchedule: result.workflowSchedule,
      },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error, "Failed to upsert schedule cron job");
  }
}

  


export async function PATCH(request: NextRequest) {
  const apiKey = ensureApiKey(request);
  if (apiKey instanceof NextResponse) return apiKey;

  try {
    const body = (await request.json()) as {
      workflowId?: unknown;
      enabled?: unknown;
      jobId?: string | number;
      job?: Record<string, unknown>;
    };

    const workflowId =
      typeof body.workflowId === "string" && body.workflowId.trim().length > 0
        ? body.workflowId.trim()
        : null;
    if (workflowId && typeof body.enabled === "boolean") {
      const result = await setWorkflowCronEnabled({
        workflowId,
        enabled: body.enabled,
        apiKey,
      });

      return NextResponse.json(
        {
          success: true,
          workflowId,
          cronJobId: result.cronJobId,
          workflowSchedule: result.workflowSchedule,
        },
        { status: 200 },
      );
    }

    const jobId = getJobId(request, body);

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: "jobId or workflowId+enabled is required" },
        { status: 400 },
      );
    }
    if (!body?.job || typeof body.job !== "object") {
      return NextResponse.json(
        { success: false, message: "Body must be { job: { ... } }" },
        { status: 400 },
      );
    }

    const response = await axios.request({
      method: "PATCH",
      url: `${CRON_JOB_API_BASE_URL}/jobs/${jobId}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: { job: body.job },
      timeout: 15_000,
    });
    return NextResponse.json({ success: true, ...response.data }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error, "Failed to update cron job");
  }
}

export async function DELETE(request: NextRequest) {
  const apiKey = ensureApiKey(request);
  if (apiKey instanceof NextResponse) return apiKey;

  try {
    const body = request.body ? ((await request.json()) as { jobId?: string | number }) : null;
    const jobId = getJobId(request, body);

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: "jobId is required (query or body)" },
        { status: 400 },
      );
    }

    const response = await axios.request({
      method: "DELETE",
      url: `${CRON_JOB_API_BASE_URL}/jobs/${jobId}`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    });
    return NextResponse.json({ success: true, ...response.data }, { status: 200 });
  } catch (error) {
    return toErrorResponse(error, "Failed to delete cron job");
  }
}
