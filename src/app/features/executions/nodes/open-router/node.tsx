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
    const { setNodes, getNodes } = useReactFlow();

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