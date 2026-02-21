"use client";

import { BaseHandle } from "@/components/react-flow/base-handle";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { WorkflowNode } from "@/components/react-flow/workflow-node";
import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { memo, type ReactNode, type ReactElement } from "react";




interface BaseTriggerNodeProps extends NodeProps {
    children: ReactNode;
    showToolbar?: boolean;
    onDelete?: () => void;
    onSettings?: () => void;
    onDoubleClick?: () => void;
    name?: string;
    description?: string;
    icon?: React.ComponentType<{ className?: string }> | string;
    status:string;
}


export const BaseTriggerNode = memo(({
    id,
    name,
    description,
    icon: Icon,
    children,
    onDoubleClick,
    onSettings,
    onDelete,
    status,
    ...props
}: BaseTriggerNodeProps): ReactElement => {
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
            id={id}
            name={name}
            description={description}
            onDelete={handleDelete}
            onSettings={onSettings}

            {...props}
        >
            <NodeStatusIndicator
            status={status as NodeStatus}
            variant="border"
            className="rounded-l-2xl"
            >
                <BaseNode
                    onDoubleClick={onDoubleClick}
                    className="rounded-l-2xl relative group"
                    status={status as NodeStatus}
                >
                    <BaseNodeContent>
                        {typeof Icon === "string" ? (
                            <img src={Icon} alt={name} width={16} height={16} />
                        ) : Icon ? (
                            <Icon className="size-5 object-contain rounded-sm" />
                        ) : null}
                        {children}


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


BaseTriggerNode.displayName = "BaseTriggerNode";