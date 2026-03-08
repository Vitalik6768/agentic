"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
// import { useSuspenseWorkflow, useUpdateWorkflow, useUpdateWorkflowName } from "@/app/features/workflows/hooks/use-workflows";
import { useAtomValue } from "jotai";
import { useSuspenseWorkflow, useUpdateWorkflow, useUpdateWorkflowName } from "@/app/features/workflows/hooks/use-workflows";
import { buildExportTemplate, buildImportGraph } from "@/lib/workflow-template";

import { DownloadIcon, LoaderCircleIcon, MenuIcon, SaveIcon, UploadIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { editorAtom } from "../store/atoms";

export const EditorSaveButton = ({ workflowId }: { workflowId: string }) => {
    const editor = useAtomValue(editorAtom);
    const saveWorkflow = useUpdateWorkflow();

    const handleSave = async () => {
        if (!editor) {
            return;
        }

        const nodes = editor.getNodes();
        const edges = editor.getEdges();
        saveWorkflow.mutate({
            id: workflowId,
            nodes: nodes,
            edges: edges,
        });
      
    }
    return (
        <Button
            onClick={handleSave}
            disabled={saveWorkflow.isPending}
            size="xs"
            className="gap-2 bg-blue-600 px-5 font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-lg hover:cursor-pointer rounded-xs"
        >
            {saveWorkflow.isPending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
                <SaveIcon className="size-3" />
            )}
            {saveWorkflow.isPending ? "Saving..." : "Save"}
        </Button>

    )
}

export const EditorTemplateMenu = ({ workflowId }: { workflowId: string }) => {
    const editor = useAtomValue(editorAtom);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { data: workflow } = useSuspenseWorkflow(workflowId);

    const handleExport = () => {
        if (!editor) {
            toast.error("Editor is not ready yet");
            return;
        }

        const template = buildExportTemplate({
            name: workflow.name ?? "workflow-template",
            nodes: editor.getNodes(),
            edges: editor.getEdges(),
        });

        const blob = new Blob([JSON.stringify(template, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${template.name.replace(/\s+/g, "-").toLowerCase() || "workflow-template"}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        toast.success("Template exported");
    };

    const handleImportClick = () => {
        if (!editor) {
            toast.error("Editor is not ready yet");
            return;
        }
        fileInputRef.current?.click();
    };

    const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) {
            return;
        }

        if (!window.confirm("Import will replace your current canvas. Continue?")) {
            return;
        }

        try {
            const jsonText = await file.text();
            const json = JSON.parse(jsonText) as unknown;
            const imported = buildImportGraph(json);

            editor?.setNodes(imported.nodes);
            editor?.setEdges(imported.edges);
            toast.success(`Imported "${imported.templateName}"`);
        } catch {
            toast.error("Invalid template JSON");
        }
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportChange}
                className="hidden"
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" size="icon-xs" variant="ghost" className="hover:cursor-pointer" aria-label="Template actions">
                        <MenuIcon className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={handleImportClick}>
                        <UploadIcon className="size-4" />
                        Import JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleExport}>
                        <DownloadIcon className="size-4" />
                        Export JSON
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
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
                <div className="ml-auto flex items-center gap-2">
                    <EditorSaveButton workflowId={workflowId} />
                    <div className="h-5 w-px bg-gray-500" aria-hidden="true" />
                    <EditorTemplateMenu workflowId={workflowId} />

                </div>

            </div>
        </header>
    );
};