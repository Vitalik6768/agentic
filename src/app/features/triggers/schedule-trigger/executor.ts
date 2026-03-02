// import type { NodeExecutor } from "@/features/executions/types";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";
import type { NodeExecutor } from "../../executions/types";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";

type ScheduleTriggerData = Record<string, unknown>;

export const scheduleTriggerExecutor: NodeExecutor<ScheduleTriggerData> = async ({ nodeId, context, publish }) => {
    await publish(scheduleTriggerChannel().status({
        nodeId,
        status: "loading",
    }));
    await publish(scheduleTriggerChannel().status({
        nodeId,
        status: "success",
    }));
  
    return context;
}