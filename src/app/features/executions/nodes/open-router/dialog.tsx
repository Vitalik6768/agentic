"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import z from "zod";
import { useGetCredentialsByType } from "@/app/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/types";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import type { AvailableVariable } from "@/lib/variable-picker";
import { DEFAULT_OPEN_ROUTER_MODEL, OPEN_ROUTER_MODELS } from "@/config/constans";
import { NodeDialogEntity, NodeDialogEntityFooter } from "@/components/node-dialog-entity";
import { type NodeDialogNameFieldHandle } from "@/components/node-dialog-name-field";
import { Bot } from "lucide-react";
import { DIALOG_CONTENT_STYLE, PANELS_STYLES } from "../constants";
import { TemplateVariableTextarea } from "@/lib/template-highlight";



const formSchema = z.object({
    varibleName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().min(1, { message: "User prompt is required" }),
    credentialId: z.string().min(1, { message: "Credential is required" }),
    model: z.string().min(1, { message: "Model is required" }),
    forceJsonOutput: z.boolean(),
    jsonOutputTemplate: z.string().optional(),
})

export type OpenRouterFormValues = z.infer<typeof formSchema>;
export type OpenRouterVariableNodeOption = {
    nodeId: string;
    nodeType: string;
    variableRoot: string;
};

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<OpenRouterFormValues>;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: AvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: OpenRouterVariableNodeOption[];
}


