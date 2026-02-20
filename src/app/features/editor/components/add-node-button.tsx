"use client";

import { NodeSelector } from "@/components/node-selector";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { memo, useState } from "react";


export const AddNodeButton = memo(({ onClick }: { onClick: () => void }) => {
    const [selctorOpen, setSelectorOpen] = useState(false);
    return (
        <NodeSelector open={selctorOpen} onOpenChange={setSelectorOpen}>
            <Button
                onClick={() => { setSelectorOpen(true); }}
                size="icon"
                variant="outline"
                className="bg-background"
            >
                <PlusIcon className="size-4" />
            </Button>
        </NodeSelector>
    )
})

AddNodeButton.displayName = "AddNodeButton";