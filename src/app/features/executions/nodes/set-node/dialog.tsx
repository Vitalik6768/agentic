"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTransferPanel, ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import {
    NodeDialogNameField,
    type NodeDialogNameFieldHandle,
} from "@/components/node-dialog-name-field";
import { TemplateHighlightInput } from "@/lib/template-highlight";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";



const formSchema = z.object({
    value: z.string(),
    valueType: z.enum(["string", "number", "boolean", "json"]),
});

type SetNodeFormValues = z.infer<typeof formSchema>;

export type SetNodeDialogValues = {
    variableName: string;
} & SetNodeFormValues;

export type SetNodeAvailableVariable = {
    key: string;
    token: string;
    nodeId: string;
    nodeType: string;
    variableRoot: string;
    preview?: string;
    valueType: "string" | "number" | "boolean" | "object" | "array" | "null";
};

export type SetNodeVariableNodeOption = {
    nodeId: string;
    nodeType: string;
    variableRoot: string;
};

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: SetNodeDialogValues) => void;
    defaultValues?: Partial<SetNodeDialogValues>;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: SetNodeAvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: SetNodeVariableNodeOption[];
}

export const SetNodeDialog = ({
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
    const valueTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);
    const form = useForm<SetNodeFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            value: defaultValues.value ?? "",
            valueType: defaultValues.valueType ?? "string",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                value: defaultValues.value ?? "",
                valueType: defaultValues.valueType ?? "string",
            });
        }
    }, [defaultValues, open, form]);

    const handleSubmit = (values: SetNodeFormValues) => {
        const err = nameFieldRef.current?.validate();
        if (err) {
            nameFieldRef.current?.enterEditMode();
            nameFieldRef.current?.focusNameInput();
            return;
        }
        const name = nameFieldRef.current?.getTrimmedName() ?? "";
        onSubmit({
            variableName: name,
            value: values.value,
            valueType: values.valueType,
        });
        onOpenChange(false);
    };

    const handleInsertVariable = (token: string) => {
        const textarea = valueTextareaRef.current;
        const currentValue = form.getValues("value") ?? "";
        const insertValue = token;

        if (!textarea) {
            form.setValue("value", `${currentValue}${insertValue}`, { shouldDirty: true });
            return;
        }

        const start = textarea.selectionStart ?? currentValue.length;
        const end = textarea.selectionEnd ?? currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${insertValue}${currentValue.slice(end)}`;

        form.setValue("value", nextValue, { shouldDirty: true });
        requestAnimationFrame(() => {
            textarea.focus();
            const nextCursor = start + insertValue.length;
            textarea.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const initialName = defaultValues.variableName ?? "";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[98vw] overflow-hidden p-0 sm:max-w-7xl">
                <DialogHeader>
                    <div className="border-b bg-background px-6 py-5">
                        <DialogTitle className="sr-only">Set variable</DialogTitle>
                        <NodeDialogNameField
                            ref={nameFieldRef}
                            open={open}
                            initialName={initialName}
                            variant="header"
                            helpText="Canvas label and variable updated by this step."
                        />
                        <DialogDescription className="pt-3">
                            Create or overwrite a variable in workflow context.
                        </DialogDescription>
                    </div>
                </DialogHeader>
                <div className="grid h-[calc(90vh-88px)] items-start gap-6 overflow-hidden bg-muted/10 px-6 py-6 md:grid-cols-3">
                    <div className="space-y-2">
                        <div className="px-1 text-xs font-semibold tracking-wider text-muted-foreground">INPUT</div>
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
                    </div>

                    <div className="space-y-2">
                        <div className="px-1 text-xs font-semibold tracking-wider text-muted-foreground">PARAMETERS</div>
                        <DataTransferPanel title="Set Settings" subtitle="Configure value to write" className="max-h-[72vh] overflow-hidden">
                            <div className="max-h-[52vh] overflow-y-auto pr-1">
                                <Form {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(handleSubmit)}
                                        className="space-y-6"
                                    >
                                        <FormField
                                            control={form.control}
                                            name="valueType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Value Type</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select value type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="string">String</SelectItem>
                                                            <SelectItem value="number">Number</SelectItem>
                                                            <SelectItem value="boolean">Boolean</SelectItem>
                                                            <SelectItem value="json">JSON</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Value is rendered with templates first, then cast to the selected type.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="value"
                                            render={({ field }) => {
                                                const { ref, ...fieldProps } = field;
                                                return (
                                                    <FormItem>
                                                        <FormLabel>Value</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                ref={(element) => {
                                                                    ref(element);
                                                                    valueTextareaRef.current = element;
                                                                }}
                                                                className="min-h-[120px] font-mono text-sm"
                                                                placeholder='{{httpResponse.data.id}} or {"id":"{{httpResponse.data.id}}"}'
                                                                {...fieldProps}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            Supports Handlebars templates like {`{{variable}}`} and {`{{json variable}}`}.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                );
                                            }}
                                        />
                                        <DialogFooter className="pt-2">
                                            <Button className="w-full" type="submit">Save</Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </div>
                        </DataTransferPanel>
                    </div>

                    <div className="space-y-2">
                        <div className="px-1 text-xs font-semibold tracking-wider text-muted-foreground">OUTPUT</div>
                        <ExecutionOutputPanel
                            executionStatus={executionStatus}
                            executionOutput={executionOutput}
                            executionError={executionError}
                            idleMessage="Execute this workflow to view the latest Set node output here."
                            className="max-h-[72vh] overflow-hidden"
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}