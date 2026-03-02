import { CronExpressionParser } from "cron-parser";
import { MisfirePolicy } from "generated/prisma";

export type ParsedScheduleConfig = {
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  misfirePolicy: MisfirePolicy;
  maxDelaySec: number | null;
};

export const parseScheduleConfig = (data: unknown): ParsedScheduleConfig | null => {
  const input = (data ?? {}) as Record<string, unknown>;

  const cronExpression = typeof input.cronExpression === "string" ? input.cronExpression.trim() : "";
  if (!cronExpression) {
    return null;
  }

  const timezone = typeof input.timezone === "string" && input.timezone.trim() ? input.timezone.trim() : "UTC";
  const enabled = typeof input.enabled === "boolean" ? input.enabled : true;

  const misfirePolicy =
    input.misfirePolicy === MisfirePolicy.RUN_ONCE_IF_MISSED ||
    input.misfirePolicy === MisfirePolicy.CATCH_UP ||
    input.misfirePolicy === MisfirePolicy.SKIP_MISSED
      ? input.misfirePolicy
      : MisfirePolicy.SKIP_MISSED;

  const maxDelaySec =
    typeof input.maxDelaySec === "number" && Number.isFinite(input.maxDelaySec) && input.maxDelaySec >= 0
      ? Math.floor(input.maxDelaySec)
      : null;

  return {
    cronExpression,
    timezone,
    enabled,
    misfirePolicy,
    maxDelaySec,
  };
};

export const computeNextRunAt = (cronExpression: string, timezone: string, currentDate = new Date()) => {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      currentDate,
      tz: timezone,
    });
    const next = interval.next();
    return new Date(next.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron parsing error";
    throw new Error(`Invalid schedule configuration: ${message}`);
  }
};

