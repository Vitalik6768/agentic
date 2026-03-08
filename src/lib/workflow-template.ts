import { z } from "zod";
import { type Edge, type Node } from "@xyflow/react";
const nodeSchema = z.object({
  id: z.string(),
  type: z.string().nullable().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.string(), z.unknown()).optional(),
});
const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});
export const workflowTemplateSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  exportedAt: z.string(),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});
export type WorkflowTemplate = z.infer<typeof workflowTemplateSchema>;
const SECRET_KEYS = new Set([
  "credentialId",
  "apiKey",
  "token",
  "secret",
  "password",
]);
function sanitizeNodeData(data: Record<string, unknown> | undefined) {
  if (!data) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SECRET_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}
export function buildExportTemplate(args: {
  name: string;
  nodes: Node[];
  edges: Edge[];
}): WorkflowTemplate {
  return {
    version: 1,
    name: args.name,
    exportedAt: new Date().toISOString(),
    nodes: args.nodes.map((n) => ({
      id: n.id,
      type: typeof n.type === "string" ? n.type : null,
      position: n.position,
      data: sanitizeNodeData((n.data ?? {})),
    })),
    edges: args.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  };
}
function newId(prefix: string) {
  // Browser-safe simple ID. Replace with createId() if you prefer.
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
export function buildImportGraph(
  raw: unknown,
): { nodes: Node[]; edges: Edge[]; templateName: string } {
  const parsed = workflowTemplateSchema.parse(raw);
  const idMap = new Map<string, string>();
  for (const n of parsed.nodes) {
    idMap.set(n.id, newId("node"));
  }
  const nodes: Node[] = parsed.nodes.map((n) => ({
    id: idMap.get(n.id)!,
    type: n.type ?? undefined,
    position: n.position,
    data: {
      ...(n.data ?? {}),
      // Force user to re-select secrets on imported template
      credentialId: "",
    },
  }));
  const edges: Edge[] = parsed.edges
    .map((e) => {
      const source = idMap.get(e.source);
      const target = idMap.get(e.target);
      if (!source || !target) return null;
      return {
        id: newId("edge"),
        source,
        target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
        type: "smoothstep",
      } as Edge;
    })
    .filter((e): e is Edge => Boolean(e));
  return { nodes, edges, templateName: parsed.name };
}