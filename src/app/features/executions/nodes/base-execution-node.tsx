"use client";

import { BaseHandle } from "@/components/react-flow/base-handle";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
// import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { WorkflowNode } from "@/components/react-flow/workflow-node";
import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { memo, type ReactNode, type ReactElement } from "react";




interface BaseExecutionNodeProps extends NodeProps {
    children: ReactNode;
    showToolbar?: boolean;
    onDelete?: () => void;
    onSettings?: () => void;
    onDoubleClick?: () => void;
    name?: string;
    description?: string;
    // status: NodeStatus;
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
    // status="initial",
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
            {/* <NodeStatusIndicator
                status={status}
                variant="border"
                className="rounded-l-2xl"
            > */}
            <BaseNode
                onDoubleClick={onDoubleClick}
            // status={status}
            >
                <BaseNodeContent>
                    {typeof Icon === "string" ? (
                        <img src={Icon} alt={name} width={16} height={16} />
                    ) : Icon ? (
                        <Icon className="size-5 object-contain rounded-sm" />
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
            {/* </NodeStatusIndicator> } */}
        </WorkflowNode >
    )
    
})


BaseExecutionNode.displayName = "BaseExecutionNode";