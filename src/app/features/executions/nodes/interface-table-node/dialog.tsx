"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { InterfaceType } from "generated/prisma";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import type { AvailableVariable } from "@/lib/variable-picker";


const formSchema = z.object({
    variableName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    interfaceId: z.string().min(1, { message: "Interface is required" }),
    operation: z.enum(["GET_DATA", "UPDATE_DATA"]),
    matchField: z.string().optional(),
    matchValue: z.string().optional(),
    updateField: z.string().optional(),
    updateValue: z.string().optional(),
}).superRefine((values, ctx) => {
    if (values.operation !== "UPDATE_DATA") return;

    if (!values.matchField?.trim()) {
        ctx.addIssue({
            path: ["matchField"],
            code: "custom",
            message: "Match field is required when operation is Update Data",
        });
    }

    if (!values.matchValue?.trim()) {
        ctx.addIssue({
            path: ["matchValue"],
            code: "custom",
            message: "Match value is required when operation is Update Data",
        });
    }

    if (!values.updateField?.trim()) {
        ctx.addIssue({
            path: ["updateField"],
            code: "custom",
            message: "Update field is required when operation is Update Data",
        });
    }

    if (!values.updateValue?.trim()) {
        ctx.addIssue({
            path: ["updateValue"],
            code: "custom",
            message: "Update value is required when operation is Update Data",
        });
    }
})


export type InterfaceTableFormValues = z.infer<typeof formSchema>;
export type InterfaceTableVariableNodeOption = {
    nodeId: string;
    nodeType: string;
    variableRoot: string;
};

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<InterfaceTableFormValues>;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: AvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: InterfaceTableVariableNodeOption[];
}

export const InterfaceTableDialog = ({ 
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
    const trpc = useTRPC();
    const interfacesQuery = useQuery(trpc.interfaces.getMany.queryOptions());
    const tableInterfaces = interfacesQuery.data?.items.filter((item) => item.type === InterfaceType.TABLE) ?? [];
    const [activeTarget, setActiveTarget] = useState<"matchValue" | "updateValue">("updateValue");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "",
            interfaceId: defaultValues.interfaceId ?? "",
            operation: defaultValues.operation ?? ((defaultValues as { method?: "ADD" | "GET" }).method === "ADD" ? "UPDATE_DATA" : "GET_DATA"),
            matchField: defaultValues.matchField ?? "",
            matchValue: defaultValues.matchValue ?? "",
            updateField: defaultValues.updateField ?? "",
            updateValue: defaultValues.updateValue ?? "",
        },
    })

    const watchInterfaceId = form.watch("interfaceId");
    const watchOperation = form.watch("operation");
    const showUpdateFields = watchOperation === "UPDATE_DATA";

    const tableQuery = useQuery({
        ...(watchInterfaceId
            ? trpc.tableInterface.getOne.queryOptions({ id: watchInterfaceId })
            : trpc.tableInterface.getOne.queryOptions({ id: "" })),
        enabled: Boolean(watchInterfaceId) && open,
    });

    const headerFields = useMemo(() => {
        const raw = tableQuery.data?.table?.dataJson;
        if (!raw || typeof raw !== "object") return [];
        const candidate = raw as { rows?: unknown };
        if (!Array.isArray(candidate.rows) || candidate.rows.length === 0) return [];
        const firstRow = candidate.rows[0] as { cells?: unknown } | undefined;
        if (!firstRow || !Array.isArray(firstRow.cells)) return [];

        return firstRow.cells
            .map((cell, index) => (typeof cell === "string" && cell.trim() ? cell.trim() : `Column ${index + 1}`))
            .filter((value, index, list) => list.indexOf(value) === index);
    }, [tableQuery.data?.table?.dataJson]);

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "",
                interfaceId: defaultValues.interfaceId ?? "",
                operation: defaultValues.operation ?? ((defaultValues as { method?: "ADD" | "GET" }).method === "ADD" ? "UPDATE_DATA" : "GET_DATA"),
                matchField: defaultValues.matchField ?? "",
                matchValue: defaultValues.matchValue ?? "",
                updateField: defaultValues.updateField ?? "",
                updateValue: defaultValues.updateValue ?? "",
            })
        }

    }, [defaultValues, open, form])

    const handleInsertVariable = (token: string) => {
        if (activeTarget === "matchValue") {
            const current = form.getValues("matchValue") ?? "";
            form.setValue("matchValue", `${current}${token}`, { shouldDirty: true });
            return;
        }

        const current = form.getValues("updateValue") ?? "";
        form.setValue("updateValue", `${current}${token}`, { shouldDirty: true });
    };

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false)
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-6xl">
                <DialogHeader>
                    <DialogTitle>Interface Table</DialogTitle>
                    <DialogDescription>
                        Get rows from a table interface or update rows by matching a field.
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
                        resetModeKey={open}
                        className="max-h-[72vh] overflow-hidden"
                    />
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
                                    <FormDescription>
                                        Variable name for storing node output in workflow context.
                                    </FormDescription>
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
                                                <SelectValue placeholder="Select a table interface" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {tableInterfaces.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the table interface this node should use.
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
                                                <SelectValue placeholder="Select operation" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="GET_DATA">Get Data</SelectItem>
                                            <SelectItem value="UPDATE_DATA">Update Data</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Get table rows, or update matched rows like n8n.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {showUpdateFields && (
                            <FormField
                                control={form.control}
                                name="matchField"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Match Field</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Choose field to match" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {headerFields.map((fieldName) => (
                                                    <SelectItem key={fieldName} value={fieldName}>
                                                        {fieldName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Only non-empty header fields from table are listed.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {showUpdateFields && (
                            <FormField
                                control={form.control}
                                name="matchValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Match Value</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder='e.g. {{customer.id}}'
                                                onFocus={() => setActiveTarget("matchValue")}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Rows with equal value in Match Field are updated.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {showUpdateFields && (
                            <FormField
                                control={form.control}
                                name="updateField"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Update Field</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Choose field to update" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {headerFields.map((fieldName) => (
                                                    <SelectItem key={fieldName} value={fieldName}>
                                                        {fieldName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {showUpdateFields && (
                            <FormField
                                control={form.control}
                                name="updateValue"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Update Value</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder='e.g. {{order.status}}'
                                                onFocus={() => setActiveTarget("updateValue")}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Supports Handlebars templates from workflow context.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {interfacesQuery.isLoading && (
                            <p className="text-xs text-muted-foreground">Loading interfaces...</p>
                        )}
                        {!interfacesQuery.isLoading && tableInterfaces.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No table interfaces found. Create one in the Interfaces page first.
                            </p>
                        )}
                        {showUpdateFields && watchInterfaceId && !tableQuery.isLoading && headerFields.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No table fields found. Add header values in first row of this table first.
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
                        idleMessage="Execute this workflow to view the latest Interface Table node output here."
                        className="max-h-[72vh] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}