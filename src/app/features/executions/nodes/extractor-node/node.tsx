"use client";

// import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useEffect, useMemo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import {
    ExtractorNodeDialog,
    type ExtractorNodeDialogValues,
    type ExtractorNodeVariableNodeOption,
} from "./dialog";
import { fetchExtractorNodeRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { EXTRACTOR_NODE_CHANNEL_NAME } from "../../../../../inngest/channels/extractor-node";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
    getAvailableVariables,
    getUpstreamVariableNodeOptions,
    type AvailableVariable,
} from "@/lib/variable-picker";
import { getUniqueVariableName } from "@/lib/unique-variable-name";


type ExtractorNodeNodeData = {
    variableName?: string;
    varibleName?: string;
    fields?: Array<{
        outputKey?: string;
        lookupMode?: "path" | "key_name" | "key_value" | "object_where";
        sourcePath?: string;
        lookupValue?: string;
        matchKey?: string;
        matchValue?: string;
        outputType?: "string" | "number" | "boolean" | "object" | "array";
        operation?: "as_is" | "first" | "join" | "count";
        separator?: string;
    }>;
    // legacy single-field shape
    sourcePath?: string;
    operation?: "as_is" | "first" | "join" | "count";
    separator?: string;
}

type ExtractorNodeType = Node<ExtractorNodeNodeData>;

const EXTRACTOR_VARIABLE_BASE = "extractor";

export const ExtractorNode = memo((props: NodeProps<ExtractorNodeType>) => {
    const trpc = useTRPC();
    const params = useParams<{ workflowsId?: string }>();
    const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: EXTRACTOR_NODE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchExtractorNodeRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
    const [nodeOptions, setNodeOptions] = useState<ExtractorNodeVariableNodeOption[]>([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string>("");
    const { setNodes, getNodes, getEdges } = useReactFlow();
    const latestWorkflowOutputQuery = useQuery({
        ...(workflowId
            ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
            : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
        enabled: Boolean(workflowId) && dialogOpen,
    });
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchExtractorNodeRealtimeToken,
        enabled: true,
    });

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === EXTRACTOR_NODE_CHANNEL_NAME &&
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
    const normalizedFields = props.data?.fields?.map((field, index) => ({
        outputKey: field.outputKey?.trim() ?? `field_${index + 1}`,
        lookupMode: field.lookupMode ?? "path",
        sourcePath: field.sourcePath?.trim() ?? "",
        lookupValue: field.lookupValue?.trim() ?? "",
        matchKey: field.matchKey?.trim() ?? "",
        matchValue: field.matchValue?.trim() ?? "",
        outputType: field.outputType ?? "string",
        operation: field.operation ?? "as_is",
        separator: field.separator ?? ", ",
    }));
    const defaultValues = {
        variableName: props.data?.variableName ?? (props.data as { varibleName?: string } | undefined)?.varibleName,
        fields: normalizedFields,
        sourcePath: props.data?.sourcePath,
        operation: props.data?.operation,
        separator: props.data?.separator,
    };
    const nodeData = props.data;
    const suggestedName = useMemo(() => {
        const existingCandidate = nodeData?.variableName ?? nodeData?.varibleName;
        const trimmed = typeof existingCandidate === "string" ? existingCandidate.trim() : "";
        if (trimmed) return trimmed;
        return getUniqueVariableName(EXTRACTOR_VARIABLE_BASE, props.id, getNodes());
    }, [nodeData?.variableName, nodeData?.varibleName, props.id, getNodes, dialogOpen]);

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
    const handleSubmit = (values: ExtractorNodeDialogValues) => {
        setNodes((nodes) => {
            const fallbackVariableName = getUniqueVariableName(
                EXTRACTOR_VARIABLE_BASE,
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
    }
    const fieldsCount = Array.isArray(nodeData?.fields) ? nodeData.fields.length : 0;
    const description = fieldsCount > 0
        ? `Extract ${fieldsCount} field${fieldsCount > 1 ? "s" : ""}`
        : nodeData?.sourcePath
            ? `Extract ${nodeData.sourcePath}`
        : "NOT CONFIGURED";
    const existingVariableName =
        nodeData?.variableName ?? (nodeData as { varibleName?: string } | undefined)?.varibleName;
    const trimmedVariableName = existingVariableName?.trim() ?? "";
        
    return (
        <>
            <ExtractorNodeDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={{ ...defaultValues, variableName: suggestedName }}
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
                icon="/logos/extractor-node.svg"
                name={trimmedVariableName.length > 0 ? trimmedVariableName : "Extractor"}
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})


ExtractorNode.displayName = "ExtractorNode";