"use client";

import { BaseHandle } from "@/components/react-flow/base-handle";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { WorkflowNode } from "@/components/react-flow/workflow-node";
import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";
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
                    className="rounded-l-2xl relative group h-15 w-15"
                    status={status as NodeStatus}
                >
                    <BaseNodeContent className="relative items-center">
                        {typeof Icon === "string" ? (
                            <img src={Icon} alt={name} width={24} height={24} className="object-contain mt-1" />
                        ) : Icon ? (
                            <Icon className="size-6 object-contain rounded-sm mt-1" />
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