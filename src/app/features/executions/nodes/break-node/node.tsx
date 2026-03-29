"use client";

import { type Node, type NodeProps, useNodes, useReactFlow } from "@xyflow/react";
import { memo, useMemo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { BreakNodeDialog, type BreakNodeFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchBreakNodeRealtimeToken } from "./actions";
import { BREAK_NODE_CHANNEL_NAME } from "@/inngest/channels/break-node";
import { NodeType } from "generated/prisma";

type BreakNodeNodeData = {
  loopNodeId?: string;
};

type BreakNodeNodeType = Node<BreakNodeNodeData>;

export const BreakNodeNode = memo((props: NodeProps<BreakNodeNodeType>) => {
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: BREAK_NODE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchBreakNodeRealtimeToken,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const allNodes = useNodes();

  const loopNodes = useMemo(() => {
    return allNodes
      .filter((n) => n.type === NodeType.LOOP_NODE)
      .map((n) => {
        const d = n.data as { variableName?: string; varibleName?: string };
        const v = d?.variableName ?? d?.varibleName;
        const label =
          v && String(v).trim() ? `Loop (${String(v).trim()})` : `Loop (${n.id.slice(0, 8)}…)`;
        return { id: n.id, label };
      });
  }, [allNodes]);

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: BreakNodeFormValues) => {
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
  const selectedLoop = loopNodes.find((l) => l.id === nodeData?.loopNodeId);
  const description = selectedLoop
    ? `After loop: ${selectedLoop.label}`
    : nodeData?.loopNodeId
      ? "Loop not found on canvas"
      : "Not configured";

  return (
    <>
      <BreakNodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData as Partial<BreakNodeFormValues>}
        loopNodes={loopNodes}
      />
      <BaseExecutionNode
        status={nodeStatus}
        {...props}
        id={props.id}
        icon="/logos/break-node.svg"
        name="Break node"
        description={description}
        onSettings={handleOpenSettings}
        onDelete={() => {
          setDialogOpen(true);
        }}
        onDoubleClick={handleOpenSettings}
        children={<></>}
      />
    </>
  );
});

BreakNodeNode.displayName = "BreakNodeNode";
