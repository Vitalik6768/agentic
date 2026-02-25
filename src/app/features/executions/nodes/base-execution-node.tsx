"use client";

import { BaseHandle } from "@/components/react-flow/base-handle";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { NodeStatusIndicator, type NodeStatus } from "@/components/react-flow/node-status-indicator";
// import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { WorkflowNode } from "@/components/react-flow/workflow-node";
import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";
import { memo, type ReactNode } from "react";




interface BaseExecutionNodeProps extends NodeProps {
    children: ReactNode;
    showToolbar?: boolean;
    onDelete?: () => void;
    onSettings?: () => void;
    onDoubleClick?: () => void;
    name?: string;
    description?: string;
    status: NodeStatus;
    icon?: React.ComponentType<{ className?: string }> | string;
}

export const BaseExecutionNode = memo(({
    id,
    name,
    description,
    icon: Icon,
    children,
    onDoubleClick,
    onSettings,
    onDelete,
    status="initial",
    ...props
}: BaseExecutionNodeProps) => {
    const { setNodes, setEdges } = useReactFlow();
    const handleDelete = () => {
        setNodes((currentNodes) => {
            const updateNode = currentNodes.filter((node) => node.id !== id);
            return updateNode;
        });
        setEdges((currentEdges) => {
            const updateEdges = currentEdges.filter((edge) => edge.source !== id && edge.target !== id);
            return updateEdges;
        });
    }
    return (
        <WorkflowNode
            showTollbar={true}
            id={id}
            name={name}
            description={description}
            onDelete={handleDelete}
            onSettings={onSettings}

            {...props}
        >
            <NodeStatusIndicator
                status={status}
                variant="border"
                className="rounded-none"
            >
            <BaseNode
                onDoubleClick={onDoubleClick}
                className="relative h-15 w-16 rounded-none border-slate-300 bg-card shadow-sm"
                status={status}
            >
                <BaseNodeContent className="relative flex h-full w-full items-center justify-center p-0">
                    {typeof Icon === "string" ? (
                        <img src={Icon} alt={name} width={28} height={28} className="mt-1 h-7 w-7 object-contain" />
                    ) : Icon ? (
                        <Icon className="mt-1 size-7 object-contain rounded-sm text-muted-foreground" />
                    ) : null}
                    {status === "success" ? (
                        <div className="absolute right-1.5 bottom-0.5 rounded-full bg-background p-0.5 text-green-500">
                            <CheckIcon className="size-3.5" />
                        </div>
                    ) : status === "error" ? (
                        <div className="absolute right-1.5 bottom-0.5 rounded-full bg-background p-0.5 text-red-500">
                            <TriangleAlertIcon className="size-3.5" />
                        </div>
                    ) : null}
                    {children}
                    <BaseHandle
                        id="target-1"
                        type="target"
                        position={Position.Left}
                    />
                    <BaseHandle
                        id="source-1"
                        type="source"
                        position={Position.Right}
                    />
                </BaseNodeContent>
            </BaseNode>
            </NodeStatusIndicator>
        </WorkflowNode >
    )

})


BaseExecutionNode.displayName = "BaseExecutionNode";