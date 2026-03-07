"use client";

import { memo, useEffect, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { AGENT_NODE_CHANNEL_NAME } from "@/inngest/channels/agent-node";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { AgentNodeDialog, type AgentNodeFormValues, type AgentNodeVariableNodeOption } from "./dialog";
import { fetchAgentNodeRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { DEFAULT_OPEN_ROUTER_MODEL } from "@/config/constans";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
    getAvailableVariables,
    getUpstreamVariableNodeOptions,
    type AvailableVariable,
} from "@/lib/variable-picker";


type AgentNodeData = {
    systemPrompt?: string;
    credentialId: string;
    userPrompt: string;
    model?: string;
}


type AgentNodeType = Node<AgentNodeData>;

export const AgentNode = memo((props: NodeProps<AgentNodeType>) => {
    const trpc = useTRPC();
    const params = useParams<{ workflowsId?: string }>();
    const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: AGENT_NODE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchAgentNodeRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
    const [nodeOptions, setNodeOptions] = useState<AgentNodeVariableNodeOption[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string>("");
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const latestWorkflowOutputQuery = useQuery({
        ...(workflowId
            ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
            : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
        enabled: Boolean(workflowId) && dialogOpen,
    });
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchAgentNodeRealtimeToken,
        enabled: true,
    });

    useEffect(() => {
        if (!dialogOpen) return;
        const vars = getAvailableVariables(
            props.id,
            getNodes(),
            getEdges(),
            latestWorkflowOutputQuery.data?.output,
            selectedNodeId || undefined,
        );
        setAvailableVariables(vars);
    }, [dialogOpen, props.id, getNodes, getEdges, latestWorkflowOutputQuery.data?.output, selectedNodeId]);

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === AGENT_NODE_CHANNEL_NAME &&
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
        const upstreamOptions = getUpstreamVariableNodeOptions(
            props.id,
            getNodes(),
            getEdges(),
        );
        setNodeOptions(upstreamOptions);
        const defaultNodeId = upstreamOptions[upstreamOptions.length - 1]?.nodeId ?? "";
        setSelectedNodeId(defaultNodeId);
        const vars = getAvailableVariables(
            props.id,
            getNodes(),
            getEdges(),
            latestWorkflowOutputQuery.data?.output,
            defaultNodeId || undefined,
        );
        setAvailableVariables(vars);
        setDialogOpen(true);
    }
    const handleSubmit = (values: {
        varibleName: string;
        credentialId: string;
        systemPrompt?: string;
        userPrompt: string;
        model: string;
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
    const selectedModel = nodeData?.model ?? DEFAULT_OPEN_ROUTER_MODEL;
    const description = nodeData?.userPrompt
        ? `${selectedModel} : ${nodeData.userPrompt.slice(0, 50)}...`
        : "NOT CONFIGURED";
        
    return (
        <>
            <AgentNodeDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<AgentNodeFormValues>}
                executionStatus={nodeStatus}
                executionOutput={latestExecutionResult?.output ?? ""}
                executionError={latestExecutionResult?.error}
                availableVariables={availableVariables}
                isLoadingVariables={latestWorkflowOutputQuery.isFetching}
                nodeOptions={nodeOptions}
                selectedNodeId={selectedNodeId}
                onSelectedNodeIdChange={setSelectedNodeId}
            />
            <BaseExecutionNode
                status={nodeStatus}
                {...props}
                id={props.id}
                icon="/logos/agent-node.svg"
                name="Agent"
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

AgentNode.displayName = "AgentNode";