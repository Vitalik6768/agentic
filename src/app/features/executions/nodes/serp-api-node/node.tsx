"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useEffect, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { SerpApiNodeDialog, type SerpApiNodeFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchSerpApiNodeRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { SERP_API_NODE_CHANNEL_NAME } from "@/inngest/channels/serp-api-node";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
    getAvailableVariables,
    getUpstreamVariableNodeOptions,
    type AvailableVariable,
    type UpstreamVariableNodeOption,
} from "@/lib/variable-picker";
type SerpApiNodeData = {
    varibleName?: string;
    endpoint?: string;
    method?: "GET";
    engine?: string;
    q?: string;
    location?: string;
    google_domain?: string;
    hl?: string;
    gl?: string;
    api_key?: string;
}

type SerpApiNodeType = Node<SerpApiNodeData>;

export const SerpApiNode = memo((props: NodeProps<SerpApiNodeType>) => {
    const trpc = useTRPC();
    const params = useParams<{ workflowsId?: string }>();
    const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: SERP_API_NODE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchSerpApiNodeRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
    const [nodeOptions, setNodeOptions] = useState<UpstreamVariableNodeOption[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string>("");
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const latestWorkflowOutputQuery = useQuery({
        ...(workflowId
            ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
            : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
        enabled: Boolean(workflowId) && dialogOpen,
    });
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchSerpApiNodeRealtimeToken,
        enabled: true,
    });

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === SERP_API_NODE_CHANNEL_NAME &&
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
    const createDefaultVariableName = (nodeName: string) => {
        const randomDigit = Math.floor(Math.random() * 9) + 1;
        return `${nodeName}${randomDigit}`;
    }

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

    const handleSubmit = (values: {
        varibleName: string;
        endpoint: string;
        method?: "GET";
        body?: string;
        engine?: string;
        q?: string;
        location?: string;
        google_domain?: string;
        hl?: string;
        gl?: string;
        api_key?: string;
    }) => {
        const fallbackVariableName = createDefaultVariableName(props.type ?? "serpApiNode");
        const nextVariableName = values.varibleName.trim() || fallbackVariableName;

        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...values,
                        varibleName: nextVariableName,
                    }
                };
            }
            return node;
        }));
    }
    const nodeData = props.data;
    const description = nodeData?.endpoint
        ? `${nodeData.method ?? "GET"}: ${nodeData.endpoint}` :
        "NOT CONFIGURED";
    return (
        <>
            <SerpApiNodeDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                nodeName={props.type}
                defaultValues={nodeData as Partial<SerpApiNodeFormValues>}
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
                icon="/logos/serp-api.svg"
                name="SERP API Node"
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => { setDialogOpen(true); }}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

SerpApiNode.displayName = "SerpApiNode";