"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";


const formSchema = z.object({
    variableName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    arrayInput: z.string().min(1, { message: "Array input is required" }),
});


export type LoopFormValues = z.infer<typeof formSchema>;

export type LoopAvailableVariable = {
    key: string;
    token: string;
    nodeId: string;
    nodeType: string;
    variableRoot: string;
    preview?: string;
    valueType: "string" | "number" | "boolean" | "object" | "array" | "null";
};

export type LoopVariableNodeOption = {
    nodeId: string;
    nodeType: string;
    variableRoot: string;
};

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<LoopFormValues>;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: LoopAvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: LoopVariableNodeOption[];
}

export const LoopDialog = ({ 
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
    const arrayTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName ?? "",
            arrayInput: defaultValues.arrayInput ?? "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName ?? "",
                arrayInput: defaultValues.arrayInput ?? "",
            });
        }

    }, [defaultValues, open, form]);


    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false);
    };

    const handleInsertVariable = (token: string) => {
        const textarea = arrayTextareaRef.current;
        const currentValue = form.getValues("arrayInput") ?? "";
        const insertValue = token;

        if (!textarea) {
            form.setValue("arrayInput", `${currentValue}${insertValue}`, { shouldDirty: true });
            return;
        }

        const start = textarea.selectionStart ?? currentValue.length;
        const end = textarea.selectionEnd ?? currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${insertValue}${currentValue.slice(end)}`;
        form.setValue("arrayInput", nextValue, { shouldDirty: true });

        requestAnimationFrame(() => {
            textarea.focus();
            const nextCursor = start + insertValue.length;
            textarea.setSelectionRange(nextCursor, nextCursor);
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-6xl">
                <DialogHeader>
                    <DialogTitle>Loop</DialogTitle>
                    <DialogDescription>
                        Configure an array input and iterate over each item.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid items-start gap-6 md:grid-cols-3">
                    <VariablePickerPanel
                        items={availableVariables}
                        isLoading={isLoadingVariables}
                        nodeOptions={nodeOptions}
                        selectedNodeId={selectedNodeId}
                        onSelectedNodeIdChange={onSelectedNodeIdChange}
                        onInsertVariable={handleInsertVariable}
                        className="max-h-[72vh] overflow-hidden"
                    />
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="space-y-6"
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
                                        <FormDescription>
                                            The variable where loop output is stored in context.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="arrayInput"
                                render={({ field }) => {
                                    const { ref, ...fieldProps } = field;
                                    return (
                                        <FormItem>
                                            <FormLabel>Array Input</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    ref={(element) => {
                                                        ref(element);
                                                        arrayTextareaRef.current = element;
                                                    }}
                                                    className="min-h-[140px] font-mono text-sm"
                                                    placeholder='["apple", "banana", "orange"] or {{myArray}}'
                                                    {...fieldProps}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Accepts a JSON array. You can also use template tokens such as {`{{items}}`}.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />
                            <DialogFooter className="mt-4">
                                <Button className="w-full" type="submit">Save</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                    <ExecutionOutputPanel
                        executionStatus={executionStatus}
                        executionOutput={executionOutput}
                        executionError={executionError}
                        idleMessage="Execute this workflow to view the latest Loop node output here."
                        className="max-h-[72vh] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}