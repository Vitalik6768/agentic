"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useEffect, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import {
    LoopNodeDialog,
    type LoopFormValues,
    type LoopVariableNodeOption,
} from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchLoopRealtimeToken } from "./actions";
import { LOOP_NODE_CHANNEL_NAME } from "@/inngest/channels/loop-node";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
    getAvailableVariables,
    getUpstreamVariableNodeOptions,
    type AvailableVariable,
} from "@/lib/variable-picker";
import { getUniqueVariableName } from "@/lib/unique-variable-name";

type LoopNodeData = {
    variableName?: string;
    // Backward compatibility for old typo field.
    varibleName?: string;
    arrayInput?: string;
}

type LoopNodeType = Node<LoopNodeData>;

const LOOP_VARIABLE_BASE = "loop";

export const LoopNode = memo((props: NodeProps<LoopNodeType>) => {
    const trpc = useTRPC();
    const params = useParams<{ workflowsId?: string }>();
    const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: LOOP_NODE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchLoopRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
    const [nodeOptions, setNodeOptions] = useState<LoopVariableNodeOption[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string>("");
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const latestWorkflowOutputQuery = useQuery({
        ...(workflowId
            ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
            : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
        enabled: Boolean(workflowId) && dialogOpen,
    });
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchLoopRealtimeToken,
        enabled: true,
    });

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === LOOP_NODE_CHANNEL_NAME &&
                String(message.topic) === "result" &&
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
        arrayInput: string;
    }) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...values,
                        variableName: values.variableName,
                        varibleName: values.variableName,
                    }
                };
            }
            return node;
        }));
    }
    const nodeData = props.data;
    const suggestedName = (() => {
        const existingCandidate = nodeData?.variableName ?? nodeData?.varibleName;
        const trimmed = typeof existingCandidate === "string" ? existingCandidate.trim() : "";
        if (trimmed) return trimmed;
        return getUniqueVariableName(LOOP_VARIABLE_BASE, props.id, getNodes());
    })();
    const defaultValues: Partial<LoopFormValues> = {
        variableName: suggestedName,
        arrayInput: nodeData?.arrayInput,
    };
    const variableName = nodeData?.variableName ?? nodeData?.varibleName;
    const description = variableName
        ? `Iterates items into ${variableName}`
        :
        "NOT CONFIGURED";
    return (
        <>
            <LoopNodeDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={defaultValues}
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
                icon="/logos/loop-node.svg"
                name="Loop"
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})
LoopNode.displayName = "LoopNode";