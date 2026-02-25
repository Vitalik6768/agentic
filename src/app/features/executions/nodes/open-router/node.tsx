"use client";

// import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
    // import { OpenAiDialog, OpenAiFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
    // import { fetchOpenAiRealtimeToken } from "./actions";
import { OPEN_ROUTER_CHANNEL_NAME } from "@/inngest/channels/open-router";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { OpenRouterDialog, type OpenRouterFormValues } from "./dialog";
import { fetchOpenRouterRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";


type OpenRouterNodeData = {
    systemPrompt?: string;
    credentialId: string;
    userPrompt: string;
}


type OpenRouterNodeType = Node<OpenRouterNodeData>;

export const OpenRouterNode = memo((props: NodeProps<OpenRouterNodeType>) => {
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: OPEN_ROUTER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchOpenRouterRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchOpenRouterRealtimeToken,
        enabled: true,
    });

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === OPEN_ROUTER_CHANNEL_NAME &&
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

    const handleOpenSettings = () => {
        setDialogOpen(true);
    }
    const handleSubmit = (values: {
        varibleName: string;
        systemPrompt?: string;
        userPrompt: string;

    }) => {
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
    const description = nodeData?.userPrompt
        ? `gpt-4.1-mini : ${nodeData.userPrompt.slice(0, 50)}...`
        : "NOT CONFIGURED";
        
    return (
        <>
            <OpenRouterDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<OpenRouterFormValues>}
                executionStatus={nodeStatus}
                executionOutput={latestExecutionResult?.output ?? ""}
                executionError={latestExecutionResult?.error}
            />
            <BaseExecutionNode
                status={nodeStatus}
                {...props}
                id={props.id}
                icon="/logos/openrouter.svg"
                name="OpenRouter"
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

OpenRouterNode.displayName = "OpenRouterNode";