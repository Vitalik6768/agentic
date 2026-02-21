// import { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
// import { BaseTriggerNode } from "../base-trigger-node";
import { MousePointer2Icon } from "lucide-react";
// import { ManualTriggerDialog } from "./dialog";
// import { NodeStatus } from "@/components/react-flow/node-status-indicator";
// import { MANUAL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/manual-trigger";
// import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
// import { fetchManualTriggerRealtimeToken } from "./actions";
import type { NodeProps } from "@xyflow/react";
import { BaseTriggerNode } from "../base-trigger-node";
import { MANUAL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/manual-trigger";
import { fetchManualTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "../../executions/hooks/use-node-status";


export const ManualTriggerNode = memo((props: NodeProps) => {
    const [open, setOpen] = useState(false);

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: MANUAL_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchManualTriggerRealtimeToken,
    });
    const handleSettings = () => {
        setOpen(true);
    }
    return (
        <>
        {/* <ManualTriggerDialog open={open} onOpenChange={setOpen} /> */}
        <BaseTriggerNode 
        status={nodeStatus}
        {...props}
        children={<></>}
        icon={MousePointer2Icon}
        name="Manual Trigger"
        description="Trigger the workflow manually"
        onDoubleClick={handleSettings}
        onSettings={handleSettings}
         />


        </>
    )
})

ManualTriggerNode.displayName = "ManualTriggerNode";