import axios, { type AxiosError } from "axios";
import { MisfirePolicy } from "generated/prisma";
import { db } from "@/server/db";
import { computeNextRunAt } from "@/lib/workflow-schedule";

const CRON_JOB_API_BASE_URL = "https://api.cron-job.org";

type CronFieldName = "minutes" | "hours" | "mdays" | "months" | "wdays";

const parseCronToken = (token: string, min: number, max: number): number[] => {
  const value = token.trim();
  if (value === "*" || value === "?") {
    return [-1];
  }

  const out = new Set<number>();
  const parts = value.split(",");

  for (const part of parts) {
    const piece = part.trim();
    if (!piece) continue;

    if (piece.includes("/")) {
      const [base, stepRaw] = piece.split("/");
      const step = Number(stepRaw);
      if (!Number.isInteger(step) || step <= 0) {
        throw new Error(`Invalid step value "${piece}"`);
      }

      const start = base === "*" ? min : Number(base);
      if (!Number.isInteger(start) || start < min || start > max) {
        throw new Error(`Invalid start value "${piece}"`);
      }

      for (let current = start; current <= max; current += step) {
        out.add(current);
      }
      continue;
    }

    if (piece.includes("-")) {
      const [fromRaw, toRaw] = piece.split("-");
      const from = Number(fromRaw);
      const to = Number(toRaw);
      if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
        throw new Error(`Invalid range "${piece}"`);
      }
      if (from < min || to > max) {
        throw new Error(`Out-of-range value "${piece}"`);
      }
      for (let current = from; current <= to; current += 1) {
        out.add(current);
      }
      continue;
    }

    const num = Number(piece);
    if (!Number.isInteger(num) || num < min || num > max) {
      throw new Error(`Invalid value "${piece}"`);
    }
    out.add(num);
  }

  if (out.size === 0) {
    return [-1];
  }

  return Array.from(out).sort((a, b) => a - b);
};

export const cronExpressionToCronJobSchedule = (cronExpression: string, timezone: string) => {
  const fields = cronExpression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error("Cron expression must have exactly 5 fields");
  }

  const [minute, hour, mday, month, wday] = fields as [
    string,
    string,
    string,
    string,
    string,
  ];
  const ranges: Record<CronFieldName, [number, number]> = {
    minutes: [0, 59],
    hours: [0, 23],
    mdays: [1, 31],
    months: [1, 12],
    wdays: [0, 6],
  };

  return {
    timezone,
    expiresAt: 0,
    minutes: parseCronToken(minute, ...ranges.minutes),
    hours: parseCronToken(hour, ...ranges.hours),
    mdays: parseCronToken(mday, ...ranges.mdays),
    months: parseCronToken(month, ...ranges.months),
    wdays: parseCronToken(wday, ...ranges.wdays),
  };
};

export type UpsertScheduleCronInput = {
  workflowId: string;
  cronExpression: string;
  timezone?: string;
  enabled?: boolean;
  misfirePolicy?: MisfirePolicy;
  maxDelaySec?: number | null;
  apiKey?: string;
};

export type SetWorkflowCronEnabledInput = {
  workflowId: string;
  enabled: boolean;
  apiKey?: string;
};

const isCronJobNotFoundError = (error: unknown): boolean => {
  const axiosError = error as AxiosError<{ message?: string }>;
  const status = axiosError.response?.status;
  return status === 404;
};

const syncRemoteCronJob = async (workflowId: string, cronJobId: string) => {
  await db.remoteCronJob.deleteMany({
    where: { workflowId },
  });
  await db.remoteCronJob.create({
    data: {
      workflowId,
      cronJobId,
    },
  });
};

