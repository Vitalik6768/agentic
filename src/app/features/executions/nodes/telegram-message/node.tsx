"use client";
import { memo, useEffect, useMemo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { TelegramMessageDialog, type TelegramMessageDialogValues } from "./dialog";
import { fetchTelegramMessageRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { TELEGRAM_MESSAGE_CHANNEL_NAME } from "@/inngest/channels/telegram-message";
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

type TelegramMessageNodeData = {
    variableName?: string;
    varibleName?: string;
    message?: string;
    chatId?: string;
    credentialId?: string;
}

type TelegramMessageNodeType = Node<TelegramMessageNodeData>;

export const TelegramMessageNode = memo((props: NodeProps<TelegramMessageNodeType>) => {
    const trpc = useTRPC();
    const params = useParams<{ workflowsId?: string }>();
    const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: TELEGRAM_MESSAGE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchTelegramMessageRealtimeToken,
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
        refreshToken: fetchTelegramMessageRealtimeToken,
        enabled: true,
    });

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === TELEGRAM_MESSAGE_CHANNEL_NAME &&
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
    const defaultValues: Partial<TelegramMessageDialogValues> = {
        variableName: props.data?.variableName ?? props.data?.varibleName,
        message: props.data?.message ?? "",
        chatId: props.data?.chatId ?? "",
        credentialId: props.data?.credentialId ?? "",
    };

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

    const nodeData = props.data;
    const TELEGRAM_MESSAGE_VARIABLE_BASE = "telegramMessage";
    const suggestedName = useMemo(() => {
        const existingCandidate = nodeData?.variableName ?? nodeData?.varibleName;
        const trimmed = typeof existingCandidate === "string" ? existingCandidate.trim() : "";
        if (trimmed) return trimmed;
        return getUniqueVariableName(TELEGRAM_MESSAGE_VARIABLE_BASE, props.id, getNodes());
    }, [nodeData?.variableName, nodeData?.varibleName, props.id, getNodes, dialogOpen]);

    const handleSubmit = (values: TelegramMessageDialogValues) => {
        setNodes((nodes) => {
            const fallbackVariableName = getUniqueVariableName(
                TELEGRAM_MESSAGE_VARIABLE_BASE,
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
                    }
                };
            });
        });
    }
    const description = nodeData?.message
        ? nodeData.message.slice(0, 50)
        : "NOT CONFIGURED";
    const existingVariableName =
        nodeData?.variableName ?? (nodeData as { varibleName?: string } | undefined)?.varibleName;
    const trimmedVariableName = existingVariableName?.trim() ?? "";
        
    return (
        <>
            <TelegramMessageDialog
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
                icon="/logos/telegram-message.svg"
                name={trimmedVariableName.length > 0 ? trimmedVariableName : "Telegram Message"}
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

TelegramMessageNode.displayName = "TelegramMessageNode";