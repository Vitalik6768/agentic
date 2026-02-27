import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { setNodeChannel } from "@/inngest/channels/set-node";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
  // return JSON.stringify(context, null, 2);
});

type SetNodeData = {
  variableName?: string;
  // Keep backward compatibility for existing saved nodes.
  varibleName?: string;
  value?: string;
  valueType?: "string" | "number" | "boolean" | "json";
};

const parseBoolean = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  throw new NonRetriableError(`Invalid boolean value: "${value}"`);
};

const resolveValue = (data: SetNodeData, context: Record<string, unknown>): unknown => {
  const rendered = Handlebars.compile(data.value ?? "")(context);
  const valueType = data.valueType ?? "string";

  if (valueType === "string") return rendered;
  if (valueType === "number") {
    const parsed = Number(rendered);
    if (Number.isNaN(parsed)) {
      throw new NonRetriableError(`Invalid number value: "${rendered}"`);
    }
    return parsed;
  }
  if (valueType === "boolean") return parseBoolean(rendered);
  return JSON.parse(rendered);
};

export const setNodeExecutor: NodeExecutor<SetNodeData> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  const variableName = data.variableName ?? data.varibleName;

  await publish(
    setNodeChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!variableName) {
    await publish(
      setNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      setNodeChannel().result({
        nodeId,
        status: "error",
        error: "Variable name is required",
      })
    );
    throw new NonRetriableError("Variable name is required");
  }
  try {
    const resolvedValue = resolveValue(data, context);
    const result = { ...context, [variableName]: resolvedValue };
    await publish(
      setNodeChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(
          {
            variable: variableName,
            value: resolvedValue,
          },
          null,
          2
        ),
      })
    );
    await publish(
      setNodeChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Set node error";
    await publish(
      setNodeChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(
      setNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};