export const deleteRemoteCronJobForWorkflow = async ({
  workflowId,
  apiKey,
}: {
  workflowId: string;
  apiKey?: string;
}) => {
  const [remoteCron, existingSchedule] = await Promise.all([
    db.remoteCronJob.findFirst({
      where: { workflowId },
      select: { cronJobId: true },
      orderBy: { createdAt: "desc" },
    }),
    db.workflowSchedule.findUnique({
      where: { workflowId },
      select: { cronJobId: true },
    }),
  ]);
  const cronJobId = remoteCron?.cronJobId ?? existingSchedule?.cronJobId ?? null;
  if (!cronJobId) {
    await db.remoteCronJob.deleteMany({
      where: { workflowId },
    });
    return { deleted: false, reason: "missing-cron-job-id" as const };
  }

  const resolvedApiKey = apiKey ?? process.env.CRONE_SECRET ?? process.env.CRON_SECRET;
  if (!resolvedApiKey) {
    return { deleted: false, reason: "missing-api-key" as const };
  }

  try {
    await axios.delete(`${CRON_JOB_API_BASE_URL}/jobs/${cronJobId}`, {
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    });
  } catch (error) {
    if (!isCronJobNotFoundError(error)) {
      throw error;
    }
  }

  await db.remoteCronJob.deleteMany({
    where: { workflowId },
  });
  return { deleted: true, reason: "deleted" as const };
};

export const upsertScheduleCronJob = async ({
  workflowId,
  cronExpression,
  timezone = "UTC",
  enabled = true,
  misfirePolicy = MisfirePolicy.SKIP_MISSED,
  maxDelaySec = null,
  apiKey,
}: UpsertScheduleCronInput) => {
  const resolvedApiKey = apiKey ?? process.env.CRONE_SECRET ?? process.env.CRON_SECRET;
  if (!resolvedApiKey) {
    throw new Error("Missing CRONE_SECRET/CRON_SECRET for cron-job.org API");
  }
  if (!process.env.CRONE_EXECUTION_URL) {
    throw new Error("Missing CRONE_EXECUTION_URL");
  }

  const executionUrl = new URL(process.env.CRONE_EXECUTION_URL);
  executionUrl.searchParams.set("workflowId", workflowId);

  const schedule = cronExpressionToCronJobSchedule(cronExpression, timezone);
  const existingSchedule = await db.workflowSchedule.findUnique({
    where: { workflowId },
    select: { cronJobId: true },
  });

  const jobPayload = {
    job: {
      url: executionUrl.toString(),
      enabled,
      schedule,
    },
  };

  let cronJobId = existingSchedule?.cronJobId ?? null;

  if (cronJobId) {
    await axios.patch(`${CRON_JOB_API_BASE_URL}/jobs/${cronJobId}`, jobPayload, {
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    });
  } else {
    const response = await axios.put(`${CRON_JOB_API_BASE_URL}/jobs`, jobPayload, {
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    });
    const rawJobId = (response.data as { jobId?: unknown })?.jobId;
    if (typeof rawJobId !== "number" && typeof rawJobId !== "string") {
      throw new Error("cron-job.org did not return jobId");
    }
    cronJobId = String(rawJobId);
  }

  const nextRunAt = computeNextRunAt(cronExpression, timezone);
  const saved = await db.workflowSchedule.upsert({
    where: { workflowId },
    create: {
      workflowId,
      cronExpression,
      timezone,
      enabled,
      cronJobId,
      nextRunAt,
      misfirePolicy,
      maxDelaySec,
    },
    update: {
      cronExpression,
      timezone,
      enabled,
      cronJobId,
      nextRunAt,
      misfirePolicy,
      maxDelaySec,
    },
  });
  if (cronJobId) {
    await syncRemoteCronJob(workflowId, cronJobId);
  }

  return {
    cronJobId,
    workflowSchedule: saved,
  };
};

export const setWorkflowCronEnabled = async ({
  workflowId,
  enabled,
  apiKey,
}: SetWorkflowCronEnabledInput) => {
  const resolvedApiKey = apiKey ?? process.env.CRONE_SECRET ?? process.env.CRON_SECRET;
  if (!resolvedApiKey) {
    throw new Error("Missing CRONE_SECRET/CRON_SECRET for cron-job.org API");
  }

  const existingSchedule = await db.workflowSchedule.findUnique({
    where: { workflowId },
    select: { cronJobId: true },
  });
  if (!existingSchedule?.cronJobId) {
    throw new Error("No cron job found for this workflow");
  }

  await axios.patch(
    `${CRON_JOB_API_BASE_URL}/jobs/${existingSchedule.cronJobId}`,
    { job: { enabled } },
    {
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    },
  );

  const saved = await db.workflowSchedule.update({
    where: { workflowId },
    data: { enabled },
  });
  await syncRemoteCronJob(workflowId, existingSchedule.cronJobId);

  return {
    cronJobId: existingSchedule.cronJobId,
    workflowSchedule: saved,
  };
};
