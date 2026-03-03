"use client";

import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { cn } from "@/lib/utils";

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
};

export const ExecutionOutputPanel = ({
  executionStatus = "initial",
  executionOutput = "",
  executionError,
  idleMessage = "Execute this workflow to view the latest node output here.",
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
    <DataTransferPanel title="Execution Output" subtitle={subtitle}>
      {executionStatus === "success" && executionOutput ? (
        <pre className="max-h-[420px] overflow-auto rounded-md bg-background p-3 font-mono text-xs whitespace-pre-wrap">
          {executionOutput}
        </pre>
      ) : executionStatus === "error" ? (
        <pre className="max-h-[420px] overflow-auto rounded-md bg-background p-3 font-mono text-xs whitespace-pre-wrap text-red-500">
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
