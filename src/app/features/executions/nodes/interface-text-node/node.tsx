"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { InterfaceTextDialog, type InterfaceTextFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchInterfaceTextRealtimeToken } from "./actions";
import { INTERFACE_TEXT_CHANNEL_NAME } from "@/inngest/channels/interface-text";
import { useInngestSubscription } from "@inngest/realtime/hooks";
type InterfaceTextNodeData = {
    variableName?: string;
    varibleName?: string;
    interfaceId?: string;
    operation?: "ADD_CONTENT" | "GET_CONTENT";
    method?: "ADD" | "GET";
    body?: string;
}

type InterfaceTextNodeType = Node<InterfaceTextNodeData>;

export const InterfaceTextNode = memo((props: NodeProps<InterfaceTextNodeType>) => {
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: INTERFACE_TEXT_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchInterfaceTextRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchInterfaceTextRealtimeToken,
        enabled: true,
    });

    const handleOpenSettings = () => {
        setDialogOpen(true);
    }
    const handleSubmit = (values: {
        variableName: string;
        interfaceId: string;
        operation: "ADD_CONTENT" | "GET_CONTENT";
        body?: string;
     
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
    const nodeData = props.data;
    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === INTERFACE_TEXT_CHANNEL_NAME &&
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
    const operation = nodeData?.operation ?? (nodeData?.method === "GET" ? "GET_CONTENT" : "ADD_CONTENT");
    const description = nodeData?.interfaceId
        ? `${operation === "GET_CONTENT" ? "Get" : "Add"} content`
        : "NOT CONFIGURED";
    return (
        <>
            <InterfaceTextDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<InterfaceTextFormValues>}
                executionStatus={nodeStatus}
                executionOutput={latestExecutionResult?.output ?? ""}
                executionError={latestExecutionResult?.error}
            />
            <BaseExecutionNode
                status={nodeStatus}
                {...props}
                id={props.id}
                icon="/logos/interface-text.svg"
                name="Interface Text"
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

InterfaceTextNode.displayName = "InterfaceTextNode";