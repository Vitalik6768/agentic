"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { OPEN_ROUTER_CHANNEL_NAME } from "@/inngest/channels/open-router";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { OpenRouterDialog, type OpenRouterFormValues, type OpenRouterVariableNodeOption } from "./dialog";
import { fetchOpenRouterRealtimeToken } from "./actions";
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
import { getUniqueVariableName } from "@/lib/unique-variable-name";


type OpenRouterNodeData = {
    variableName?: string;
    varibleName?: string;
    systemPrompt?: string;
    credentialId: string;
    userPrompt: string;
    model?: string;
    forceJsonOutput?: boolean;
    jsonOutputTemplate?: string;
}


type OpenRouterNodeType = Node<OpenRouterNodeData>;

const OPEN_ROUTER_VARIABLE_BASE = "openRouter";

export const OpenRouterNode = memo((props: NodeProps<OpenRouterNodeType>) => {
    const trpc = useTRPC();
    const params = useParams<{ workflowsId?: string }>();
    const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: OPEN_ROUTER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchOpenRouterRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
    const [nodeOptions, setNodeOptions] = useState<OpenRouterVariableNodeOption[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string>("");
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const latestWorkflowOutputQuery = useQuery({
        ...(workflowId
            ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
            : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
        enabled: Boolean(workflowId) && dialogOpen,
    });
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchOpenRouterRealtimeToken,
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

    const nodeData = props.data;
    const suggestedName = useMemo(() => {
        const existingCandidate = nodeData?.variableName ?? nodeData?.varibleName;
        const trimmed = typeof existingCandidate === "string" ? existingCandidate.trim() : "";
        if (trimmed) return trimmed;
        return getUniqueVariableName(OPEN_ROUTER_VARIABLE_BASE, props.id, getNodes());
    }, [nodeData?.variableName, nodeData?.varibleName, props.id, getNodes, dialogOpen]);

    const handleSubmit = (values: OpenRouterFormValues) => {
        setNodes((nodes) => {
            const fallbackVariableName = getUniqueVariableName(
                OPEN_ROUTER_VARIABLE_BASE,
                props.id,
                nodes,
            );
            const nextVariableName = getUniqueVariableName(
                values.varibleName.trim() || fallbackVariableName,
                props.id,
                nodes,
            );

            return nodes.map((node) => {
                if (node.id !== props.id) return node;
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...values,
                        variableName: nextVariableName,
                        varibleName: nextVariableName,
                    },
                };
            });
        });
    }
    const selectedModel = nodeData?.model ?? DEFAULT_OPEN_ROUTER_MODEL;
    const description = nodeData?.userPrompt
        ? `${selectedModel} : ${nodeData.userPrompt.slice(0, 50)}...`
        : "NOT CONFIGURED";
    const existingVariableName =
        nodeData?.variableName ?? (nodeData as { varibleName?: string } | undefined)?.varibleName;
    const trimmedVariableName = existingVariableName?.trim() ?? "";
        
    return (
        <>
            <OpenRouterDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={{ ...(nodeData as Partial<OpenRouterFormValues>), varibleName: suggestedName }}
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
                icon="/logos/openrouter.svg"
                name={trimmedVariableName.length > 0 ? trimmedVariableName : "OpenRouter"}
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