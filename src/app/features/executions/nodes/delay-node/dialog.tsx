"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTransferPanel, ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import {
    NodeDialogNameField,
    type NodeDialogNameFieldHandle,
} from "@/components/node-dialog-name-field";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { TemplateHighlightInput } from "@/lib/template-highlight";
import type { AvailableVariable, UpstreamVariableNodeOption } from "@/lib/variable-picker";

const delayFormSchema = z.object({
    delay: z.string().trim().min(1, { message: "Delay is required" }),
}).superRefine((values, ctx) => {
    const raw = values.delay.trim();

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

type DelayFormValues = z.infer<typeof delayFormSchema>;

export type DelayNodeDialogSubmitValues = {
    varibleName: string;
    delay: string;
};

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: DelayNodeDialogSubmitValues) => void;
    defaultValues?: Partial<{ varibleName: string; delay: string | number }>;
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
    executionStatus = "initial",
    executionOutput = "",
    executionError,
    availableVariables = [],
    isLoadingVariables = false,
    selectedNodeId,
    onSelectedNodeIdChange,
    nodeOptions = [],
}: Props) => {
    const delayInputRef = useRef<HTMLInputElement | null>(null);
    const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);

    const form = useForm<DelayFormValues>({
        resolver: zodResolver(delayFormSchema),
        defaultValues: {
            delay: defaultValues.delay != null ? String(defaultValues.delay) : "1000",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                delay: defaultValues.delay != null ? String(defaultValues.delay) : "1000",
            });
        }
    }, [defaultValues, open, form]);

    const handleSubmit = (values: DelayFormValues) => {
        const err = nameFieldRef.current?.validate();
        if (err) {
            nameFieldRef.current?.enterEditMode();
            nameFieldRef.current?.focusNameInput();
            return;
        }
        const name = nameFieldRef.current?.getTrimmedName() ?? "";
        onSubmit({ varibleName: name, delay: values.delay });
        onOpenChange(false);
    };

    const handleInsertVariable = (token: string) => {
        const input = delayInputRef.current;
        const currentValue = form.getValues("delay") ?? "";
        if (!input) {
            form.setValue("delay", `${currentValue}${token}`, { shouldDirty: true });
            return;
        }

        const start = input.selectionStart ?? currentValue.length;
        const end = input.selectionEnd ?? currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
        form.setValue("delay", nextValue, { shouldDirty: true });

        requestAnimationFrame(() => {
            input.focus();
            const nextCursor = start + token.length;
            input.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const initialName = defaultValues.varibleName ?? "";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[98vw] overflow-hidden p-0 sm:max-w-7xl">
                <DialogHeader>
                    <div className="border-b bg-background px-6 py-5">
                        <DialogTitle className="sr-only">Delay node</DialogTitle>
                        <NodeDialogNameField
                            ref={nameFieldRef}
                            open={open}
                            initialName={initialName}
                            variant="header"
                        />
                        <DialogDescription className="pt-3">
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
                            className="max-h-[60vh] overflow-hidden"
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
                                            name="delay"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Delay (ms)</FormLabel>
                                                    <FormControl>
                                                        <TemplateHighlightInput
                                                            ref={delayInputRef}
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
