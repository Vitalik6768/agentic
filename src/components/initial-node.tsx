"use client";

import { memo, useState } from "react";
import { PlaceholderNode } from "./react-flow/placeholder-node";
import { PlusIcon } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { NodeSelector } from "./node-selector";
import { WorkflowNode } from "./react-flow/workflow-node";


export const InitialNode = memo((props: NodeProps) => {
    const [selectorOpen, setSelectorOpen] = useState(false);
    return (
        <NodeSelector open={selectorOpen} onOpenChange={setSelectorOpen}>

            <WorkflowNode showTollbar={false} {...props}>
                <PlaceholderNode
                    {...props}
                    onClick={() => { setSelectorOpen(true); }}
                >
                    <div className="cursor-pointer flex items-center justify-center">
                        <PlusIcon className="size-4" />
                    </div>

                </PlaceholderNode>
            </WorkflowNode>
         </NodeSelector>


    )

})

InitialNode.displayName = "InitialNode";