"use client";

import { FilterIcon, GlobeIcon, MessagesSquareIcon, MousePointer2Icon } from "lucide-react";
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
        type: NodeType.TELEGRAM_TRIGGER,
        label: "Telegram Trigger",
        description: "Trigger the workflow via Telegram",
        icon: "/logos/telegram.svg",
    },
    {
        type: NodeType.WEBHOOK_TRIGGER,
        label: "Webhook Trigger",
        description: "Trigger the workflow via HTTP webhook",
        icon: "/logos/webhook.svg",
    },
    {
        type: NodeType.CHAT_TRIGGER,
        label: "Chat Trigger",
        description: "Trigger the workflow via chat",
        icon: MessagesSquareIcon,
    },
    {
        type: NodeType.SCHEDULE_TRIGGER,
        label: "Schedule Trigger",
        description: "Trigger the workflow on a schedule",
        icon: "/logos/schedule-trigger.svg",
    },
]

const dataTransformationNodes: NodeTypeOption[] = [
    {
        type: NodeType.LOOP_NODE,
        label: "Loop Node",
        description: "Loop through a list of items",
        icon: "/logos/loop-node.svg",
    },
    {
        type: NodeType.EXTRACTOR_NODE,
        label: "Extractor Node",
        description: "Extract and transform specific values",
        icon: "/logos/extractor-node.svg",
    },
    {
        type: NodeType.SET_NODE,
        label: "Set Node",
        description: "Set a variable in the context",
        icon: "/logos/set-node.svg",
    },
    {
        type: NodeType.CONDITION_NODE,
        label: "Condition Node",
        description: "Use a condition node",
        icon: "/logos/condition-node.svg",
    },
    {
        type: NodeType.BREAK_NODE,
        label: "Break node",
        description: "Continue the workflow only after the loop’s last iteration",
        icon: "/logos/break-node.svg",
    },
    {
        type: NodeType.DELAY_NODE,
        label: "Delay Node",
        description: "Delay the execution of the next node",
        icon: "/logos/delay-node.svg",
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
        type: NodeType.TELEGRAM_MESSAGE,
        label: "Telegram Message",
        description: "Send a message to a Telegram chat",
        icon: "/logos/telegram-message.svg",
    },
    {
        type: NodeType.OPENROUTER,
        label: "OpenRouter",
        description: "Use OpenRouter to generate text",
        icon: "/logos/openrouter.svg",
    },
    {
        type: NodeType.INTERFACE_TEXT,
        label: "Interface Text",
        description: "Use an interface text",
        icon: "/logos/interface-text.svg",
    },
    {
        type: NodeType.INTERFACE_TABLE,
        label: "Interface Table",
        description: "Use an interface table",
        icon: "/logos/table-interface.svg",
    },
    {
        type: NodeType.AGENT_NODE,
        label: "Agent Node",
        description: "Use an agent node",
        icon: "/logos/agent-node.svg",
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
            const deselectedNodes = nodes.map((n) =>
                n.selected ? { ...n, selected: false } : n
            );
            const newNode = {
                id: createId(),
                type: nodeType,
                position: flowPosition,
                data: nodeType === NodeType.TELEGRAM_TRIGGER
                    ? { variableName: "telegramTrigger" }
                    : {},
                selected: true,
                dragging: false,
            }
            if (hasInitialTrigger) {

                return [newNode]

            }
            return [...deselectedNodes, newNode]
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
                            <div key={nodeType.type} className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-primary hover:bg-muted transition-colors"
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
                            <div key={nodeType.type} className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-primary hover:bg-muted/50 transition-colors"
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
                <Separator />
                <div>
                    {dataTransformationNodes.map((nodeType) => {
                        const icon = typeof nodeType.icon === "string" ? nodeType.icon : React.createElement(nodeType.icon, { className: "size-6" });
                        return (
                            <div key={nodeType.type} className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-primary hover:bg-muted/50 transition-colors"
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