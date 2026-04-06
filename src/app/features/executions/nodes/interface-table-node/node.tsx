"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useEffect, useMemo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import {
    InterfaceTableDialog,
    type InterfaceTableFormValues,
    type InterfaceTableVariableNodeOption,
} from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchInterfaceTableRealtimeToken } from "./actions";
import { INTERFACE_TABLE_CHANNEL_NAME } from "@/inngest/channels/interface-table";
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

const INTERFACE_TABLE_VARIABLE_BASE = "interfaceTable";
type InterfaceTableNodeData = {
    variableName?: string;
    varibleName?: string;
    interfaceId?: string;
    operation?: "GET_DATA" | "APPEND_DATA" | "UPDATE_DATA";
    method?: "ADD" | "GET";
    appendColumnValues?: string[];
    matchField?: string;
    matchValue?: string;
    updateField?: string;
    updateValue?: string;
}

type InterfaceTableNodeType = Node<InterfaceTableNodeData>;

export const InterfaceTableNode = memo((props: NodeProps<InterfaceTableNodeType>) => {
    const trpc = useTRPC();
    const params = useParams<{ workflowsId?: string }>();
    const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: INTERFACE_TABLE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchInterfaceTableRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
    const [nodeOptions, setNodeOptions] = useState<InterfaceTableVariableNodeOption[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string>("");
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const latestWorkflowOutputQuery = useQuery({
        ...(workflowId
            ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
            : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
        enabled: Boolean(workflowId) && dialogOpen,
    });
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchInterfaceTableRealtimeToken,
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
    };

    const handleSubmit = (values: InterfaceTableFormValues) => {
        setNodes((nodes) => {
            const fallbackVariableName = getUniqueVariableName(
                INTERFACE_TABLE_VARIABLE_BASE,
                props.id,
                nodes,
            );
            const nextVariableName = getUniqueVariableName(
                values.variableName.trim() || fallbackVariableName,
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
    };

    const nodeData = props.data;
    const suggestedName = useMemo(() => {
        const existingCandidate = nodeData?.variableName ?? nodeData?.varibleName;
        const trimmed = typeof existingCandidate === "string" ? existingCandidate.trim() : "";
        if (trimmed) return trimmed;
        return getUniqueVariableName(INTERFACE_TABLE_VARIABLE_BASE, props.id, getNodes());
    }, [nodeData?.variableName, nodeData?.varibleName, props.id, getNodes, dialogOpen]);
    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === INTERFACE_TABLE_CHANNEL_NAME &&
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
    const operation =
        nodeData?.operation ?? (nodeData?.method === "GET" ? "GET_DATA" : "UPDATE_DATA");
    const operationLabel =
        operation === "GET_DATA"
            ? "Get table data"
            : operation === "APPEND_DATA"
              ? "Append table row"
              : "Update table data";
    const description = nodeData?.interfaceId ? operationLabel : "NOT CONFIGURED";
    const existingVariableName =
        nodeData?.variableName ?? (nodeData as { varibleName?: string } | undefined)?.varibleName;
    const trimmedVariableName = existingVariableName?.trim() ?? "";
    return (
        <>
            <InterfaceTableDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={{ ...(nodeData as Partial<InterfaceTableFormValues>), variableName: suggestedName }}
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
                icon="/logos/table-interface.svg"
                name={trimmedVariableName.length > 0 ? trimmedVariableName : "Interface Table"}
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

InterfaceTableNode.displayName = "InterfaceTableNode";