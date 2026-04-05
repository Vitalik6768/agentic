"use client";

import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import {
    type NodeDialogNameFieldHandle,
} from "@/components/node-dialog-name-field";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { TemplateVariableInput } from "@/lib/template-highlight";
import type { AvailableVariable, UpstreamVariableNodeOption } from "@/lib/variable-picker";
import { Clock } from "lucide-react";
import { NodeDialogEntity, NodeDialogEntityFooter } from "@/components/node-dialog-entity";
import { DIALOG_CONTENT_STYLE, PANELS_STYLES, SUBMIT_BUTTON_STYLE } from "../constants";

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
            <DialogContent className={DIALOG_CONTENT_STYLE}>
                <NodeDialogEntity
                    ref={nameFieldRef}
                    open={open}
                    initialName={initialName}
                    title="Delay Node"
                    description="Wait this many milliseconds before executing the next step."
                    icon={<Clock className="h-6 w-6 opacity-95" />}
                    placeholder="delayNode1"
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
                        className="max-h-[72vh] overflow-hidden"
                    />
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="delay"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Delay (ms)</FormLabel>
                                        <FormControl>
                                            <TemplateVariableInput
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

                            <NodeDialogEntityFooter />
                        </form>
                    </Form>
                    <ExecutionOutputPanel
                        executionStatus={executionStatus}
                        executionOutput={executionOutput}
                        executionError={executionError}
                        idleMessage="Execute this workflow to view the latest Delay node output here."
                        className="max-h-[72vh] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
