"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { NodeDialogEntity, NodeDialogEntityFooter } from "@/components/node-dialog-entity";
import { type NodeDialogNameFieldHandle } from "@/components/node-dialog-name-field";
import { zodResolver } from "@hookform/resolvers/zod";
import { DIALOG_CONTENT_STYLE, PANELS_STYLES } from "../constants";
import { TemplateVariableTextarea } from "@/lib/template-highlight";
import { Repeat } from "lucide-react";
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

export const LoopNodeDialog = ({ 
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
    const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);
    const initialName = defaultValues.variableName ?? "";
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        shouldUnregister: false,
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
        const err = nameFieldRef.current?.validate();
        if (err) {
            nameFieldRef.current?.enterEditMode();
            nameFieldRef.current?.focusNameInput();
            return;
        }

        const name = nameFieldRef.current?.getTrimmedName() ?? "";
        form.setValue("variableName", name, { shouldDirty: true });
        onSubmit({ ...values, variableName: name });
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
            <DialogContent className={DIALOG_CONTENT_STYLE}>
                <NodeDialogEntity
                    ref={nameFieldRef}
                    open={open}
                    initialName={initialName}
                    title="Loop"
                    description="Iterate over an array and expose items/count for downstream steps."
                    icon={<Repeat className="h-6 w-6 opacity-95" />}
                    placeholder="loop1"
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
                        allowPathMode
                        resetModeKey={open}
                        className="max-h-[72vh] overflow-hidden"
                    />
                    <div className="max-h-[72vh] overflow-y-auto pr-1">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="arrayInput"
                                    render={({ field }) => {
                                        const { ref, value, ...fieldProps } = field;
                                        return (
                                            <FormItem>
                                                <FormLabel>Array Input</FormLabel>
                                                <FormControl>
                                                    <TemplateVariableTextarea
                                                        ref={(element) => {
                                                            ref(element);
                                                            arrayTextareaRef.current = element;
                                                        }}
                                                        value={value ?? ""}
                                                        className="min-h-[160px] font-mono text-sm"
                                                        placeholder='["apple", "banana", "orange"] or {{myArray}}'
                                                        {...fieldProps}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Must resolve to valid JSON array text after templating. Example: {`{{items}}`}.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                                <NodeDialogEntityFooter />
                            </form>
                        </Form>
                    </div>
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