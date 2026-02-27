"use client";

import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { TelegramMessageDialog, type TelegramMessageDialogValues } from "./dialog";
import { fetchTelegramMessageRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { TELEGRAM_MESSAGE_CHANNEL_NAME } from "@/inngest/channels/telegram-message";

type TelegramMessageNodeData = {
    variableName?: string;
    message?: string;
    chatId?: string;
    credentialId?: string;
}

type TelegramMessageNodeType = Node<TelegramMessageNodeData>;

export const TelegramMessageNode = memo((props: NodeProps<TelegramMessageNodeType>) => {
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: TELEGRAM_MESSAGE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchTelegramMessageRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchTelegramMessageRealtimeToken,
        enabled: true,
    });

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === TELEGRAM_MESSAGE_CHANNEL_NAME &&
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
    const defaultValues: Partial<TelegramMessageDialogValues> = {
        variableName: props.data?.variableName,
        message: props.data?.message,
        chatId: props.data?.chatId,
        credentialId: props.data?.credentialId,
    };

    const handleOpenSettings = () => {
        setDialogOpen(true);
    }
    const handleSubmit = (values: TelegramMessageDialogValues) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...values,
                    }
                };
            }
            return node;
        }));
    }
    const nodeData = props.data;
    const description = nodeData?.message
        ? nodeData.message.slice(0, 50)
        : "NOT CONFIGURED";
        
    return (
        <>
            <TelegramMessageDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={defaultValues}
                executionStatus={nodeStatus}
                executionOutput={latestExecutionResult?.output ?? ""}
                executionError={latestExecutionResult?.error}
            />
            <BaseExecutionNode
                status={nodeStatus}
                {...props}
                id={props.id}
                icon="/logos/telegram-message.svg"
                name="Telegram Message"
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

TelegramMessageNode.displayName = "TelegramMessageNode";