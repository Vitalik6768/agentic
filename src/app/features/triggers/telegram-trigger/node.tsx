// import { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
// import { BaseTriggerNode } from "../base-trigger-node";
// import { ManualTriggerDialog } from "./dialog";
// import { NodeStatus } from "@/components/react-flow/node-status-indicator";
// import { MANUAL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/manual-trigger";
// import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
// import { fetchManualTriggerRealtimeToken } from "./actions";
import type { NodeProps } from "@xyflow/react";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchTelegramTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "../../executions/hooks/use-node-status";
import { TELEGRAM_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/telegram-trigger";


export const TelegramTriggerNode = memo((props: NodeProps) => {
    const [open, setOpen] = useState(false);

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: TELEGRAM_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchTelegramTriggerRealtimeToken,
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
        icon="/logos/telegram.svg"
        name="Telegram Trigger"
        description="Trigger the workflow via Telegram"
        onDoubleClick={handleSettings}
        onSettings={handleSettings}
         />


        </>
    )
})

TelegramTriggerNode.displayName = "TelegramTriggerNode";