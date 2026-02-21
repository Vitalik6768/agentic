"use client";

import { ErrorView, LoadingView } from "@/components/entity-components";
// import { useSuspenseWorkflow } from "@/app/features/workflows/hooks/use-workflows";
import '@xyflow/react/dist/style.css';
import { NodeType } from "generated/prisma";
import { useCallback, useMemo, useState } from "react";
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, type Connection, Controls, type Edge, type EdgeChange, MiniMap, type Node, type NodeChange, Panel, Position, ReactFlow } from "@xyflow/react";
import { useSuspenseWorkflow } from "../../workflows/hooks/use-workflows";
import { useSetAtom } from "jotai";
import { editorAtom } from "../store/atoms";
import { nodeComponents } from "@/config/node-components";
import { AddNodeButton } from "./add-node-button";
import { ExecuteWorkflowButton } from "./execute-workflow-button";
// import { nodeComponents } from "@/config/node-components";
// import { AddNodeButton } from "./add-node-button";
// import { useSetAtom } from "jotai";
// import { editorAtom } from "../store/atoms";
// import { ExecuteWorkflowButton } from "./execute-workflow-button";
// import { useSuspenseWorkflow } from "@/app/features/workflows/hooks/use-workflows";

export const EditorLoading = () => {
    return (
        <LoadingView message="Loading Editor..." />
    )
}

export const EditorError = () => {
    return (
        <ErrorView message="Error Loading Editor..." />
    )
}



export const Editor = ({ workflowId }: { workflowId: string }) => {
    const { data: workflow } = useSuspenseWorkflow(workflowId);

    const [nodes, setNodes] = useState<Node[]>(workflow?.nodes || []);
    const [edges, setEdges] = useState<Edge[]>(workflow?.edges || []);

    const setEditor = useSetAtom(editorAtom);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
        [],
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
        [],
    );
    const onConnect = useCallback(
        (params: Connection) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
        [],
    );
    const hasManualTrigger = useMemo(() => {
        return nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER);
    }, [nodes]);


    function setSelectorOpen(arg0: boolean) {
        throw new Error("Function not implemented.");
    }

    return (
        <div className="size-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeComponents}
                onInit={setEditor}
                fitView
                snapGrid={[10, 10]}
                snapToGrid={true}
                panOnScroll
                panOnDrag={[1]}
                selectionOnDrag
            >
                <Background />
                <Controls />
                <MiniMap />
                <Panel position="top-right">
                    <AddNodeButton onClick={() => { setSelectorOpen(true); }} />
                </Panel>
                {hasManualTrigger && (
                    <Panel position="bottom-center">
                        <ExecuteWorkflowButton workflow={workflowId} />
                    </Panel>
                )}
            </ReactFlow>



        </div>

    )
}