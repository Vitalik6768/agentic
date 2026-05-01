"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { GOOGLE_SHEET_CHANNEL_NAME } from "@/inngest/channels/google-sheet";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { GoogleSheetDialog, type GoogleSheetFormValues, type GoogleSheetVariableNodeOption } from "./dialog";
import { fetchGoogleSheetRealtimeToken } from "./actions";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  getAvailableVariables,
  getUpstreamVariableNodeOptions,
  type AvailableVariable,
} from "@/lib/variable-picker";
import { getUniqueVariableName } from "@/lib/unique-variable-name";

type GoogleSheetNodeData = {
  variableName?: string;
  varibleName?: string;
  authType?: "OAUTH" | "SERVICE_ACCOUNT";
  credentialId?: string;
  spreadsheetId?: string;
  sheetName?: string;
  range?: string;
  operation?: "GET_ROWS" | "APPEND_ROWS" | "UPDATE_RANGE";
  valueInputOption?: "RAW" | "USER_ENTERED";
  valuesJson?: string;
};

type GoogleSheetNodeType = Node<GoogleSheetNodeData>;

const GOOGLE_SHEET_VARIABLE_BASE = "googleSheet";

export const GoogleSheetNode = memo((props: NodeProps<GoogleSheetNodeType>) => {
  const trpc = useTRPC();
  const params = useParams<{ workflowsId?: string }>();
  const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_SHEET_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleSheetRealtimeToken,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
  const [nodeOptions, setNodeOptions] = useState<GoogleSheetVariableNodeOption[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const { setNodes, getNodes, getEdges } = useReactFlow();

  const latestWorkflowOutputQuery = useQuery({
    ...(workflowId
      ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
      : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
    enabled: Boolean(workflowId) && dialogOpen,
  });

  const { data: realtimeMessages } = useInngestSubscription({
    refreshToken: fetchGoogleSheetRealtimeToken,
    enabled: true,
  });

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

  const latestResultMessage = realtimeMessages
    .filter(
      (message) =>
        message.kind === "data" &&
        message.channel === GOOGLE_SHEET_CHANNEL_NAME &&
        message.topic === "result" &&
        (message.data as { nodeId: string }).nodeId === props.id,
    )
    .sort((a, b) => {
      if (a.kind === "data" && b.kind === "data") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    })[0];

  const latestExecutionResult =
    latestResultMessage?.kind === "data"
      ? (latestResultMessage.data as { status: "success" | "error"; output?: string; error?: string })
      : null;

  const handleOpenSettings = () => {
    const upstreamOptions = getUpstreamVariableNodeOptions(props.id, getNodes(), getEdges());
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

  const nodeData = props.data;
  const suggestedName = useMemo(() => {
    const existingCandidate = nodeData?.variableName ?? nodeData?.varibleName;
    const trimmed = typeof existingCandidate === "string" ? existingCandidate.trim() : "";
    if (trimmed) return trimmed;
    return getUniqueVariableName(GOOGLE_SHEET_VARIABLE_BASE, props.id, getNodes());
  }, [nodeData?.variableName, nodeData?.varibleName, props.id, getNodes, dialogOpen]);

  const handleSubmit = (values: GoogleSheetFormValues) => {
    setNodes((nodes) => {
      const fallbackVariableName = getUniqueVariableName(GOOGLE_SHEET_VARIABLE_BASE, props.id, nodes);
      const nextVariableName = getUniqueVariableName(values.variableName.trim() || fallbackVariableName, props.id, nodes);
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

  const operation = nodeData?.operation ?? "GET_ROWS";
  const operationLabel =
    operation === "GET_ROWS" ? "Get rows" : operation === "APPEND_ROWS" ? "Append rows" : "Update range";
  const description =
    nodeData?.spreadsheetId && nodeData?.sheetName
      ? `${operationLabel}: ${nodeData.sheetName}`
      : "NOT CONFIGURED";

  const existingVariableName = nodeData?.variableName ?? (nodeData as { varibleName?: string } | undefined)?.varibleName;
  const trimmedVariableName = existingVariableName?.trim() ?? "";

  return (
    <>
      <GoogleSheetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{ ...(nodeData as Partial<GoogleSheetFormValues>), variableName: suggestedName }}
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
        icon="/logos/google-sheets.svg"
        name={trimmedVariableName.length > 0 ? trimmedVariableName : "Google Sheets"}
        description={description}
        onSettings={handleOpenSettings}
        onDelete={() => undefined}
        onDoubleClick={handleOpenSettings}
        children={<></>}
      />
    </>
  );
});

GoogleSheetNode.displayName = "GoogleSheetNode";

