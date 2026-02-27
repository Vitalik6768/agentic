import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchTelegramTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "../../executions/hooks/use-node-status";
import { TELEGRAM_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/telegram-trigger";
import { TelegramTriggerDialog, type TelegramTriggerFormValues } from "./dialog";

type TelegramTriggerNodeData = {
    credentialId?: string;
}

type TelegramTriggerNodeType = Node<TelegramTriggerNodeData>;

export const TelegramTriggerNode = memo((props: NodeProps<TelegramTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: TELEGRAM_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchTelegramTriggerRealtimeToken,
    });

    const handleSettings = () => {
        setDialogOpen(true);
    }

    const handleSubmit = (values: TelegramTriggerFormValues) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...values,
                    },
                };
            }
            return node;
        }));
    };

    const nodeData = props.data;
    const description = nodeData?.credentialId ? "Configured" : "NOT CONFIGURED";

    return (
        <>
            <TelegramTriggerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<TelegramTriggerFormValues>}
            />
            <BaseTriggerNode
                status={nodeStatus}
                {...props}
                children={<></>}
                icon="/logos/telegram.svg"
                name="Telegram Trigger"
                description={description}
                onDoubleClick={handleSettings}
                onSettings={handleSettings}
            />
        </>
    )
})

TelegramTriggerNode.displayName = "TelegramTriggerNode";