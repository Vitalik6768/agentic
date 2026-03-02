import { memo, useState } from "react";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { BaseTriggerNode } from "../base-trigger-node";
import { SCHEDULE_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/schedule-trigger";
import { fetchScheduleTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "../../executions/hooks/use-node-status";
import { ScheduleTriggerDialog, type ScheduleTriggerFormValues } from "./dialog";

type ScheduleTriggerNodeData = {
    cronExpression?: string;
    timezone?: string;
    enabled?: boolean;
    misfirePolicy?: "SKIP_MISSED" | "RUN_ONCE_IF_MISSED" | "CATCH_UP";
    maxDelaySec?: number;
};

type ScheduleTriggerNodeType = Node<ScheduleTriggerNodeData>;

export const ScheduleTriggerNode = memo((props: NodeProps<ScheduleTriggerNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: SCHEDULE_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchScheduleTriggerRealtimeToken,
    });
    const handleSettings = () => {
        setOpen(true);
    };

    const handleSubmit = (values: ScheduleTriggerFormValues) => {
        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id === props.id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            ...values,
                        },
                    };
                }
                return node;
            }),
        );
    };

    const nodeData = props.data;
    const description = nodeData?.cronExpression
        ? `${nodeData.enabled === false ? "Disabled" : "Enabled"} · ${nodeData.cronExpression}`
        : "NOT CONFIGURED";

    return (
        <>
        <ScheduleTriggerDialog
            open={open}
            onOpenChange={setOpen}
            onSubmit={handleSubmit}
            defaultValues={nodeData as Partial<ScheduleTriggerFormValues>}
            executionStatus={nodeStatus}
        />
        <BaseTriggerNode 
        status={nodeStatus}
        {...props}
        children={<></>}
        icon="/logos/schedule-trigger.svg"
        name="Schedule Trigger"
        description={description}
        onDoubleClick={handleSettings}
        onSettings={handleSettings}
         />


        </>
    )
})

ScheduleTriggerNode.displayName = "ScheduleTriggerNode";