// import type { NodeExecutor } from "@/features/executions/types";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";
import type { NodeExecutor } from "../../executions/types";

type ManualTriggerData = Record<string, unknown>;

export const manualTriggerExecutor: NodeExecutor<ManualTriggerData> = async ({ nodeId, context, step, publish }) => {
    await publish(manualTriggerChannel().status({
        nodeId,
        status: "loading",
    }));
const result = await step.run(`execute manual trigger ${nodeId}`, async () => context)
await publish(manualTriggerChannel().status({
    nodeId,
    status: "success",
}));
  
return context;
}