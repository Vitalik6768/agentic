"use client";

import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";

type DataTransferPanelProps = {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export const DataTransferPanel = ({
  title,
  subtitle,
  children,
  className,
}: DataTransferPanelProps) => {
  return (
    <div className={cn("rounded-md border bg-muted/30 p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle ? (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
};

type ExecutionOutputPanelProps = {
  executionStatus?: NodeStatus;
  executionOutput?: string;
  executionError?: string;
  idleMessage?: string;
  className?: string;
  outputClassName?: string;
};

export const ExecutionOutputPanel = ({
  executionStatus = "initial",
  executionOutput = "",
  executionError,
  idleMessage = "Execute this workflow to view the latest node output here.",
  className,
  outputClassName,
}: ExecutionOutputPanelProps) => {
  const subtitle =
    executionStatus === "loading"
      ? "Running..."
      : executionStatus === "success"
        ? "Completed"
        : executionStatus === "error"
          ? "Failed"
          : "Idle";

  return (
    <DataTransferPanel title="Execution Output" subtitle={subtitle} className={className}>
      {executionStatus === "success" && executionOutput ? (
        <pre className={cn("max-h-[52vh] overflow-auto rounded-md bg-background p-3 font-mono text-xs whitespace-pre-wrap", outputClassName)}>
          {executionOutput}
        </pre>
      ) : executionStatus === "error" ? (
        <pre className={cn("max-h-[52vh] overflow-auto rounded-md bg-background p-3 font-mono text-xs whitespace-pre-wrap text-red-500", outputClassName)}>
          {executionError ?? "Execution failed"}
        </pre>
      ) : (
        <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
          {idleMessage}
        </div>
      )}
    </DataTransferPanel>
  );
};

export type VariablePickerItem = {
  key: string;
  token: string;
  nodeId: string;
  nodeType: string;
  variableRoot: string;
  preview?: string;
  valueType: string;
};

export type VariablePickerNodeOption = {
  nodeId: string;
  nodeType: string;
  variableRoot: string;
};

type VariablePickerPanelProps = {
  items: VariablePickerItem[];
  isLoading?: boolean;
  nodeOptions?: VariablePickerNodeOption[];
  selectedNodeId?: string;
  onSelectedNodeIdChange?: (nodeId: string) => void;
  onInsertVariable: (value: string) => void;
  title?: string;
  emptyMessage?: string;
  className?: string;
  allowPathMode?: boolean;
  resetModeKey?: string | number | boolean;
};

export const VariablePickerPanel = ({
  items,
  isLoading = false,
  nodeOptions = [],
  selectedNodeId,
  onSelectedNodeIdChange,
  onInsertVariable,
  title = "Previous Nodes Output",
  emptyMessage = "No upstream variables found. Configure previous nodes with a variable name first.",
  className,
  allowPathMode = false,
  resetModeKey,
}: VariablePickerPanelProps) => {
  const [insertMode, setInsertMode] = useState<"token" | "path">("token");

  useEffect(() => {
    setInsertMode("token");
  }, [resetModeKey]);

  return (
    <DataTransferPanel title={title} subtitle={`${items.length} variables`} className={className}>
      {nodeOptions.length > 0 ? (
        <div className="mb-3">
          <Select
            value={selectedNodeId}
            onValueChange={onSelectedNodeIdChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select source node" />
            </SelectTrigger>
            <SelectContent>
              {nodeOptions.map((option) => (
                <SelectItem key={option.nodeId} value={option.nodeId}>
                  {option.variableRoot} ({option.nodeType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {allowPathMode ? (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Insert as</span>
          <Button
            type="button"
            size="xs"
            variant={insertMode === "token" ? "secondary" : "outline"}
            onClick={() => setInsertMode("token")}
          >
            Token
          </Button>
          <Button
            type="button"
            size="xs"
            variant={insertMode === "path" ? "secondary" : "outline"}
            onClick={() => setInsertMode("path")}
          >
            Path
          </Button>
        </div>
      ) : null}
      {isLoading ? (
        <div className="flex min-h-[180px] items-center justify-center gap-2 rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading variables...
        </div>
      ) : items.length > 0 ? (
        <div className="max-h-[52vh] space-y-2 overflow-auto">
          {items.map((item) => (
            <button
              key={`${item.nodeId}-${item.key}`}
              type="button"
              className="w-full rounded-md border bg-background p-2 text-left hover:bg-accent"
              onClick={() => {
                const insertValue =
                  allowPathMode && insertMode === "path"
                    ? item.token.replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "")
                    : item.token;
                onInsertVariable(insertValue);
              }}
            >
              <p className="font-mono text-xs">{item.token}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.key}</p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{item.nodeType}</span>
                <span>{item.valueType}</span>
              </div>
              {item.preview ? (
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {item.preview}
                </p>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </DataTransferPanel>
  );
};
