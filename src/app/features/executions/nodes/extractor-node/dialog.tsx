"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { cn } from "@/lib/utils";


const fieldSchema = z.object({
    outputKey: z.string().trim().min(1, { message: "Field key is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid key" }),
    lookupMode: z.enum(["path", "key_name", "key_value", "object_where"]),
    sourcePath: z.string().optional(),
    lookupValue: z.string().optional(),
    matchKey: z.string().optional(),
    matchValue: z.string().optional(),
    outputType: z.enum(["string", "number", "boolean", "object", "array"]),
    operation: z.enum(["as_is", "first", "join", "count"]),
    separator: z.string().optional(),
}).superRefine((value, ctx) => {
    if (value.lookupMode === "path" && !value.sourcePath?.trim()) {
        ctx.addIssue({
            code: "custom",
            path: ["sourcePath"],
            message: "Source path is required",
        });
    }
    if ((value.lookupMode === "key_name" || value.lookupMode === "key_value") && !value.lookupValue?.trim()) {
        ctx.addIssue({
            code: "custom",
            path: ["lookupValue"],
            message: value.lookupMode === "key_name" ? "Key name is required" : "Value is required",
        });
    }
    if (value.lookupMode === "object_where") {
        if (!value.sourcePath?.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["sourcePath"],
                message: "Source path (array) is required",
            });
        }
        if (!value.matchKey?.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["matchKey"],
                message: "Match key is required",
            });
        }
        if (!value.matchValue?.trim()) {
            ctx.addIssue({
                code: "custom",
                path: ["matchValue"],
                message: "Match value is required",
            });
        }
    }
});

const formSchema = z.object({
    variableName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    fields: z.array(fieldSchema).min(1, { message: "Add at least one field to extract" }),
});

export type ExtractorNodeDialogValues = z.infer<typeof formSchema>;
export type ExtractorFieldDialogValue = z.infer<typeof fieldSchema>;
type ExtractorNodeLegacyDefaults = Partial<ExtractorNodeDialogValues> & {
    sourcePath?: string;
    operation?: "as_is" | "first" | "join" | "count";
    separator?: string;
};

export type ExtractorNodeAvailableVariable = {
    key: string;
    token: string;
    nodeId: string;
    nodeType: string;
    variableRoot: string;
    preview?: string;
    valueType: "string" | "number" | "boolean" | "object" | "array" | "null";
};

export type ExtractorNodeVariableNodeOption = {
    nodeId: string;
    nodeType: string;
    variableRoot: string;
};

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: ExtractorNodeDialogValues) => void;
    defaultValues?: ExtractorNodeLegacyDefaults;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: ExtractorNodeAvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: ExtractorNodeVariableNodeOption[];
}

