import type { Node } from "@xyflow/react";

type NodeDataWithVariableName = {
  variableName?: unknown;
  varibleName?: unknown;
};

/**
 * Returns a variable name that does not collide with other nodes' variableName / varibleName,
 * by appending 1, 2, … to the base when needed (e.g. setNode → setNode1).
 */
export function getUniqueVariableName(
  desired: string,
  excludeNodeId: string,
  nodes: Node[],
): string {
  const normalized = desired.trim();
  const base = normalized.length > 0 ? normalized : "node";

  const used = new Set<string>();
  for (const node of nodes) {
    if (node.id === excludeNodeId) continue;
    const d = (node.data as NodeDataWithVariableName | undefined) ?? {};
    const v = d.variableName ?? d.varibleName;
    if (typeof v === "string" && v.trim()) used.add(v.trim());
  }

  let candidate = base;
  let n = 1;
  while (used.has(candidate)) {
    candidate = `${base}${n}`;
    n += 1;
  }
  return candidate;
}
