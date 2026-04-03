"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { HttpRequestDialog, type HttpRequestDialogSubmitValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { HTTP_REQUEST_CHANNEL_NAME } from "@/inngest/channels/http-request";
import { fetchHttpRequestRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
    getAvailableVariables,
    getUpstreamVariableNodeOptions,
    type AvailableVariable,
    type UpstreamVariableNodeOption,
} from "@/lib/variable-picker";
import { getUniqueVariableName } from "@/lib/unique-variable-name";
// import { useNodeStatus } from "../../hooks/use-node-status";
// import { fetchHttpRequestRealtimeToken } from "./actions";
// import { HTTP_REQUEST_CHANNEL_NAME } from "@/inngest/channels/http-request";

const HTTP_REQUEST_VARIABLE_BASE = "httpRequest";

type HttpRequestNodeData = {
    varibleName?: string;
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
    queryParams?: { name: string; value?: string }[];
    body?: string;
    authType?: "NONE" | "BEARER" | "BASIC" | "API_KEY";
    bearerToken?: string;
    basicUsername?: string;
    basicPassword?: string;
    apiKeyHeaderName?: string;
    apiKeyValue?: string;
}

type HttpRequestNodeType = Node<HttpRequestNodeData>;

export const HttpRequestNode = memo((props: NodeProps<HttpRequestNodeType>) => {
    const trpc = useTRPC();
    const params = useParams<{ workflowsId?: string }>();
    const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: HTTP_REQUEST_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchHttpRequestRealtimeToken,
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
        refreshToken: fetchHttpRequestRealtimeToken,
        enabled: true,
    });

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === HTTP_REQUEST_CHANNEL_NAME &&
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

    const nodeData = props.data;

    const suggestedName = useMemo(() => {
        const trimmed = nodeData.varibleName?.trim();
        if (trimmed) return trimmed;
        return getUniqueVariableName(HTTP_REQUEST_VARIABLE_BASE, props.id, getNodes());
    }, [nodeData.varibleName, props.id, getNodes, dialogOpen]);

    const httpDialogDefaults = useMemo<Partial<HttpRequestDialogSubmitValues>>(
        () => ({
            varibleName: suggestedName,
            endpoint: nodeData.endpoint ?? "",
            method: nodeData.method ?? "GET",
            queryParams: nodeData.queryParams ?? [],
            body: nodeData.body ?? "",
            authType: nodeData.authType ?? "NONE",
            bearerToken: nodeData.bearerToken ?? "",
            basicUsername: nodeData.basicUsername ?? "",
            basicPassword: nodeData.basicPassword ?? "",
            apiKeyHeaderName: nodeData.apiKeyHeaderName ?? "",
            apiKeyValue: nodeData.apiKeyValue ?? "",
        }),
        [
            suggestedName,
            nodeData.endpoint,
            nodeData.method,
            nodeData.queryParams,
            nodeData.body,
            nodeData.authType,
            nodeData.bearerToken,
            nodeData.basicUsername,
            nodeData.basicPassword,
            nodeData.apiKeyHeaderName,
            nodeData.apiKeyValue,
        ],
    );

    const handleSubmit = (values: HttpRequestDialogSubmitValues) => {
        setNodes((nodes) => {
            const fallbackVariableName = getUniqueVariableName(
                HTTP_REQUEST_VARIABLE_BASE,
                props.id,
                nodes,
            );
            const trimmedName = values.varibleName.trim();
            const baseVariableName = trimmedName.length > 0 ? trimmedName : fallbackVariableName;
            const nextVariableName = getUniqueVariableName(
                baseVariableName,
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
                            varibleName: nextVariableName,
                        }
                    };
                }
                return node;
            });
        });
    }

    const description = nodeData?.endpoint
        ? `${nodeData.method ?? "GET"}: ${nodeData.endpoint}` :
        "NOT CONFIGURED";
    return (
        <>
            <HttpRequestDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={httpDialogDefaults}
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
                icon={GlobeIcon}
                name={nodeData.varibleName?.trim() ?? "HTTP Request"}
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => { setDialogOpen(true); }}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

HttpRequestNode.displayName = "HttpRequestNode";