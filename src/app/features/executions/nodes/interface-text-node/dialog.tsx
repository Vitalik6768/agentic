"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTransferPanel, ExecutionOutputPanel } from "@/components/data-transfer";
import { useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { InterfaceType } from "generated/prisma";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import type { AvailableVariable } from "@/lib/variable-picker";


const formSchema = z.object({
    variableName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
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
        onSubmit(values);
        onOpenChange(false)
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-6xl">
                <DialogHeader>
                    <DialogTitle>Interface Text</DialogTitle>
                    <DialogDescription>
                        Add content to an interface or fetch its current content.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid items-start gap-6 md:grid-cols-3">
                    <DataTransferPanel
                        title="Previous Nodes Output"
                        subtitle={`${availableVariables.length} variables`}
                        className="max-h-[72vh] overflow-hidden"
                    >
                        {nodeOptions.length > 0 ? (
                            <div className="mb-3">
                                <Select
                                    value={selectedNodeId}
                                    onValueChange={onSelectedNodeIdChange}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select source node" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {nodeOptions.map((option) => (
                                            <SelectItem key={option.nodeId} value={option.nodeId}>
                                                {option.variableRoot} ({option.nodeType})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                        {isLoadingVariables ? (
                            <div className="flex min-h-[180px] items-center justify-center gap-2 rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Loading variables...
                            </div>
                        ) : availableVariables.length > 0 ? (
                            <div className="max-h-[52vh] space-y-2 overflow-auto">
                                {availableVariables.map((item) => (
                                    <button
                                        key={`${item.nodeId}-${item.key}`}
                                        type="button"
                                        className="w-full rounded-md border bg-background p-2 text-left hover:bg-accent"
                                        onClick={() => handleInsertVariable(item.token)}
                                    >
                                        <p className="font-mono text-xs">{item.token}</p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">{item.key}</p>
                                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>{item.nodeType}</span>
                                            <span>{item.valueType}</span>
                                        </div>
                                        {item.preview ? (
                                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                                                {item.preview}
                                            </p>
                                        ) : null}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
                                No upstream variables found. Configure previous nodes with a variable name first.
                            </div>
                        )}
                    </DataTransferPanel>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="mt-4 space-y-8"
                        >
                    <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="my_variable"
                                            {...field}
                                        />
                                    </FormControl>
                                    {/* <FormDescription>
                                        The name of the variable to store the HTTP response data.
                                        Must be a valid JavaScript variable name.
                                    </FormDescription> */}
                                    <FormMessage />

                                </FormItem>
                            )}
                        />
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
                                                <Textarea
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
                            <DialogFooter className="mt-4">

                                <Button className="w-full" type="submit">Save</Button>
                            </DialogFooter>
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