"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
// import { useSuspenseWorkflow, useUpdateWorkflow, useUpdateWorkflowName } from "@/app/features/workflows/hooks/use-workflows";
import { useAtomValue } from "jotai";
import { useSuspenseWorkflow, useUpdateWorkflowName } from "@/app/features/workflows/hooks/use-workflows";

import { SaveIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { editorAtom } from "../store/atoms";

export const EditorSaveButton = ({ workflowId }: { workflowId: string }) => {
    const editor = useAtomValue(editorAtom);
    // const saveWorkflow = useUpdateWorkflow();

    const handleSave = async () => {
        if (!editor) {
            return;
        }

        const nodes = editor.getNodes();
        const edges = editor.getEdges();
        // saveWorkflow.mutate({
        //     id: workflowId,
        //     nodes: nodes,
        //     edges: edges,
        // });
      
    }
    return (
        <div className="ml-auto">
            {/* <Button onClick={handleSave} disabled={saveWorkflow.isPending}>
                <SaveIcon className="size-4" />
                Save
            </Button> */}
        </div>

    )
}
export const EditorNameInput = ({ workflowId }: { workflowId: string }) => {
    const { data: workflow } = useSuspenseWorkflow(workflowId);
    const updateWorkflowName = useUpdateWorkflowName();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(workflow.name);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (workflow.name !== name) {
            setName(workflow.name);
        }
    }, [workflow.name]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (name === workflow.name) {
            setIsEditing(false);
            return;
        }
        setIsEditing(false);
        try {
            await updateWorkflowName.mutateAsync({
                id: workflowId,
                name: name,
            });
         
        } catch (error) {
            setName(workflow.name);
        }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            void handleSave();
        }else if (event.key === "Escape") {
            setName(workflow.name);
            setIsEditing(false);
        }
    }

    if(isEditing) {
        return (
            <Input
             className="h-7 w-auto min-w-[100px] px-2" 
             disabled={updateWorkflowName.isPending}
             type="text" 
             value={name} 
             onChange={(e) => setName(e.target.value)} 
             onKeyDown={handleKeyDown} ref={inputRef} />
        )
    }


    return (
        <BreadcrumbItem onClick={() => setIsEditing(true)} className="cursor-pointer hover:text-foreground transition-colors">
            {workflow.name}
        </BreadcrumbItem>
    )
}

export const EditorBreadcrumbs = ({ workflowId }: { workflowId: string }) => {
    return (
        <>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/workflows" prefetch>Workflows</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <EditorNameInput workflowId={workflowId} />
                </BreadcrumbList>
            </Breadcrumb>
        </>


    )
}



export const EditorHeader = ({ workflowId }: { workflowId: string }) => {
    return (

        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background">
            <SidebarTrigger />
            <div className="flex flex-1 items-center justify-between gap-x-4 w-full">
                <EditorBreadcrumbs workflowId={workflowId} />
                <EditorSaveButton workflowId={workflowId} />

            </div>
        </header>
    );
};