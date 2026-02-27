import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseTriggerNode } from "../base-trigger-node";
import { WEBHOOK_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/webhook_trigger";
import { fetchWebhookTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "../../executions/hooks/use-node-status";
import { WebhookTriggerDialog, type WebhookTriggerFormValues } from "./dialog";
import { useInngestSubscription } from "@inngest/realtime/hooks";

type WebhookTriggerNodeData = {
    method?: "GET" | "POST";
}

type WebhookTriggerNodeType = Node<WebhookTriggerNodeData>;

export const WebhookTriggerNode = memo((props: NodeProps<WebhookTriggerNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: WEBHOOK_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchWebhookTriggerRealtimeToken,
    });
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchWebhookTriggerRealtimeToken,
        enabled: true,
    });

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === WEBHOOK_TRIGGER_CHANNEL_NAME &&
                message.topic === "result" &&
                (message.data as { nodeId: string }).nodeId === props.id
        )
        .sort((a, b) => {
            if (a.kind === "data" && b.kind === "data") {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return 0;
        })[0];

    const latestExecutionResult = latestResultMessage?.kind === "data"
        ? (latestResultMessage.data as {
            status: "success" | "error";
            output?: string;
            error?: string;
        })
        : null;
    const handleSettings = () => {
        setOpen(true);
    }

    const handleSubmit = (values: WebhookTriggerFormValues) => {
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
    const method = nodeData?.method ?? "POST";
    const description = `Accepts ${method} requests`;

    return (
        <>
        <WebhookTriggerDialog
            open={open}
            onOpenChange={setOpen}
            onSubmit={handleSubmit}
            defaultValues={nodeData as Partial<WebhookTriggerFormValues>}
            executionStatus={nodeStatus}
            executionOutput={latestExecutionResult?.output ?? ""}
            executionError={latestExecutionResult?.error}
        />
        <BaseTriggerNode 
        status={nodeStatus}
        {...props}
        children={<></>}
        icon="/logos/webhook.svg"
        name="Webhook Trigger"
        description={description}
        onDoubleClick={handleSettings}
        onSettings={handleSettings}
         />
        </>
    )
})

WebhookTriggerNode.displayName = "WebhookTriggerNode";