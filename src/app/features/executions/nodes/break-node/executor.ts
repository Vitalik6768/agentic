import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import { breakNodeChannel } from "@/inngest/channels/break-node";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";

registerHandlebarsHelpers();

type BreakNodeData = {
  /** Canvas id of the Loop node this break belongs to. */
  loopNodeId?: string;
};

/** Passes context through each iteration; downstream edges activate only on the last iteration (see `executeActivatedNodes` in Inngest). */
export const breakNodeExecutor: NodeExecutor<BreakNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    breakNodeChannel().status({
      nodeId,
      status: "loading",
    })
  );

  const loopNodeId = data.loopNodeId?.trim();
  if (!loopNodeId) {
    await publish(
      breakNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError("Loop node is required");
  }

  try {
    const result = await step.run(`break-node-${nodeId}`, async () => {
      const loopBag =
        typeof context.loop === "object" && context.loop !== null
          ? (context.loop as Record<string, unknown>)
          : undefined;
      if (!loopBag?.[loopNodeId]) {
        throw new NonRetriableError(
          "Break node must run inside the selected loop’s iteration (missing loop context)",
        );
      }
      return context;
    });
    await publish(
      breakNodeChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    await publish(
      breakNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
