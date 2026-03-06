"use client";

import { BaseHandle } from "@/components/react-flow/base-handle";
import { type Node, type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { memo, useEffect, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { CONDITION_NODE_CHANNEL_NAME } from "@/inngest/channels/condition-node";
import { fetchConditionNodeRealtimeToken } from "./actions";
import { ConditionDialog, type ConditionDialogValues } from "./dialog";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import {
  getAvailableVariables,
  getUpstreamVariableNodeOptions,
  type AvailableVariable,
  type UpstreamVariableNodeOption,
} from "@/lib/variable-picker";

type ConditionNodeData = {
  variableName?: string;
  varibleName?: string;
  expression?: string;
};

type ConditionNodeType = Node<ConditionNodeData>;

export const ConditionNode = memo((props: NodeProps<ConditionNodeType>) => {
  const trpc = useTRPC();
  const params = useParams<{ workflowsId?: string }>();
  const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
  const [nodeOptions, setNodeOptions] = useState<UpstreamVariableNodeOption[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const { setNodes, getNodes, getEdges } = useReactFlow();
  const latestWorkflowOutputQuery = useQuery({
    ...(workflowId
      ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
      : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
    enabled: Boolean(workflowId) && dialogOpen,
  });
  const { data: realtimeMessages } = useInngestSubscription({
    refreshToken: fetchConditionNodeRealtimeToken,
    enabled: true,
  });
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CONDITION_NODE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchConditionNodeRealtimeToken,
  });

  const latestResultMessage = realtimeMessages
    .filter(
      (message) =>
        message.kind === "data" &&
        message.channel === CONDITION_NODE_CHANNEL_NAME &&
        message.topic === "result" &&
        (message.data as { nodeId: string }).nodeId === props.id,
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

  const description = props.data?.expression?.trim()
    ? props.data.expression
    : "IF condition";

  const defaultValues: Partial<ConditionDialogValues> = {
    variableName: props.data?.variableName ?? props.data?.varibleName,
    expression: props.data?.expression,
  };

  useEffect(() => {
    if (!dialogOpen) return;
    const vars = getAvailableVariables(
      props.id,
      getNodes(),
      getEdges(),
      latestWorkflowOutputQuery.data?.output,
      selectedNodeId || undefined,
    );
    setAvailableVariables(vars);
  }, [dialogOpen, props.id, getNodes, getEdges, latestWorkflowOutputQuery.data?.output, selectedNodeId]);

  const handleOpenSettings = () => {
    const upstreamOptions = getUpstreamVariableNodeOptions(
      props.id,
      getNodes(),
      getEdges(),
    );
    setNodeOptions(upstreamOptions);
    const defaultNodeId = upstreamOptions[upstreamOptions.length - 1]?.nodeId ?? "";
    setSelectedNodeId(defaultNodeId);
    const vars = getAvailableVariables(
      props.id,
      getNodes(),
      getEdges(),
      latestWorkflowOutputQuery.data?.output,
      defaultNodeId || undefined,
    );
    setAvailableVariables(vars);
    setDialogOpen(true);
  };

  const handleSubmit = (values: ConditionDialogValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== props.id) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            ...values,
          },
        };
      }),
    );
  };

  return (
    <>
      <ConditionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={defaultValues}
        executionStatus={nodeStatus}
        executionOutput={latestExecutionResult?.output ?? ""}
        executionError={latestExecutionResult?.error}
        availableVariables={availableVariables}
        isLoadingVariables={latestWorkflowOutputQuery.isFetching}
        nodeOptions={nodeOptions}
        selectedNodeId={selectedNodeId}
        onSelectedNodeIdChange={setSelectedNodeId}
      />
      <BaseExecutionNode
        status={nodeStatus}
        {...props}
        id={props.id}
        icon="/logos/condition-node.svg"
        // name="Condition If"
        // description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      >
        <BaseHandle id="source-false" type="source" position={Position.Bottom} />
      </BaseExecutionNode>
    </>
  );
});

ConditionNode.displayName = "ConditionNode";