"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTransferPanel, ExecutionOutputPanel } from "@/components/data-transfer";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";



const formSchema = z.object({
    variableName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    value: z.string(),
    valueType: z.enum(["string", "number", "boolean", "json"]),
});

export type SetNodeDialogValues = z.infer<typeof formSchema>;

export type SetNodeAvailableVariable = {
    key: string;
    token: string;
    nodeId: string;
    nodeType: string;
    preview?: string;
    valueType: "string" | "number" | "boolean" | "object" | "array" | "null";
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
}: Props) => {
    const valueTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const form = useForm<SetNodeDialogValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName ?? "",
            value: defaultValues.value ?? "",
            valueType: defaultValues.valueType ?? "string",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName ?? "",
                value: defaultValues.value ?? "",
                valueType: defaultValues.valueType ?? "string",
            });
        }
    }, [defaultValues, open, form]);

    const handleSubmit = (values: SetNodeDialogValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    const handleInsertVariable = (token: string) => {
        const textarea = valueTextareaRef.current;
        const currentValue = form.getValues("value") ?? "";

        if (!textarea) {
            form.setValue("value", `${currentValue}${token}`, { shouldDirty: true });
            return;
        }

        const start = textarea.selectionStart ?? currentValue.length;
        const end = textarea.selectionEnd ?? currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;

        form.setValue("value", nextValue, { shouldDirty: true });
        requestAnimationFrame(() => {
            textarea.focus();
            const nextCursor = start + token.length;
            textarea.setSelectionRange(nextCursor, nextCursor);
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-7xl">
                <DialogHeader>
                    <DialogTitle>Set Variable</DialogTitle>
                    <DialogDescription>
                        Create or overwrite a variable in workflow context.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 md:grid-cols-3">
                    <DataTransferPanel
                        title="Previous Nodes Output"
                        subtitle={`${availableVariables.length} variables`}
                    >
                        {availableVariables.length > 0 ? (
                            <div className="max-h-[420px] space-y-2 overflow-auto">
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
                                            The key that will be added to the workflow context object.
                                            Must be a valid JavaScript variable name.
                                        </FormDescription>
                                        <FormMessage />

                                    </FormItem>
                                )}
                            />
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
                            <DialogFooter className="mt-4">

                                <Button className="w-full" type="submit">Save</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                    <ExecutionOutputPanel
                        executionStatus={executionStatus}
                        executionOutput={executionOutput}
                        executionError={executionError}
                        idleMessage="Execute this workflow to view the latest Set node output here."
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}