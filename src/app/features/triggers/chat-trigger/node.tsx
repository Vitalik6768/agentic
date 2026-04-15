import { memo, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { BaseTriggerNode } from "../base-trigger-node";
import { MANUAL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/manual-trigger";
import { fetchChatTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "../../executions/hooks/use-node-status";
import { CHAT_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/chat-trigger";
import { MessagesSquareIcon } from "lucide-react";


export const ChatTriggerNode = memo((props: NodeProps) => {
    const [open, setOpen] = useState(false);

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: CHAT_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchChatTriggerRealtimeToken,
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
        icon={MessagesSquareIcon}
        name="Chat Trigger"
        description="Trigger the workflow via chat"
        onDoubleClick={handleSettings}
        onSettings={handleSettings}
         />


        </>
    )
})

ChatTriggerNode.displayName = "ChatTriggerNode";