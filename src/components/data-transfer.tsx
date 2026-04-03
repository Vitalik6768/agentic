"use client";

import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { cn } from "@/lib/utils";
import { NodeTypeIcon } from "@/lib/node-type-icon";
import { Loader2, Search } from "lucide-react";
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
  value?: unknown;
  preview?: string;
  valueType: string;
};

export type VariablePickerNodeOption = {
  nodeId: string;
  nodeType: string;
  flowNodeType?: string;
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
  const [activeTab, setActiveTab] = useState<"schema" | "json">("schema");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setInsertMode("token");
    setActiveTab("schema");
    setQuery("");
  }, [resetModeKey]);

  const filteredItems =
    query.trim().length === 0
      ? items
      : items.filter((item) => {
          const q = query.trim().toLowerCase();
          return (
            item.key.toLowerCase().includes(q) ||
            item.token.toLowerCase().includes(q) ||
            item.nodeType.toLowerCase().includes(q) ||
            item.valueType.toLowerCase().includes(q)
          );
        });

  const selectedRootKey =
    selectedNodeId && nodeOptions.length > 0
      ? nodeOptions.find((o) => o.nodeId === selectedNodeId)?.variableRoot
      : items[0]?.variableRoot;
  const selectedRootItem = selectedRootKey
    ? items.find((i) => i.key === selectedRootKey) ?? null
    : null;

  return (
    <DataTransferPanel title={title} subtitle={`${items.length} variables`} className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-8 w-[140px] rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[180px]"
          />
        </div>

        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
          <button
            type="button"
            className={cn(
              "cursor-pointer rounded px-3 py-1 text-xs",
              activeTab === "schema" ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:bg-background/60"
            )}
            onClick={() => setActiveTab("schema")}
          >
            Schema
          </button>
          <button
            type="button"
            className={cn(
              "cursor-pointer rounded px-3 py-1 text-xs",
              activeTab === "json" ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:bg-background/60"
            )}
            onClick={() => setActiveTab("json")}
          >
            JSON
          </button>
        </div>
      </div>
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
                  <span className="flex items-center gap-2">
                    <NodeTypeIcon flowNodeType={option.flowNodeType} className="size-4" />
                    <span className="truncate">
                      {option.variableRoot} ({option.nodeType})
                    </span>
                  </span>
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
        activeTab === "json" ? (
          <RootJsonPanel
            selectedRootItem={selectedRootItem}
            onInsertVariable={onInsertVariable}
            allowPathMode={allowPathMode}
            insertMode={insertMode}
          />
        ) : (
          <div className="max-h-[52vh] overflow-auto rounded-md border bg-background p-2">
            <div className="mb-2 text-[11px] text-muted-foreground">
              {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
            </div>
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={`${item.nodeId}-${item.key}`}
                  type="button"
                  className="w-full rounded-md border bg-background p-2 text-left hover:bg-accent"
                  onClick={() => {
                    const insertValue =
                      allowPathMode && insertMode === "path" ? item.key : item.token;
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
          </div>
        )
      ) : (
        <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </DataTransferPanel>
  );
};

const RootJsonPanel = ({
  selectedRootItem,
  onInsertVariable,
  allowPathMode,
  insertMode,
}: {
  selectedRootItem: VariablePickerItem | null;
  onInsertVariable: (value: string) => void;
  allowPathMode: boolean;
  insertMode: "token" | "path";
}) => {
  if (selectedRootItem?.value === undefined) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
        No runtime value available yet. Execute the workflow to populate outputs.
      </div>
    );
  }

  const rootKey = selectedRootItem.key;
  const rootValue = selectedRootItem.value;

  return (
    <div className="max-h-[52vh] overflow-auto rounded-md border bg-background p-3">
      <JsonTreeNode
        name={rootKey}
        value={rootValue}
        depth={0}
        mode="json"
        path={rootKey}
        onPickPath={(pickedPath, pickedValue) => {
          const insertValue =
            allowPathMode && insertMode === "path"
              ? pickedPath
              : toToken(pickedPath, pickedValue);
          onInsertVariable(insertValue);
        }}
      />
    </div>
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const getValueType = (value: unknown): "string" | "number" | "boolean" | "object" | "array" | "null" => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
};

const toToken = (path: string, value: unknown) => {
  const type = getValueType(value);
  return type === "object" || type === "array" ? `{{json ${path}}}` : `{{${path}}}`;
};

const getSchemaLabel = (value: unknown) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return typeof value;
};

const JsonTreeNode = ({
  name,
  value,
  depth,
  mode,
  path,
  onPickPath,
}: {
  name: string;
  value: unknown;
  depth: number;
  mode: "schema" | "json";
  path: string;
  onPickPath: (path: string, value: unknown) => void;
}) => {
  const [open, setOpen] = useState(depth < 1);

  const isObj = isRecord(value);
  const isArr = Array.isArray(value);
  const isExpandable = isObj || isArr;

  const entries: Array<[string, unknown]> = isArr
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : isObj
      ? Object.entries(value)
      : [];

  const labelValue = !isExpandable
    ? mode === "schema"
      ? getSchemaLabel(value)
      : JSON.stringify(value)
    : mode === "schema"
      ? `${isArr ? "array" : "object"} (${entries.length})`
      : `${isArr ? "Array" : "Object"}(${entries.length})`;

  return (
    <div className="font-mono text-xs">
      <div
        className={cn(
          "flex items-start gap-2 rounded px-1 py-0.5",
          "hover:bg-muted/40",
          isExpandable ? "cursor-pointer" : "cursor-default"
        )}
        style={{ paddingLeft: depth * 12 }}
        onClick={() => {
          if (isExpandable) setOpen((v) => !v);
        }}
      >
        <button
          type="button"
          className={cn(
            "w-4 select-none text-muted-foreground",
            isExpandable ? "cursor-pointer" : "cursor-default"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (isExpandable) setOpen((v) => !v);
          }}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {isExpandable ? (open ? "▾" : "▸") : ""}
        </button>
        <button
          type="button"
          className="cursor-pointer text-left text-foreground hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onPickPath(path, value);
          }}
          title={`Insert ${path}`}
        >
          {name}
        </button>
        <span className="text-muted-foreground">:</span>
        <span className={isExpandable ? "text-muted-foreground" : "text-foreground"}>{labelValue}</span>
      </div>

      {isExpandable && open ? (
        <div className="mt-1">
          {entries.length === 0 ? (
            <div className="text-muted-foreground" style={{ paddingLeft: (depth + 1) * 12 }}>
              (empty)
            </div>
          ) : (
            entries.map(([k, v]) => (
              <JsonTreeNode
                key={`${name}.${k}`}
                name={k}
                value={v}
                depth={depth + 1}
                mode={mode}
                path={isArr ? `${path}.${k}` : `${path}.${k}`}
                onPickPath={onPickPath}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};
