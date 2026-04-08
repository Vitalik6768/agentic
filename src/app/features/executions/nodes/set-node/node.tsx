"use client";

// import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useEffect, useMemo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import {
    SetNodeDialog,
    type SetNodeDialogValues,
    type SetNodeVariableNodeOption,
} from "./dialog";
import { fetchSetNodeRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { SET_NODE_CHANNEL_NAME } from "@/inngest/channels/set-node";
import { PencilIcon } from "lucide-react";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
    getAvailableVariables,
    getUpstreamVariableNodeOptions,
    type AvailableVariable,
} from "@/lib/variable-picker";
import { getUniqueVariableName } from "@/lib/unique-variable-name";


type SetNodeNodeData = {
    variableName?: string;
    varibleName?: string;
    value?: string;
    valueType?: "string" | "number" | "boolean" | "json";
}

type SetNodeType = Node<SetNodeNodeData>;
const SET_NODE_VARIABLE_BASE = "setNode";

export const SetNodeNode = memo((props: NodeProps<SetNodeType>) => {
    const trpc = useTRPC();
    const params = useParams<{ workflowsId?: string }>();
    const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: SET_NODE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchSetNodeRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
    const [nodeOptions, setNodeOptions] = useState<SetNodeVariableNodeOption[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string>("");
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const latestWorkflowOutputQuery = useQuery({
        ...(workflowId
            ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
            : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
        enabled: Boolean(workflowId) && dialogOpen,
    });
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchSetNodeRealtimeToken,
        enabled: true,
    });

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === SET_NODE_CHANNEL_NAME &&
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
    const nodeData = props.data;

    // Match Delay node behavior: auto-suggest a unique variable name
    // when the Set node hasn't been configured yet.
    const suggestedName = useMemo(() => {
        const trimmed = nodeData?.variableName?.trim() ?? nodeData?.varibleName?.trim();
        if (trimmed) return trimmed;
        return getUniqueVariableName(SET_NODE_VARIABLE_BASE, props.id, getNodes());
    }, [nodeData?.variableName, nodeData?.varibleName, props.id, getNodes, dialogOpen]);

    const defaultValues: Partial<SetNodeDialogValues> = useMemo(
        () => ({
            variableName: suggestedName,
            value: nodeData?.value,
            valueType: nodeData?.valueType,
        }),
        [suggestedName, nodeData?.value, nodeData?.valueType],
    );

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

    const handleSubmit = (values: SetNodeDialogValues) => {
        setNodes((nodes) => {
            const fallbackName = getUniqueVariableName(
                SET_NODE_VARIABLE_BASE,
                props.id,
                nodes,
            );
            const nextVariableName = getUniqueVariableName(
                values.variableName.trim() || fallbackName,
                props.id,
                nodes,
            );

            return nodes.map((node) => {
                if (node.id === props.id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            ...values,
                            variableName: nextVariableName,
                            varibleName: nextVariableName,
                        }
                    };
                }
                return node;
            });
        });
    }
    const existingVariableName = nodeData?.variableName ?? (nodeData as { varibleName?: string } | undefined)?.varibleName;
    const description = existingVariableName
        ? `Set variable: ${existingVariableName}`
        : "NOT CONFIGURED";
        
    return (
        <>
            <SetNodeDialog
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
                icon={PencilIcon}
                name={existingVariableName?.trim() ?? "Set"}
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

SetNodeNode.displayName = "SetNodeNode";