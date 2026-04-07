import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { conditionNodeChannel } from "@/inngest/channels/condition-node";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";

registerHandlebarsHelpers();

type ConditionNodeData = {
  variableName?: string;
  varibleName?: string;
  conditions?: Array<{
    left?: string;
    operator?: "eq" | "ne" | "gt" | "gte" | "lt" | "lte";
    right?: string;
  }>;
  expression?: string;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return Boolean(value);

  const normalized = value.trim().toLowerCase();
  if (normalized === "" || normalized === "false" || normalized === "0" || normalized === "null" || normalized === "undefined") {
    return false;
  }

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  return Boolean(normalized);
};

export const conditionNodeExecutor: NodeExecutor<ConditionNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  const variableName = data.variableName ?? data.varibleName;

  await publish(
    conditionNodeChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.expression?.trim()) {
    await publish(
      conditionNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("Condition expression is required");
  }
  if (!variableName) {
    await publish(
      conditionNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      conditionNodeChannel().result({
        nodeId,
        status: "error",
        error: "Variable name is required",
      })
    );
    throw new NonRetriableError("Variable name is required");
  }

  try {
    const result = await step.run(`condition-node-${nodeId}`, async () => {
      const resolvedExpression = Handlebars.compile(data.expression ?? "")(context);
      const conditionResult = toBoolean(resolvedExpression);

      return {
        ...context,
        [variableName]: conditionResult,
        condition: {
          ...(typeof context.condition === "object" && context.condition !== null ? (context.condition as Record<string, unknown>) : {}),
          [nodeId]: {
            expression: resolvedExpression,
            result: conditionResult,
            route: conditionResult ? "source-1" : "source-false",
          },
        },
      };
    });

    const output = {
      variable: variableName,
      result: result[variableName],
      route: result.condition && typeof result.condition === "object"
        ? (result.condition as Record<string, unknown>)[nodeId] &&
          typeof (result.condition as Record<string, unknown>)[nodeId] === "object"
          ? ((result.condition as Record<string, unknown>)[nodeId] as Record<string, unknown>).route
          : undefined
        : undefined,
    };
    await publish(
      conditionNodeChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(output, null, 2),
      })
    );

    await publish(
      conditionNodeChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown condition node error";
    await publish(
      conditionNodeChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(
      conditionNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};