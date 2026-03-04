"use client";

import { VariablePickerPanel, type VariablePickerItem } from "@/components/data-transfer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type ImportFromWorkflowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (payload: {
    value: string;
    workflowId: string;
    path: string;
  }) => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const getValueTypeLabel = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
};

const getValuePreview = (value: unknown): string | undefined => {
  if (value === null) return "null";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length > 0 ? `{ ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", ..." : ""} }` : "{}";
  }
  return undefined;
};

const toToken = (path: string, value: unknown): string => {
  const valueType = getValueTypeLabel(value);
  return valueType === "object" || valueType === "array" ? `{{json ${path}}}` : `{{${path}}}`;
};

const tokenToPath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{{") || !trimmed.endsWith("}}")) return trimmed;

  const inner = trimmed.slice(2, -2).trim();
  return inner.startsWith("json ") ? inner.slice(5).trim() : inner;
};

const getValueByPath = (root: unknown, path: string): unknown => {
  if (!path) return root;
  const segments = path.split(".").filter(Boolean);
  let current: unknown = root;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }

    if (isRecord(current)) {
      current = current[segment];
      continue;
    }

    return undefined;
  }

  return current;
};

const toImportString = (value: unknown): string => {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol") return value.description ?? "symbol";
  if (typeof value === "function") return "[function]";
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable object]";
  }
};

const flattenValuePaths = (
  path: string,
  value: unknown,
  depth = 0,
): Array<{ path: string; value: unknown }> => {
  const MAX_DEPTH = 4;
  const MAX_ARRAY_ITEMS = 10;
  const entries: Array<{ path: string; value: unknown }> = [{ path, value }];

  if (depth >= MAX_DEPTH) return entries;

  if (Array.isArray(value)) {
    for (let index = 0; index < Math.min(value.length, MAX_ARRAY_ITEMS); index += 1) {
      entries.push(...flattenValuePaths(`${path}.${index}`, value[index], depth + 1));
    }
    return entries;
  }

  if (isRecord(value)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      entries.push(...flattenValuePaths(`${path}.${key}`, nestedValue, depth + 1));
    }
  }

  return entries;
};

const buildVariableItems = (output: unknown, workflowId: string): VariablePickerItem[] => {
  if (!isRecord(output)) return [];

  const items: VariablePickerItem[] = [];
  const entries = Object.entries(output);

  for (const [rootKey, rootValue] of entries) {
    const flattenedValues = flattenValuePaths(rootKey, rootValue);

    for (const flattened of flattenedValues) {
      items.push({
        key: flattened.path,
        token: toToken(flattened.path, flattened.value),
        nodeId: workflowId,
        nodeType: "Workflow Output",
        variableRoot: rootKey,
        preview: getValuePreview(flattened.value),
        valueType: getValueTypeLabel(flattened.value),
      });
    }
  }

  return items.sort((a, b) => a.key.localeCompare(b.key));
};

export const ImportFromWorkflowDialog = ({
  open,
  onOpenChange,
  onImport,
}: ImportFromWorkflowDialogProps) => {
  const trpc = useTRPC();
  const [workflowId, setWorkflowId] = useState("");
  const [selectedValue, setSelectedValue] = useState("");
  const [selectedPath, setSelectedPath] = useState("");

  const workflowsQuery = useQuery(
    trpc.workflows.getMany.queryOptions({
      page: 1,
      pageSize: 100,
      search: "",
    }),
  );

  const latestOutputQuery = useQuery({
    ...(workflowId
      ? trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId })
      : trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId: "" })),
    enabled: open && Boolean(workflowId),
  });

  const variableItems = useMemo(() => {
    return buildVariableItems(latestOutputQuery.data?.output, workflowId);
  }, [latestOutputQuery.data?.output, workflowId]);

  const handleSelectVariable = (insertedValue: string) => {
    const resolvedPath = tokenToPath(insertedValue);
    const resolvedValue = getValueByPath(latestOutputQuery.data?.output, resolvedPath);
    setSelectedValue(toImportString(resolvedValue));
    setSelectedPath(resolvedPath);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setWorkflowId("");
          setSelectedValue("");
          setSelectedPath("");
        }
      }}
    >
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import from workflow output</DialogTitle>
          <DialogDescription>
            Choose a workflow and pick a variable from its latest execution output.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Workflow</p>
            <Select
              value={workflowId}
              onValueChange={(value) => {
                setWorkflowId(value);
                setSelectedValue("");
                setSelectedPath("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select workflow" />
              </SelectTrigger>
              <SelectContent>
                {(workflowsQuery.data?.items ?? []).map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {workflowsQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading workflows...</p>
            ) : null}
          </div>

          <VariablePickerPanel
            items={variableItems}
            isLoading={latestOutputQuery.isFetching}
            onInsertVariable={handleSelectVariable}
            title="Latest execution variables"
            emptyMessage={
              workflowId
                ? "No variables found in the latest execution output for this workflow."
                : "Select a workflow to load variables from its latest execution."
            }
            className="max-h-[56vh] overflow-hidden"
          />

          {selectedValue ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
              Selected value: <span className="font-mono">{selectedValue}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onImport({
                value: selectedValue,
                workflowId,
                path: selectedPath,
              });
              onOpenChange(false);
            }}
            disabled={!workflowId || !selectedPath}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
