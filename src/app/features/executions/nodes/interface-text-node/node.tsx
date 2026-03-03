"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useEffect, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import {
    InterfaceTextDialog,
    type InterfaceTextFormValues,
    type InterfaceTextVariableNodeOption,
} from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchInterfaceTextRealtimeToken } from "./actions";
import { INTERFACE_TEXT_CHANNEL_NAME } from "@/inngest/channels/interface-text";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
    getAvailableVariables,
    getUpstreamVariableNodeOptions,
    type AvailableVariable,
} from "@/lib/variable-picker";
type InterfaceTextNodeData = {
    variableName?: string;
    varibleName?: string;
    interfaceId?: string;
    operation?: "ADD_CONTENT" | "GET_CONTENT";
    method?: "ADD" | "GET";
    body?: string;
}

type InterfaceTextNodeType = Node<InterfaceTextNodeData>;

export const InterfaceTextNode = memo((props: NodeProps<InterfaceTextNodeType>) => {
    const trpc = useTRPC();
    const params = useParams<{ workflowsId?: string }>();
    const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: INTERFACE_TEXT_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchInterfaceTextRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
    const [nodeOptions, setNodeOptions] = useState<InterfaceTextVariableNodeOption[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string>("");
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const latestWorkflowOutputQuery = useQuery({
        ...(workflowId
            ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
            : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
        enabled: Boolean(workflowId) && dialogOpen,
    });
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchInterfaceTextRealtimeToken,
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
        variableName: string;
        interfaceId: string;
        operation: "ADD_CONTENT" | "GET_CONTENT";
        body?: string;
     
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
    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === INTERFACE_TEXT_CHANNEL_NAME &&
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
    const operation = nodeData?.operation ?? (nodeData?.method === "GET" ? "GET_CONTENT" : "ADD_CONTENT");
    const description = nodeData?.interfaceId
        ? `${operation === "GET_CONTENT" ? "Get" : "Add"} content`
        : "NOT CONFIGURED";
    return (
        <>
            <InterfaceTextDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<InterfaceTextFormValues>}
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
                icon="/logos/interface-text.svg"
                name="Interface Text"
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

InterfaceTextNode.displayName = "InterfaceTextNode";