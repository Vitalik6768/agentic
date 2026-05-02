"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { GOOGLE_DOCS_FILE_CHANNEL_NAME } from "@/inngest/channels/google-docs-file";
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import {
  GoogleDocsFileDialog,
  type GoogleDocsFileFormValues,
  type GoogleDocsFileVariableNodeOption,
} from "./dialog";
import { fetchGoogleDocsFileRealtimeToken } from "./actions";
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

type GoogleDocsFileNodeData = {
  variableName?: string;
  varibleName?: string;
  authType?: "OAUTH" | "SERVICE_ACCOUNT";
  credentialId?: string;
  operation?: "CREATE_FILE" | "DELETE_FILE";
  fileName?: string;
  parentFolderId?: string;
  fileId?: string;
};

type GoogleDocsFileNodeType = Node<GoogleDocsFileNodeData>;

const VARIABLE_BASE = "googleDocsFile";

export const GoogleDocsFileNode = memo((props: NodeProps<GoogleDocsFileNodeType>) => {
  const trpc = useTRPC();
  const params = useParams<{ workflowsId?: string }>();
  const workflowId = typeof params.workflowsId === "string" ? params.workflowsId : undefined;
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_DOCS_FILE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleDocsFileRealtimeToken,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableVariables, setAvailableVariables] = useState<AvailableVariable[]>([]);
  const [nodeOptions, setNodeOptions] = useState<GoogleDocsFileVariableNodeOption[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const { setNodes, getNodes, getEdges } = useReactFlow();

  const latestWorkflowOutputQuery = useQuery({
    ...(workflowId
      ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
      : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
    enabled: Boolean(workflowId) && dialogOpen,
  });

  const { data: realtimeMessages } = useInngestSubscription({
    refreshToken: fetchGoogleDocsFileRealtimeToken,
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
        message.channel === GOOGLE_DOCS_FILE_CHANNEL_NAME &&
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
    return getUniqueVariableName(VARIABLE_BASE, props.id, getNodes());
  }, [nodeData?.variableName, nodeData?.varibleName, props.id, getNodes, dialogOpen]);

  const handleSubmit = (values: GoogleDocsFileFormValues) => {
    setNodes((nodes) => {
      const fallbackVariableName = getUniqueVariableName(VARIABLE_BASE, props.id, nodes);
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

  const operation = nodeData?.operation ?? "CREATE_FILE";
  const operationLabel = operation === "CREATE_FILE" ? "Create Doc" : "Delete Doc";
  const fileNamePreview = (nodeData?.fileName ?? "").trim();
  const createHint =
    operation === "CREATE_FILE" && fileNamePreview
      ? fileNamePreview.slice(0, 40) + (fileNamePreview.length > 40 ? "…" : "")
      : null;
  const fileIdPreview = (nodeData?.fileId ?? "").trim();
  const deleteHint =
    operation === "DELETE_FILE" && fileIdPreview ? `id ${fileIdPreview.slice(0, 16)}…` : null;
  const description =
    operation === "DELETE_FILE"
      ? deleteHint
        ? `${operationLabel}: ${deleteHint}`
        : `${operationLabel}`
      : createHint
        ? `${operationLabel}: ${createHint}`
        : `${operationLabel}`;

  const existingVariableName = nodeData?.variableName ?? (nodeData as { varibleName?: string } | undefined)?.varibleName;
  const trimmedVariableName = existingVariableName?.trim() ?? "";

  return (
    <>
      <GoogleDocsFileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{ ...(nodeData as Partial<GoogleDocsFileFormValues>), variableName: suggestedName }}
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
        icon="/logos/google-docs.svg"
        name={trimmedVariableName.length > 0 ? trimmedVariableName : "Google Doc file"}
        description={nodeData?.credentialId ? description : "NOT CONFIGURED"}
        onSettings={handleOpenSettings}
        onDelete={() => undefined}
        onDoubleClick={handleOpenSettings}
        children={<></>}
      />
    </>
  );
});

GoogleDocsFileNode.displayName = "GoogleDocsFileNode";
