import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { loopNodeChannel } from "@/inngest/channels/loop-node";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";

registerHandlebarsHelpers();

type LoopData = {
  variableName?: string;
  // Keep backward compatibility for previously-saved misspelled field.
  varibleName?: string;
  arrayInput?: string;
};

const resolveArrayInput = (arrayInput: string, context: Record<string, unknown>): unknown[] => {
  const rendered = Handlebars.compile(arrayInput)(context).trim();
  if (!rendered) {
    throw new NonRetriableError("Array input is required");
  }

  try {
    const parsed: unknown = JSON.parse(rendered);
    if (!Array.isArray(parsed)) {
      throw new NonRetriableError("Array input must resolve to a JSON array");
    }
    return parsed;
  } catch {
    throw new NonRetriableError("Array input must be valid JSON array text");
  }
};

export const loopExecutor: NodeExecutor<LoopData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    loopNodeChannel().status({
      nodeId,
      status: "loading",
    })
  );

  const variableName = data.variableName ?? data.varibleName;
  if (!variableName) {
    await publish(
      loopNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      loopNodeChannel().result({
        nodeId,
        status: "error",
        error: "Variable name is required",
      })
    );
    throw new NonRetriableError("Variable name is required");
  }
  if (!data.arrayInput?.trim()) {
    await publish(
      loopNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      loopNodeChannel().result({
        nodeId,
        status: "error",
        error: "Array input is required",
      })
    );
    throw new NonRetriableError("Array input is required");
  }

  try {
    const result = await step.run(`loop-${nodeId}`, async () => {
      const items = resolveArrayInput(data.arrayInput ?? "", context);
      const output = {
        variable: variableName,
        count: items.length,
        items,
      };
      await publish(
        loopNodeChannel().result({
          nodeId,
          status: "success",
          output: JSON.stringify(output, null, 2),
        })
      );

      return {
        ...context,
        [variableName]: {
          items,
          count: items.length,
        },
      };
    });
    await publish(
      loopNodeChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown loop node error";
    await publish(
      loopNodeChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(
      loopNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};