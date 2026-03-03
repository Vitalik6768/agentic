import type { Edge, Node } from "@xyflow/react";

const MAX_NESTED_DEPTH = 4;
const MAX_ARRAY_ITEMS = 10;

type NodeDataWithVariableName = {
  variableName?: unknown;
  varibleName?: unknown;
};

export type PickerValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null";

export type AvailableVariable = {
  key: string;
  token: string;
  nodeId: string;
  nodeType: string;
  variableRoot: string;
  preview?: string;
  valueType: PickerValueType;
};

export type UpstreamVariableNodeOption = {
  nodeId: string;
  nodeType: string;
  variableRoot: string;
};

const getNodeTypeLabel = (type: string | undefined) => {
  if (!type) return "Unknown";
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const collectUpstreamNodeIds = (currentNodeId: string, edges: Edge[]) => {
  const upstreamIds = new Set<string>();
  const queue: string[] = [currentNodeId];

  while (queue.length > 0) {
    const targetId = queue.shift();
    if (!targetId) continue;

    const incomingEdges = edges.filter((edge) => edge.target === targetId);
    for (const edge of incomingEdges) {
      if (upstreamIds.has(edge.source)) continue;
      upstreamIds.add(edge.source);
      queue.push(edge.source);
    }
  }

  return upstreamIds;
};

const getUpstreamVariables = (currentNodeId: string, nodes: Node[], edges: Edge[]) => {
  const upstreamIds = collectUpstreamNodeIds(currentNodeId, edges);
  const variableMap = new Map<string, { nodeId: string; nodeType: string }>();

  for (const node of nodes) {
    if (!upstreamIds.has(node.id)) continue;
    const nodeData = (node.data as NodeDataWithVariableName | undefined) ?? {};
    const candidate = nodeData.variableName ?? nodeData.varibleName;
    if (typeof candidate !== "string" || !candidate.trim()) continue;

    const key = candidate.trim();
    if (variableMap.has(key)) continue;

    variableMap.set(key, {
      nodeId: node.id,
      nodeType: getNodeTypeLabel(typeof node.type === "string" ? node.type : undefined),
    });
  }

  return variableMap;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const getValueType = (value: unknown): PickerValueType => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
};

const getPreview = (value: unknown) => {
  if (value === null) return "null";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === "object") {
    try {
      const keys = Object.keys(value as Record<string, unknown>);
      return keys.length > 0 ? `{ ${keys.slice(0, 4).join(", ")}${keys.length > 4 ? ", ..." : ""} }` : "{}";
    } catch {
      return "{...}";
    }
  }
  return "";
};

const toToken = (path: string, value: unknown) => {
  const type = getValueType(value);
  return type === "object" || type === "array" ? `{{json ${path}}}` : `{{${path}}}`;
};

const flattenValuePaths = (
  path: string,
  value: unknown,
  depth = 0,
): Array<{ path: string; value: unknown }> => {
  const entries: Array<{ path: string; value: unknown }> = [{ path, value }];
  if (depth >= MAX_NESTED_DEPTH) return entries;

  if (Array.isArray(value)) {
    for (let i = 0; i < Math.min(value.length, MAX_ARRAY_ITEMS); i += 1) {
      entries.push(...flattenValuePaths(`${path}.${i}`, value[i], depth + 1));
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

export const getAvailableVariables = (
  currentNodeId: string,
  nodes: Node[],
  edges: Edge[],
  executionOutput: unknown,
  selectedNodeId?: string,
): AvailableVariable[] => {
  const upstreamMap = getUpstreamVariables(currentNodeId, nodes, edges);
  const context = isRecord(executionOutput) ? executionOutput : null;
  const variables: AvailableVariable[] = [];

  for (const [key, sourceMeta] of upstreamMap.entries()) {
    if (selectedNodeId && sourceMeta.nodeId !== selectedNodeId) {
      continue;
    }
    const runtimeValue = context?.[key];
    const paths =
      runtimeValue === undefined
        ? [{ path: key, value: undefined }]
        : flattenValuePaths(key, runtimeValue);

    for (const item of paths) {
      variables.push({
        key: item.path,
        token: toToken(item.path, item.value),
        nodeId: sourceMeta.nodeId,
        nodeType: sourceMeta.nodeType,
        variableRoot: key,
        preview: getPreview(item.value),
        valueType: getValueType(item.value),
      });
    }
  }

  return variables.sort((a, b) => a.key.localeCompare(b.key));
};

export const getUpstreamVariableNodeOptions = (
  currentNodeId: string,
  nodes: Node[],
  edges: Edge[],
): UpstreamVariableNodeOption[] => {
  const upstreamMap = getUpstreamVariables(currentNodeId, nodes, edges);
  return Array.from(upstreamMap.entries())
    .map(([variableRoot, meta]) => ({
      nodeId: meta.nodeId,
      nodeType: meta.nodeType,
      variableRoot,
    }))
    .sort((a, b) => a.variableRoot.localeCompare(b.variableRoot));
};
