"use client";

import { NodeToolbar, Position, type NodeProps } from "@xyflow/react";
import { Button } from "../ui/button";
import { SettingsIcon, TrashIcon } from "lucide-react";
import type { ReactNode } from "react";



interface WorkflowNodeProps extends NodeProps {
    children: ReactNode;
    showTollbar?: boolean;
    onDelete?: () => void;
    onSettings?: () => void;
    name?: string;
    description?: string;

}

export function WorkflowNode({
    children,
    showTollbar = false,
    onDelete,
    onSettings,
    name,
    description,
    ...props }: WorkflowNodeProps) {

    return (
        <>
            <NodeToolbar>
                <Button size="sm" variant={"ghost"} onClick={onSettings}>
                    <SettingsIcon className="size-4" />
                </Button>
                <Button size="sm" variant={"ghost"} onClick={onDelete}>
                    <TrashIcon className="size-4" />
                </Button>

            </NodeToolbar>
            {children}
            {name && 
            <NodeToolbar
            position={Position.Bottom}
            isVisible
            className="max-w-[200px] text-center"
            >
                <p className="font-medium">
                    {name}
                </p>
                {description && (
                    <p className="text-muted-foreground truncate text-sm">
                        {description}
                    </p>
                )}
            </NodeToolbar>
            }
        </>


    )
}