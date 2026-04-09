"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { InterfaceType } from "generated/prisma";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import type { AvailableVariable } from "@/lib/variable-picker";
import { DIALOG_CONTENT_STYLE, PANELS_STYLES } from "../constants";
import { NodeDialogEntity, NodeDialogEntityFooter } from "@/components/node-dialog-entity";
import { FileText } from "lucide-react";
import { type NodeDialogNameFieldHandle } from "@/components/node-dialog-name-field";
import { TemplateVariableTextarea } from "@/lib/template-highlight";
import { NODE_VARIABLE_NAME_REGEX } from "@/components/node-dialog-name-field";


const formSchema = z.object({
    variableName: z.string().min(1, { message: "Variable name is required" }).regex(NODE_VARIABLE_NAME_REGEX, { message: "Invalid variable name" }),
    interfaceId: z.string().min(1, { message: "Interface is required" }),
    operation: z.enum(["ADD_CONTENT", "GET_CONTENT"]),
    body: z.string().optional(),
}).superRefine((values, ctx) => {
    if (values.operation === "ADD_CONTENT" && !values.body?.trim()) {
        ctx.addIssue({
            path: ["body"],
            code: "custom",
            message: "Content is required when operation is Add Content",
        });
    }
})


export type InterfaceTextFormValues = z.infer<typeof formSchema>;
export type InterfaceTextVariableNodeOption = {
    nodeId: string;
    nodeType: string;
    variableRoot: string;
};

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<InterfaceTextFormValues>;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: AvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: InterfaceTextVariableNodeOption[];
}

export const InterfaceTextDialog = ({ 
    open, 
    onOpenChange, 
    onSubmit, 
    defaultValues = {},
    executionStatus = "initial",
    executionOutput = "",
    executionError,
    availableVariables = [],
    isLoadingVariables = false,
    selectedNodeId,
    onSelectedNodeIdChange,
    nodeOptions = [],
}: Props) => {
    const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const trpc = useTRPC();
    const interfacesQuery = useQuery(trpc.interfaces.getMany.queryOptions());
    const textInterfaces = interfacesQuery.data?.items.filter((item) => item.type === InterfaceType.TEXT) ?? [];
    const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);
    const initialName = defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "";

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "",
            interfaceId: defaultValues.interfaceId ?? "",
            operation: defaultValues.operation ?? ((defaultValues as { method?: "ADD" | "GET" }).method === "ADD" ? "ADD_CONTENT" : "GET_CONTENT"),
            body: defaultValues.body ?? "",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "",
                interfaceId: defaultValues.interfaceId ?? "",
                operation: defaultValues.operation ?? ((defaultValues as { method?: "ADD" | "GET" }).method === "ADD" ? "ADD_CONTENT" : "GET_CONTENT"),
                body: defaultValues.body ?? "",
            })
        }

    }, [defaultValues, open, form])

    const watchOperation = form.watch("operation");
    const showBodyField = watchOperation === "ADD_CONTENT";

    const handleInsertVariable = (token: string) => {
        const textarea = bodyTextareaRef.current;
        const currentValue = form.getValues("body") ?? "";

        if (!textarea) {
            form.setValue("body", `${currentValue}${token}`, { shouldDirty: true });
            return;
        }

        const start = textarea.selectionStart ?? currentValue.length;
        const end = textarea.selectionEnd ?? currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;

        form.setValue("body", nextValue, { shouldDirty: true });
        requestAnimationFrame(() => {
            textarea.focus();
            const nextCursor = start + token.length;
            textarea.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        const err = nameFieldRef.current?.validate();
        if (err) {
            nameFieldRef.current?.enterEditMode();
            nameFieldRef.current?.focusNameInput();
            return;
        }
        const name = nameFieldRef.current?.getTrimmedName() ?? "";
        // Header name field is the source of truth for the node label.
        // Keep the form value in sync so saved data matches what the user sees.
        form.setValue("variableName", name, { shouldDirty: true });
        onSubmit({ ...values, variableName: name });
        onOpenChange(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={DIALOG_CONTENT_STYLE}>
                <NodeDialogEntity
                    ref={nameFieldRef}
                    open={open}
                    initialName={initialName}
                    title="Interface Text"
                    description="Add content to an interface or fetch its current content."
                    icon={<FileText className="h-6 w-6 opacity-95" />}
                    placeholder="interfaceText1"
                    helpText="Canvas label and variable for this step’s output."
                />
                <div className={PANELS_STYLES}>
                    <VariablePickerPanel
                        items={availableVariables}
                        isLoading={isLoadingVariables}
                        nodeOptions={nodeOptions}
                        selectedNodeId={selectedNodeId}
                        onSelectedNodeIdChange={onSelectedNodeIdChange}
                        onInsertVariable={handleInsertVariable}
                        resetModeKey={open}
                        className="max-h-[72vh] overflow-y-auto"
                    />
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="mt-4 space-y-8"
                        >
                        <FormField
                            control={form.control}
                            name="interfaceId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Interface</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a method" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {textInterfaces.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the text interface this node should use.
                                    </FormDescription>
                                    <FormMessage />

                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="operation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Operation</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select auth type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ADD_CONTENT">Add Content</SelectItem>
                                            <SelectItem value="GET_CONTENT">Get Content</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choose whether to append content or read existing content.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {showBodyField && (
                            <FormField
                                control={form.control}
                                name="body"
                                render={({ field }) => {
                                    const { ref, ...fieldProps } = field;
                                    return (
                                        <FormItem>
                                            <FormLabel>Content to Add</FormLabel>
                                            <FormControl>
                                                <TemplateVariableTextarea
                                                    ref={(element) => {
                                                        ref(element);
                                                        bodyTextareaRef.current = element;
                                                    }}
                                                    className="min-h-[120px] font-mono text-sm"
                                                    placeholder="Write text or use {{template}} variables from context"
                                                    {...fieldProps}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Supports Handlebars templates like {`{{variableName}}`}.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />
                        )}
                        {interfacesQuery.isLoading && (
                            <p className="text-xs text-muted-foreground">Loading interfaces...</p>
                        )}
                        {!interfacesQuery.isLoading && textInterfaces.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No text interfaces found. Create one in the Interfaces page first.
                            </p>
                        )}
                        <NodeDialogEntityFooter />
                        </form>
                    </Form>
                    <ExecutionOutputPanel
                        executionStatus={executionStatus}
                        executionOutput={executionOutput}
                        executionError={executionError}
                        idleMessage="Execute this workflow to view the latest Interface Text node output here."
                        className="max-h-[72vh] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}