export const ExtractorNodeDialog = ({
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
    const sourcePathInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const [activeFieldIndex, setActiveFieldIndex] = useState(0);

    const defaultField: ExtractorFieldDialogValue = {
        outputKey: "value",
        lookupMode: "path",
        sourcePath: "",
        lookupValue: "",
        matchKey: "",
        matchValue: "",
        outputType: "string",
        operation: "as_is",
        separator: ", ",
    };

    const normalizedDefaultFields = useMemo((): ExtractorFieldDialogValue[] => {
        if (defaultValues.fields && defaultValues.fields.length > 0) {
            return defaultValues.fields.map((field, index) => ({
                outputKey: field.outputKey?.trim() || `field_${index + 1}`,
                lookupMode: field.lookupMode ?? "path",
                sourcePath: field.sourcePath?.trim() ?? "",
                lookupValue: field.lookupValue?.trim() ?? "",
                matchKey: (field as Partial<ExtractorFieldDialogValue>).matchKey?.trim() ?? "",
                matchValue: (field as Partial<ExtractorFieldDialogValue>).matchValue?.trim() ?? "",
                outputType: field.outputType ?? "string",
                operation: field.operation ?? "as_is",
                separator: field.separator ?? ", ",
            }));
        }
        if (defaultValues.sourcePath) {
            return [{
                outputKey: "value",
                lookupMode: "path",
                sourcePath: defaultValues.sourcePath,
                lookupValue: "",
                matchKey: "",
                matchValue: "",
                outputType: "string",
                operation: defaultValues.operation ?? "as_is",
                separator: defaultValues.separator ?? ", ",
            }];
        }
        return [defaultField];
    }, [defaultValues.fields, defaultValues.sourcePath, defaultValues.operation, defaultValues.separator]);

    const form = useForm<ExtractorNodeDialogValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName ?? "",
            fields: normalizedDefaultFields,
        },
    });
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "fields",
    });

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName ?? "",
                fields: normalizedDefaultFields,
            });
            setActiveFieldIndex(0);
        }
    }, [defaultValues, open, form, normalizedDefaultFields]);

    const handleSubmit = (values: ExtractorNodeDialogValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    const handleInsertVariable = (path: string) => {
        const currentIndex = Math.max(0, Math.min(activeFieldIndex, fields.length - 1));
        const input = sourcePathInputRefs.current[currentIndex];
        const fieldName = `fields.${currentIndex}.sourcePath` as const;
        const currentValue = form.getValues(fieldName) ?? "";

        if (!input) {
            form.setValue(fieldName, `${currentValue}${path}`, { shouldDirty: true });
            return;
        }

        const start = input.selectionStart ?? currentValue.length;
        const end = input.selectionEnd ?? currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${path}${currentValue.slice(end)}`;

        form.setValue(fieldName, nextValue, { shouldDirty: true });
        requestAnimationFrame(() => {
            input.focus();
            const nextCursor = start + path.length;
            input.setSelectionRange(nextCursor, nextCursor);
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-6xl">
                <DialogHeader>
                    <DialogTitle>Extractor Node</DialogTitle>
                    <DialogDescription>
                        Extract exactly what you need from previous nodes with simple options.
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
                        allowPathMode
                        resetModeKey={open}
                        className="max-h-[72vh] overflow-hidden"
                    />
                    <div className="max-h-[72vh] overflow-y-auto pr-1">
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
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Fields to extract</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            append({
                                                outputKey: `field_${fields.length + 1}`,
                                                lookupMode: "path",
                                                sourcePath: "",
                                                lookupValue: "",
                                                outputType: "string",
                                                operation: "as_is",
                                                separator: ", ",
                                            });
                                            setActiveFieldIndex(fields.length);
                                        }}
                                    >
                                        Add field
                                    </Button>
                                </div>
                                {fields.map((item, index) => {
                                    const operation = form.watch(`fields.${index}.operation`);
                                    const lookupMode = form.watch(`fields.${index}.lookupMode`);
                                    return (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "space-y-3 rounded-md border p-3",
                                                activeFieldIndex === index ? "border-primary" : "border-border",
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-medium text-muted-foreground">Field {index + 1}</p>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (fields.length === 1) return;
                                                        remove(index);
                                                        setActiveFieldIndex((prev) => {
                                                            if (prev > index) return prev - 1;
                                                            if (prev === index) return Math.max(0, prev - 1);
                                                            return prev;
                                                        });
                                                    }}
                                                    disabled={fields.length === 1}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                            <FormField
                                                control={form.control}
                                                name={`fields.${index}.outputKey`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Output Key</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="title" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`fields.${index}.lookupMode`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Find By</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select mode" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="path">Path</SelectItem>
                                                                <SelectItem value="key_name">Key Name</SelectItem>
                                                                <SelectItem value="key_value">Key Value</SelectItem>
                                                                <SelectItem value="object_where">Object where</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`fields.${index}.sourcePath`}
                                                render={({ field }) => {
                                                    const { ref, ...fieldProps } = field;
                                                    return (
                                                        <FormItem>
                                                            <FormLabel>
                                                                {lookupMode === "path"
                                                                    ? "Source Path"
                                                                    : lookupMode === "object_where"
                                                                        ? "Source Path (array)"
                                                                        : "Source Path (optional scope)"}
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    ref={(element) => {
                                                                        ref(element);
                                                                        sourcePathInputRefs.current[index] = element;
                                                                    }}
                                                                    onFocus={() => setActiveFieldIndex(index)}
                                                                    placeholder="search.httpResponse.data.organic_results.0.title"
                                                                    {...fieldProps}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    );
                                                }}
                                            />
                                            {(lookupMode === "key_name" || lookupMode === "key_value") ? (
                                                <FormField
                                                    control={form.control}
                                                    name={`fields.${index}.lookupValue`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>{lookupMode === "key_name" ? "Key Name" : "Key Value"}</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder={lookupMode === "key_name" ? "title" : "OpenAI"}
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            ) : null}
                                            {lookupMode === "object_where" ? (
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`fields.${index}.matchKey`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Match Key</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="link" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`fields.${index}.matchValue`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Match Value</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="https://example.com or {{myVar}}" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            ) : null}
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <FormField
                                                    control={form.control}
                                                    name={`fields.${index}.outputType`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Type</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Type" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="string">String</SelectItem>
                                                                    <SelectItem value="number">Number</SelectItem>
                                                                    <SelectItem value="boolean">Boolean</SelectItem>
                                                                    <SelectItem value="object">Object</SelectItem>
                                                                    <SelectItem value="array">Array</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`fields.${index}.operation`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Operation</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Operation" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="as_is">As is</SelectItem>
                                                                    <SelectItem value="first">First item</SelectItem>
                                                                    <SelectItem value="join">Join array</SelectItem>
                                                                    <SelectItem value="count">Count items</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            {operation === "join" ? (
                                                <FormField
                                                    control={form.control}
                                                    name={`fields.${index}.separator`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Join Separator</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder=", " {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                                <DialogFooter className="mt-4">

                                    <Button className="w-full" type="submit">Save</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>
                    <ExecutionOutputPanel
                        executionStatus={executionStatus}
                        executionOutput={executionOutput}
                        executionError={executionError}
                        idleMessage="Execute this workflow to preview extracted output."
                        className="max-h-[72vh] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}