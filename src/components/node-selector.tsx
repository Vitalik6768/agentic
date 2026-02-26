"use client";

import { GlobeIcon, MousePointer2Icon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import React, { useCallback } from "react";
import { Separator } from "./ui/separator";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";
import { createId } from "@paralleldrive/cuid2";
import { NodeType } from "generated/prisma";


export type NodeTypeOption = {
    type: NodeType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }> | string;

}

const triggerNodes: NodeTypeOption[] = [
    {
        type: NodeType.MANUAL_TRIGGER,
        label: "Trigger manually",
        description: "Trigger the workflow manually",
        icon: MousePointer2Icon,
    },
    {
        type: NodeType.GOOGLE_FORM_TRIGGER,
        label: "Google Form Trigger",
        description: "When a Google Form is submitted",
        icon: `/logos/googleform.svg`,
    },
]

const executionNodes: NodeTypeOption[] = [
    {
        type: NodeType.HTTP_REQUEST,
        label: "HTTP Request",
        description: "Make an HTTP request",
        icon: GlobeIcon,
    },
    {
        type: NodeType.SET_NODE,
        label: "Set Node",
        description: "Set a variable in the context",
        icon: "/logos/set-node.svg",
    },
    {
        type: NodeType.OPENROUTER,
        label: "OpenRouter",
        description: "Use OpenRouter to generate text",
        icon: "/logos/openrouter.svg",
    },
    {
        type: NodeType.DISCORD,
        label: "Discord",
        description: "Use Discord to send messages",
        icon: "/logos/discord.svg",
    },
    {
        type: NodeType.SLACK,
        label: "Slack",
        description: "Use Slack to send messages",
        icon: "/logos/slack.svg",
    },
]

interface NodeSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function NodeSelector({ open, onOpenChange, children }: NodeSelectorProps) {
    const { setNodes, getNodes, screenToFlowPosition } = useReactFlow()

    const handleNodeSelect = useCallback((nodeType: NodeType) => {
        if (nodeType === NodeType.MANUAL_TRIGGER) {
            const nodes = getNodes()
            const hasManualTrigger = nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER)
            if (hasManualTrigger) {
                toast.error("You can only have one manual trigger")
                return
            }
        }
        setNodes((nodes) => {
            const hasInitialTrigger = nodes.some((node) => node.type === NodeType.INITIAL)
            const centerX = window.innerWidth / 2
            const centerY = window.innerHeight / 2
            const flowPosition = screenToFlowPosition({
                x: centerX + Math.random() - 0.5 * 200,
                y: centerY + Math.random() - 0.5 * 200
            })
            const newNode = {
                id: createId(),
                type: nodeType,
                position: flowPosition,
                data: {},
                selected: true,
                dragging: false,
            }
            if (hasInitialTrigger) {

                return [newNode]

            }
            return [...nodes, newNode]
        }
        )
        onOpenChange(false)

    }, [onOpenChange, setNodes, getNodes, screenToFlowPosition])
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>What Trigger This Workflow?</SheetTitle>
                    <SheetDescription>Choose how you want to start your workflow

                    </SheetDescription>
                </SheetHeader>
                <div>
                    {triggerNodes.map((nodeType) => {
                        const icon = typeof nodeType.icon === "string" ? nodeType.icon : React.createElement(nodeType.icon, { className: "size-6" });
                        return (
                            <div key={nodeType.type} className="w-full justify-start h-auto py-5 px-4 rounded-none curser-pointer border-l-2 border-transparent hover:border-primary"
                                onClick={() =>  handleNodeSelect(nodeType.type)}
                            >
                                <div className="flex items-center gap-6 w-full overflow-hidden">
                                    {typeof icon === "string" ? (
                                        <img
                                            src={icon}
                                            alt={nodeType.label}
                                            className="size-5 object-contain rounded-sm"
                                        />
                                    ) : (
                                        icon
                                    )}
                                    <div className="flex flex-col items-start text-left">
                                        <span className="font-medium text-sm">
                                            {nodeType.label}
                                        </span>
                                        <span className="text-muted-foreground text-xs">
                                            {nodeType.description}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <Separator />
                <div>
                    {executionNodes.map((nodeType) => {
                        const icon = typeof nodeType.icon === "string" ? nodeType.icon : React.createElement(nodeType.icon, { className: "size-6" });
                        return (
                            <div key={nodeType.type} className="w-full justify-start h-auto py-5 px-4 rounded-none curser-pointer border-l-2 border-transparent hover:border-primary"
                                onClick={() => handleNodeSelect(nodeType.type)}
                            >
                                <div className="flex items-center gap-6 w-full overflow-hidden">
                                    {typeof icon === "string" ? (
                                        <img
                                            src={icon}
                                            alt={nodeType.label}
                                            className="size-5 object-contain rounded-sm"
                                        />
                                    ) : (
                                        icon
                                    )}
                                    <div className="flex flex-col items-start text-left">
                                        <span className="font-medium text-sm">
                                            {nodeType.label}
                                        </span>
                                        <span className="text-muted-foreground text-xs">
                                            {nodeType.description}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </SheetContent>
        </Sheet>
    )
}