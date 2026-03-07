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
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
    getAvailableVariables,
    getUpstreamVariableNodeOptions,
    type AvailableVariable,
} from "@/lib/variable-picker";
import {
    AGENT_TOOL_CATALOG,
    ToolsDialog,
    TextInterfaceToolDialog,
    type AgentToolId,
    type AgentToolSettings,
    type TextInterfaceToolConfig,
} from "./tools";


type AgentNodeData = {
    systemPrompt?: string;
    credentialId: string;
    userPrompt: string;
    model?: string;
    enabledTools?: AgentToolId[];
    toolSettings?: Partial<AgentToolSettings>;
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
    const [toolsDialogOpen, setToolsDialogOpen] = useState(false);
    const [activeToolConfig, setActiveToolConfig] = useState<AgentToolId | null>(null);
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
    const handleSaveTools = (enabledTools: AgentToolId[]) => {
        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id !== props.id) {
                    return node;
                }

                return {
                    ...node,
                    data: {
                        ...node.data,
                        enabledTools,
                    },
                };
            })
        );
    };

    const handleSaveTextInterfaceToolConfig = (value: TextInterfaceToolConfig) => {
        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id !== props.id) {
                    return node;
                }

                const currentData = (node.data ?? {}) as AgentNodeData;
                return {
                    ...node,
                    data: {
                        ...currentData,
                        toolSettings: {
                            ...(currentData.toolSettings ?? {}),
                            text_interface: value,
                        },
                    },
                };
            })
        );
    };

    const nodeData = props.data;
    const enabledTools = nodeData?.enabledTools ?? [];
    const enabledToolItems = AGENT_TOOL_CATALOG.filter((tool) => enabledTools.includes(tool.id));
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
            <ToolsDialog
                open={toolsDialogOpen}
                onOpenChange={setToolsDialogOpen}
                selectedTools={enabledTools}
                onSave={handleSaveTools}
            />
            <TextInterfaceToolDialog
                open={activeToolConfig === "text_interface"}
                onOpenChange={(open) => {
                    if (!open) setActiveToolConfig(null);
                }}
                defaultValue={nodeData?.toolSettings?.text_interface}
                onSave={handleSaveTextInterfaceToolConfig}
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
                bottomActions={(
                    <div className="flex items-center gap-1.5">
                        {enabledToolItems.map((tool) => (
                            <Button
                                key={tool.id}
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0"
                                title={tool.label}
                                onClick={() => {
                                    if (tool.configurable) {
                                        setActiveToolConfig(tool.id);
                                        return;
                                    }
                                    setToolsDialogOpen(true);
                                }}
                            >
                                {tool.icon ? (
                                    <Image
                                        src={tool.icon}
                                        alt={tool.label}
                                        width={14}
                                        height={14}
                                        className="h-3.5 w-3.5"
                                    />
                                ) : (
                                    <span className="text-[10px]">{tool.label.slice(0, 1)}</span>
                                )}
                            </Button>
                        ))}
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setToolsDialogOpen(true)}
                            className="h-7 px-2 text-xs"
                        >
                            Add Tool
                        </Button>
                    </div>
                )}
                children={<></>}
            />
        </>

    )
})

AgentNode.displayName = "AgentNode";