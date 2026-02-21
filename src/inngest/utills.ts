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

    const connectedNodeIds = new Set<string>();
    for(const conn of connections) {
        connectedNodeIds.add(conn.fromNodeId);
        connectedNodeIds.add(conn.toNodeId);
    }

    for(const node of nodes) {
        if(!connectedNodeIds.has(node.id)) {
            edges.push([node.id, node.id]);
        }
    }

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
  return sortedNodesIds.map((nodeId) => nodeMap.get(nodeId)!)
  .filter(Boolean);
};


export const sendWorkflowExecution = async (data: {
    workflowId: string;
    userId: string;
    initialData?: Record<string, unknown>;
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