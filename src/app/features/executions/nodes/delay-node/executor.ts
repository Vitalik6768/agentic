import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";
import { delayNodeChannel } from "@/inngest/channels/delay-node";

registerHandlebarsHelpers();

type DelayNodeData = {
  varibleName?: string;
  delay: string | number;
};
export const delayNodeExecutor: NodeExecutor<DelayNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  const fallbackVariableName = `delayNode${Math.floor(Math.random() * 9) + 1}`;
  const variableName = data.varibleName?.trim() ?? fallbackVariableName;

  await publish(
    delayNodeChannel().status({
      nodeId,
      status: "loading",
    })
  );
 
  try {
    const resolvedDelayText = Handlebars.compile(String(data.delay ?? ""))(context).trim();
    const delayMs = Number(resolvedDelayText);

    if (!Number.isFinite(delayMs)) {
      throw new NonRetriableError("Delay must resolve to a valid number (milliseconds)");
    }
    if (delayMs < 1) {
      throw new NonRetriableError("Delay must be at least 1 millisecond");
    }
    if (delayMs > 10_000) {
      throw new NonRetriableError("Delay must be less than or equal to 10000 milliseconds");
    }

    await step.run(`delay-node-sleep-${nodeId}`, async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    });
    
    await publish(
      delayNodeChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(
          {
            variable: variableName,
            value: delayMs,
          },
          null,
          2
        ),
      })
    );
    await publish(
      delayNodeChannel().status({
        nodeId,
        status: "success",
      })
    );
    return {
      ...context,
      [variableName]: delayMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown SERP API node error";
    await publish(
      delayNodeChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(
      delayNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};