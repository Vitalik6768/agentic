"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DataTransferPanel, ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { TemplateHighlightInput } from "@/lib/template-highlight";
import type { AvailableVariable, UpstreamVariableNodeOption } from "@/lib/variable-picker";


const formSchema = z.object({
    varibleName: z.string()
        .trim()
        .min(1, { message: "Variable name is required" })
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    delay: z.string().trim().min(1, { message: "Delay is required" }),
}).superRefine((values, ctx) => {
    const raw = values.delay.trim();

    // Allow templates like {{some.value}} — validate at runtime in executor.
    if (raw.includes("{{") && raw.includes("}}")) return;

    const asNumber = Number(raw);
    if (!Number.isFinite(asNumber)) {
        ctx.addIssue({
            path: ["delay"],
            code: "custom",
            message: "Delay must be a number (ms) or a template like {{myDelay}}",
        });
        return;
    }
    if (asNumber < 1) {
        ctx.addIssue({
            path: ["delay"],
            code: "custom",
            message: "Delay must be at least 1ms",
        });
        return;
    }
    if (asNumber > 10000) {
        ctx.addIssue({
            path: ["delay"],
            code: "custom",
            message: "Delay must be less than or equal to 10000ms",
        });
    }
});

export type DelayNodeFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<DelayNodeFormValues>;
    nodeName: string;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: AvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: UpstreamVariableNodeOption[];
}

export const DelayNodeDialog = ({ 
    open, 
    onOpenChange, 
    onSubmit, 
    defaultValues = {},
    nodeName,
    executionStatus = "initial",
    executionOutput = "",
    executionError,
    availableVariables = [],
    isLoadingVariables = false,
    selectedNodeId,
    onSelectedNodeIdChange,
    nodeOptions = [],
 }: Props) => {
    const createDefaultVariableName = () => `${nodeName}${Math.floor(Math.random() * 9) + 1}`;
    const queryInputRef = useRef<HTMLInputElement | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            varibleName: defaultValues.varibleName ?? createDefaultVariableName(),
            delay: defaultValues.delay != null ? String(defaultValues.delay) : "1000",
        },
    })

    useEffect(() => {
        if (open) {
            const fallbackVariableName = createDefaultVariableName();
            form.reset({
                varibleName: defaultValues.varibleName ?? fallbackVariableName,
                delay: defaultValues.delay != null ? String(defaultValues.delay) : "1000",
            })
        }

    }, [defaultValues, open, form])


    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false)
    }
    const handleInsertVariable = (token: string) => {
        const input = queryInputRef.current;
        const currentValue = form.getValues("varibleName") ?? "";
        if (!input) {
            form.setValue("varibleName", `${currentValue}${token}`, { shouldDirty: true });
            return;
        }

        const start = input.selectionStart ?? currentValue.length;
        const end = input.selectionEnd ?? currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
        form.setValue("varibleName", nextValue, { shouldDirty: true });

        requestAnimationFrame(() => {
            input.focus();
            const nextCursor = start + token.length;
            input.setSelectionRange(nextCursor, nextCursor);
        });
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] overflow-hidden p-0 sm:max-w-6xl">
                <DialogHeader>
                    <div className="border-b bg-background px-6 py-5">
                        <DialogTitle>Delay Node</DialogTitle>
                        <DialogDescription>
                            Configure how long this workflow should wait before continuing.
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
                            className="max-h-[72vh] overflow-hidden"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="px-1 text-xs font-semibold tracking-wider text-muted-foreground">PARAMETERS</div>
                        <DataTransferPanel title="Delay Settings" subtitle="Configure step behavior" className="max-h-[72vh] overflow-hidden">
                            <div className="max-h-[52vh] overflow-y-auto pr-1">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                        <FormField
                                            control={form.control}
                                            name="varibleName"
                                            render={({ field }) => {
                                                const { ref, ...fieldProps } = field;
                                                return (
                                                    <FormItem>
                                                        <FormLabel>Variable Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                ref={(el) => {
                                                                    ref(el);
                                                                    queryInputRef.current = el;
                                                                }}
                                                                type="text"
                                                                placeholder="my_variable"
                                                                {...fieldProps}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            Optional name for referencing this node’s output later.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                );
                                            }}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="delay"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Delay (ms)</FormLabel>
                                                    <FormControl>
                                                        <TemplateHighlightInput
                                                            inputMode="text"
                                                            type="text"
                                                            placeholder="1000 or {{myDelayMs}}"
                                                            value={field.value ?? ""}
                                                            onChange={(event) => field.onChange(event.target.value)}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Wait this many milliseconds before executing the next step.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
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
                            idleMessage="Execute this workflow to view the latest Delay node output here."
                            className="max-h-[72vh] overflow-hidden"
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}