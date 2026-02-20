"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { HttpRequestDialog, type HttpRequestFormValues } from "./dialog";
// import { useNodeStatus } from "../../hooks/use-node-status";
// import { fetchHttpRequestRealtimeToken } from "./actions";
// import { HTTP_REQUEST_CHANNEL_NAME } from "@/inngest/channels/http-request";
type HttpRequestNodeData = {
    varibleName?: string;
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
    body?: string;
}

type HttpRequestNodeType = Node<HttpRequestNodeData>;

export const HttpRequestNode = memo((props: NodeProps<HttpRequestNodeType>) => {
    // const nodeStatus = useNodeStatus({
    //     nodeId: props.id,
    //     channel: HTTP_REQUEST_CHANNEL_NAME,
    //     topic: "status",
    //     refreshToken: fetchHttpRequestRealtimeToken,
    // });
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes, getNodes } = useReactFlow();

    const handleOpenSettings = () => {
        setDialogOpen(true);
    }
    const handleSubmit = (values: {
        endpoint: string;
        method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";
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
    const description = nodeData?.endpoint
        ? `${nodeData.method ?? "GET"}: ${nodeData.endpoint}` :
        "NOT CONFIGURED";
    return (
        <>
            <HttpRequestDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<HttpRequestFormValues>}
            />
            <BaseExecutionNode
                // status={nodeStatus}
                {...props}
                id={props.id}
                icon={GlobeIcon}
                name="HTTP Request"
                description={description}
                onSettings={handleOpenSettings}
                onDelete={() => { setDialogOpen(true); }}
                onDoubleClick={handleOpenSettings}
                children={<></>}
            />
        </>

    )
})

HttpRequestNode.displayName = "HttpRequestNode";