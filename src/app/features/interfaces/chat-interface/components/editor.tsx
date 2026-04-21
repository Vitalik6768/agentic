"use client";

import { ErrorView, LoadingView } from "@/components/entity-components";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTRPC } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { useChatTriggerWorkflows, useSaveChatInterfaceSettings, useSendChatMessage, useSuspenseChatInterface } from "../hooks/use-chat-interface";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  isLoading?: boolean;
};

const toId = () => crypto.randomUUID();

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const toSafeString = (value: unknown): string => {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserializable]";
  }
};

const formatWorkflowOutput = (output: unknown): string => {
  // Prefer a single "final" value from the execution output, without coupling
  // chat rendering to any specific node type (agent, openrouter, etc).
  if (isRecord(output)) {
    const explicitFinal = output.finalResult;
    if (typeof explicitFinal === "string" && explicitFinal.trim().length > 0) {
      return explicitFinal;
    }

    const excludedKeys = new Set([
      "meta",
      "chat",
      "telegram",
      "webhook",
      "schedule",
      "loop",
      "condition",
    ]);

    const candidateEntries = Object.entries(output).filter(([key, value]) => {
      if (excludedKeys.has(key)) return false;
      if (value === undefined) return false;
      return true;
    });

    // If there's exactly one meaningful top-level value, show it.
    if (candidateEntries.length === 1) {
      const onlyValue = candidateEntries[0]?.[1];
      if (typeof onlyValue === "string") return onlyValue;
      try {
        return JSON.stringify(onlyValue ?? null, null, 2);
      } catch {
        return toSafeString(onlyValue);
      }
    }

    // If there are multiple, prefer a single string value (common for final node outputs).
    const stringCandidates = candidateEntries.filter(([, value]) => typeof value === "string");
    if (stringCandidates.length === 1) {
      return stringCandidates[0]![1] as string;
    }
  }

  try {
    return typeof output === "string" ? output : JSON.stringify(output ?? null, null, 2);
  } catch {
    return toSafeString(output);
  }
};

export const ChatInterfaceEditorLoading = () => {
  return <LoadingView message="Loading chat interface..." />;
};

export const ChatInterfaceEditorError = () => {
  return <ErrorView message="Error loading chat interface..." />;
};

export function Editor({ interfaceId }: { interfaceId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: chatInterface } = useSuspenseChatInterface(interfaceId);
  const workflowsQuery = useChatTriggerWorkflows();
  const saveSettings = useSaveChatInterfaceSettings();
  const sendMessage = useSendChatMessage();

  const initialWorkflowId = (chatInterface.settings as { workflowId?: string } | undefined)?.workflowId ?? "";
  const [workflowId, setWorkflowId] = useState(initialWorkflowId);
  const [messages, setMessages] = useState<UiMessage[]>(() => [
    {
      id: toId(),
      role: "assistant",
      content: "Select a workflow (with Chat Trigger) and send a message to start it.",
      createdAt: new Date(),
    },
  ]);

  const isBusy = sendMessage.isPending;
  const latestExecutionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setWorkflowId(initialWorkflowId);
  }, [initialWorkflowId]);

  const selectedWorkflow = useMemo(() => {
    return (workflowsQuery.data?.items ?? []).find((item) => item.id === workflowId) ?? null;
  }, [workflowId, workflowsQuery.data?.items]);

  const handleSave = async () => {
    await saveSettings.mutateAsync({
      id: interfaceId,
      settings: {
        workflowId: workflowId || undefined,
      },
    });
  };

  const handleSend = async (text: string) => {
    if (!workflowId) return;

    const userMessage: UiMessage = {
      id: toId(),
      role: "user",
      content: text,
      createdAt: new Date(),
    };

    const assistantPlaceholder: UiMessage = {
      id: toId(),
      role: "assistant",
      content: "Running workflow...",
      createdAt: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);

    const latestBefore = await queryClient.fetchQuery(
      trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId }),
    );
    latestExecutionIdRef.current = latestBefore?.id ?? null;
    const latestBeforeStartedAt = latestBefore?.startedAt
      ? new Date(latestBefore.startedAt).getTime()
      : null;

    await sendMessage.mutateAsync({
      interfaceId,
      workflowId,
      message: text,
    });

    // Poll until we see a new execution record, then wait until it completes
    // (so we actually have a final output to display).
    const start = Date.now();
    const timeoutMs = 45_000;
    const intervalMs = 1_000;
    let nextOutput = latestBefore;
    let detectedExecutionId: string | null = null;

    while (Date.now() - start < timeoutMs) {
       
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
       
      const latest = await queryClient.fetchQuery(
        trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId }),
      );

      const latestId = latest?.id ?? null;
      const latestStartedAt = latest?.startedAt ? new Date(latest.startedAt).getTime() : null;
      const isNewExecution =
        Boolean(latestId) &&
        (latestId !== latestExecutionIdRef.current ||
          (latestBeforeStartedAt !== null &&
            latestStartedAt !== null &&
            latestStartedAt > latestBeforeStartedAt));

      if (!detectedExecutionId) {
        if (isNewExecution && latestId) {
          detectedExecutionId = latestId;
          latestExecutionIdRef.current = latestId;
          nextOutput = latest;
        }
        continue;
      }

      // Once we know which execution we're waiting for, keep polling until it finishes.
      if (latestId === detectedExecutionId && latest) {
        nextOutput = latest;
        if (latest.status !== "RUNNING") {
          break;
        }
      }
    }

    const content =
      detectedExecutionId && nextOutput?.id === detectedExecutionId && nextOutput.status !== "RUNNING"
        ? formatWorkflowOutput(nextOutput.output)
        : "Workflow started, but the final output wasn’t ready yet. Check Executions for results.";

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantPlaceholder.id
          ? {
              ...msg,
              content,
              isLoading: false,
            }
          : msg,
      ),
    );
  };

  return (
    <div className="h-full space-y-4">
      <Card className="flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-sm">
        <div className="border-b bg-muted/20">
          <div className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold leading-none tracking-tight">{chatInterface.name}</h2>
              <p className="text-xs text-muted-foreground">Connect this chat to a workflow that contains a Chat Trigger node.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => void handleSave()} disabled={saveSettings.isPending}>
                {saveSettings.isPending ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-4" />
                )}
                Save
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
            <div className="min-w-[260px] space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Workflow</p>
              <Select value={workflowId} onValueChange={setWorkflowId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select workflow (Chat Trigger)" />
                </SelectTrigger>
                <SelectContent>
                  {(workflowsQuery.data?.items ?? []).map((wf) => (
                    <SelectItem key={wf.id} value={wf.id}>
                      {wf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {workflowsQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading workflows...</p> : null}
            </div>

            {selectedWorkflow ? (
              <div className="rounded-lg border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                Status: {selectedWorkflow.published ? "published" : "draft"}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatHeader />
          <div className="flex-1 overflow-auto">
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m.isLoading ? m.content : m.content}
                isUser={m.role === "user"}
                timestamp={m.createdAt}
              />
            ))}
          </div>
          <ChatInput onSendMessage={(msg) => void handleSend(msg)} isLoading={isBusy} disabled={!workflowId} />
        </div>
      </Card>
    </div>
  );
}

