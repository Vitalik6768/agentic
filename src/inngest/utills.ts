import { type Node } from "@xyflow/react";
import { inngest } from "./client";
import topoSort from "toposort";
import { createId } from "@paralleldrive/cuid2";
import type { Connection } from "generated/prisma";

export const topologicalSort = (
    nodes:Node[],
    connections:Connection[],

): Node[] => {
    if(connections.length === 0) {
        return nodes;
    }

    const edges:[string,string][] = connections.map((connection) => 
        [connection.fromNodeId, connection.toNodeId]);

    let sortedNodesIds:string[];
    try {
        sortedNodesIds = topoSort(edges);
        sortedNodesIds = [...new Set(sortedNodesIds)];
    } catch (error) {
        if(error instanceof Error && error.message.includes("Cycle detected")) {
            throw new Error("Circular dependency detected in workflow");
        }
        throw error;
    }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  // `toposort` only returns nodes referenced in edges. Append any remaining nodes
  // (including totally-disconnected nodes) to keep a stable total ordering without
  // introducing artificial self-cycles.
  const sortedSet = new Set(sortedNodesIds);
  const remainingNodeIds = nodes.map((n) => n.id).filter((id) => !sortedSet.has(id));
  const finalNodeIds = [...sortedNodesIds, ...remainingNodeIds];

  return finalNodeIds
    .map((nodeId) => nodeMap.get(nodeId)!)
    .filter(Boolean);
};


export const sendWorkflowExecution = async (data: {
    workflowId: string;
    userId: string;
    initialData?: Record<string, unknown>;
    startNodeId?: string;
    startNodeIds?: string[];
}) => {
    console.log("sending workflow execution", data.workflowId);
  const { workflowId, ...rest } = data;
  return inngest.send({
    name: "workflow/execute.workflow",
    data: {
      id: workflowId,
      ...rest,
    },
    id: createId(),
  });
}