export const OpenRouterDialog = ({
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
    const [activeTarget, setActiveTarget] = useState<"systemPrompt" | "userPrompt" | "jsonOutputTemplate">("userPrompt");
    const systemPromptRef = useRef<HTMLTextAreaElement | null>(null);
    const userPromptRef = useRef<HTMLTextAreaElement | null>(null);
    const jsonOutputTemplateRef = useRef<HTMLTextAreaElement | null>(null);
    const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);
    const initialName = defaultValues.varibleName ?? (defaultValues as { variableName?: string }).variableName ?? "";
    const { data: credentials, isLoading: isLoadingCredentials } = useGetCredentialsByType(CredentialType.OPENROUTER);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        shouldUnregister: false,
        defaultValues: {
            varibleName: initialName,
            systemPrompt: defaultValues.systemPrompt ?? "",
            userPrompt: defaultValues.userPrompt ?? "",
            credentialId: defaultValues.credentialId ?? "",
            model: defaultValues.model ?? DEFAULT_OPEN_ROUTER_MODEL,
            forceJsonOutput: defaultValues.forceJsonOutput ?? false,
            jsonOutputTemplate: defaultValues.jsonOutputTemplate ?? "",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                varibleName: initialName,
                credentialId: defaultValues.credentialId ?? "",
                systemPrompt: defaultValues.systemPrompt ?? "",
                userPrompt: defaultValues.userPrompt ?? "",
                model: defaultValues.model ?? DEFAULT_OPEN_ROUTER_MODEL,
                forceJsonOutput: defaultValues.forceJsonOutput ?? false,
                jsonOutputTemplate: defaultValues.jsonOutputTemplate ?? "",
            })
        }

    }, [defaultValues, open, form])

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        const err = nameFieldRef.current?.validate();
        if (err) {
            nameFieldRef.current?.enterEditMode();
            nameFieldRef.current?.focusNameInput();
            return;
        }
        const name = nameFieldRef.current?.getTrimmedName() ?? "";
        form.setValue("varibleName", name, { shouldDirty: true });
        onSubmit({ ...values, varibleName: name });
        onOpenChange(false)
    }

    const insertAtCursor = (
        fieldName: "systemPrompt" | "userPrompt",
        token: string,
    ) => {
        const textarea = fieldName === "systemPrompt" ? systemPromptRef.current : userPromptRef.current;
        const currentValue = form.getValues(fieldName) ?? "";

        if (!textarea) {
            form.setValue(fieldName, `${currentValue}${token}`, { shouldDirty: true });
            return;
        }

        const start = textarea.selectionStart ?? currentValue.length;
        const end = textarea.selectionEnd ?? currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;

        form.setValue(fieldName, nextValue, { shouldDirty: true });
        requestAnimationFrame(() => {
            textarea.focus();
            const nextCursor = start + token.length;
            textarea.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const handleInsertVariable = (token: string) => {
        if (activeTarget === "jsonOutputTemplate") {
            const fieldName = "jsonOutputTemplate";
            const textarea = jsonOutputTemplateRef.current;
            const currentValue = form.getValues(fieldName) ?? "";
            if (!textarea) {
                form.setValue(fieldName, `${currentValue}${token}`, { shouldDirty: true });
                return;
            }
            const start = textarea.selectionStart ?? currentValue.length;
            const end = textarea.selectionEnd ?? currentValue.length;
            const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
            form.setValue(fieldName, nextValue, { shouldDirty: true });
            requestAnimationFrame(() => {
                textarea.focus();
                const nextCursor = start + token.length;
                textarea.setSelectionRange(nextCursor, nextCursor);
            });
            return;
        }

        insertAtCursor(activeTarget, token);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={DIALOG_CONTENT_STYLE}>
                <NodeDialogEntity
                    ref={nameFieldRef}
                    open={open}
                    initialName={initialName}
                    title="OpenRouter"
                    description="Call an OpenRouter model with templated prompts and store the response for downstream nodes."
                    icon={<Bot className="h-6 w-6 opacity-95" />}
                    placeholder="openRouter1"
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
                        resetModeKey={open}
                        className="max-h-[72vh] overflow-hidden"
                    />

                    <div className="max-h-[72vh] overflow-y-auto pr-1">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(handleSubmit)}
                                className="space-y-6"
                            >
                                <FormField control={form.control} name="credentialId" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>OpenRouter Credential</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={isLoadingCredentials || !credentials?.length}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a credential" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {credentials?.map((credential) => (
                                                    <SelectItem key={credential.id} value={credential.id}>
                                                        <div className="flex items-center gap-2">
                                                            <Image src="/logos/openrouter.svg"
                                                                alt="OpenRouter"
                                                                width={16}
                                                                height={16} />
                                                            {credential.name}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField
                                    control={form.control}
                                    name="model"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Model</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select a model" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {OPEN_ROUTER_MODELS.map((model) => (
                                                        <SelectItem key={model.value} value={model.value}>
                                                            {model.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>
                                                Select the model used by this OpenRouter node.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="systemPrompt"
                                    render={({ field }) => {
                                        const { ref, value, ...fieldProps } = field;
                                        return (
                                            <FormItem>
                                                <FormLabel>System Prompt (Optional)</FormLabel>
                                                <FormControl>
                                                    <TemplateVariableTextarea
                                                        ref={(element) => {
                                                            ref(element);
                                                            systemPromptRef.current = element;
                                                        }}
                                                        className="min-h-[80px] font-mono text-sm"
                                                        placeholder="you are a helpful assistant"
                                                        onFocus={() => setActiveTarget("systemPrompt")}
                                                        value={value ?? ""}
                                                        {...fieldProps}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Set The Behavior Of The Assistant.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />

                                <FormField
                                    control={form.control}
                                    name="userPrompt"
                                    render={({ field }) => {
                                        const { ref, value, ...fieldProps } = field;
                                        return (
                                            <FormItem>
                                                <FormLabel>User Prompt</FormLabel>
                                                <FormControl>
                                                    <TemplateVariableTextarea
                                                        ref={(element) => {
                                                            ref(element);
                                                            userPromptRef.current = element;
                                                        }}
                                                        className="min-h-[80px] font-mono text-sm"
                                                        placeholder="What is the capital of France?"
                                                        onFocus={() => setActiveTarget("userPrompt")}
                                                        value={value ?? ""}
                                                        {...fieldProps}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    The Prompt To Send To The Assistant.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />

                                <FormField
                                    control={form.control}
                                    name="forceJsonOutput"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Force JSON Output</FormLabel>
                                                <FormDescription>
                                                    Require the model to return valid JSON only.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {form.watch("forceJsonOutput") && (
                                    <FormField
                                        control={form.control}
                                        name="jsonOutputTemplate"
                                        render={({ field }) => {
                                            const { ref, value, ...fieldProps } = field;
                                            return (
                                                <FormItem>
                                                    <FormLabel>JSON Output Template (Optional)</FormLabel>
                                                    <FormControl>
                                                        <TemplateVariableTextarea
                                                            ref={(element) => {
                                                                ref(element);
                                                                jsonOutputTemplateRef.current = element;
                                                            }}
                                                            className="min-h-[80px] font-mono text-sm"
                                                            placeholder='{"key": "value"}'
                                                            onFocus={() => setActiveTarget("jsonOutputTemplate")}
                                                            value={value ?? ""}
                                                            {...fieldProps}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Describe the JSON shape you expect from the model.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
                                    />
                                )}


                                <NodeDialogEntityFooter />
                            </form>
                        </Form>
                    </div>
                    <ExecutionOutputPanel
                        executionStatus={executionStatus}
                        executionOutput={executionOutput}
                        executionError={executionError}
                        idleMessage="Execute this workflow to view the latest OpenRouter output here."
                        className="max-h-[72vh] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}