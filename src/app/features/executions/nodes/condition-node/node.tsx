"use client";

import { BaseHandle } from "@/components/react-flow/base-handle";
import { type Node, type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { memo, useEffect, useMemo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { CONDITION_NODE_CHANNEL_NAME } from "@/inngest/channels/condition-node";
import { fetchConditionNodeRealtimeToken } from "./actions";
import { ConditionNodeDialog, type ConditionDialogValues } from "./dialog";
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
import { getUniqueVariableName } from "@/lib/unique-variable-name";

type ConditionNodeData = {
  variableName?: string;
  varibleName?: string;
  conditions?: Array<{
    left?: string;
    operator?: "eq" | "ne" | "gt" | "gte" | "lt" | "lte";
    right?: string;
  }>;
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

  const nodeData = props.data;
  const description = nodeData?.expression?.trim()
    ? nodeData.expression
    : "IF condition";

  const CONDITION_VARIABLE_BASE = "condition";
  const suggestedName = useMemo(() => {
    const existingCandidate = nodeData?.variableName ?? nodeData?.varibleName;
    const trimmed = typeof existingCandidate === "string" ? existingCandidate.trim() : "";
    if (trimmed) return trimmed;
    return getUniqueVariableName(CONDITION_VARIABLE_BASE, props.id, getNodes());
  }, [nodeData?.variableName, nodeData?.varibleName, props.id, getNodes, dialogOpen]);

  const defaultValues: Partial<ConditionDialogValues> = {
    variableName: nodeData?.variableName ?? nodeData?.varibleName,
    conditions: nodeData?.conditions?.map((c) => ({
      left: c.left ?? "",
      operator: c.operator ?? "eq",
      right: c.right ?? "",
    })),
    expression: nodeData?.expression,
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
    setNodes((nodes) => {
      const fallbackVariableName = getUniqueVariableName(
        CONDITION_VARIABLE_BASE,
        props.id,
        nodes,
      );
      const nextVariableName = getUniqueVariableName(
        values.variableName.trim() || fallbackVariableName,
        props.id,
        nodes,
      );

      return nodes.map((node) => {
        if (node.id !== props.id) return node;
        return {
          ...node,
          data: {
            ...node.data,
            ...values,
            variableName: nextVariableName,
            varibleName: nextVariableName,
          },
        };
      });
    });
  };

  const existingVariableName =
    nodeData?.variableName ?? (nodeData as { varibleName?: string } | undefined)?.varibleName;
  const trimmedVariableName = existingVariableName?.trim() ?? "";

  return (
    <>
      <ConditionNodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{ ...defaultValues, variableName: suggestedName }}
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
        name={trimmedVariableName.length > 0 ? trimmedVariableName : "Condition"}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      >
        <BaseHandle id="source-false" type="source" position={Position.Bottom} />
      </BaseExecutionNode>
    </>
  );
});

ConditionNode.displayName = "ConditionNode";