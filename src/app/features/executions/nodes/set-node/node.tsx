"use client";

// import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { SetNodeDialog, type SetNodeDialogValues } from "./dialog";
import { fetchSetNodeRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { SET_NODE_CHANNEL_NAME } from "@/inngest/channels/set-node";
import { PencilIcon } from "lucide-react";


type SetNodeNodeData = {
    variableName?: string;
    value?: string;
    valueType?: "string" | "number" | "boolean" | "json";
}


type SetNodeType = Node<SetNodeNodeData>;

export const SetNodeNode = memo((props: NodeProps<SetNodeType>) => {
    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: SET_NODE_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchSetNodeRealtimeToken,
    });
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();
    const { data: realtimeMessages } = useInngestSubscription({
        refreshToken: fetchSetNodeRealtimeToken,
        enabled: true,
    });

    const latestResultMessage = realtimeMessages
        .filter(
            (message) =>
                message.kind === "data" &&
                message.channel === SET_NODE_CHANNEL_NAME &&
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
    const defaultValues: Partial<SetNodeDialogValues> = {
        variableName: props.data?.variableName ?? (props.data as { varibleName?: string } | undefined)?.varibleName,
        value: props.data?.value,
        valueType: props.data?.valueType,
    };

    const handleOpenSettings = () => {
        setDialogOpen(true);
    }
    const handleSubmit = (values: SetNodeDialogValues) => {
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
    const existingVariableName = nodeData?.variableName ?? (nodeData as { varibleName?: string } | undefined)?.varibleName;
    const description = existingVariableName
        ? `Set variable: ${existingVariableName}`
        : "NOT CONFIGURED";
        
    return (
        <>
            <SetNodeDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={defaultValues}
                executionStatus={nodeStatus}
                executionOutput={latestExecutionResult?.output ?? ""}
                executionError={latestExecutionResult?.error}
            />
            <BaseExecutionNode
                status={nodeStatus}
                {...props}
                id={props.id}
                icon={PencilIcon}
                name="Set Node"
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => undefined}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

SetNodeNode.displayName = "SetNodeNode";