"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { DIALOG_CONTENT_STYLE, PANELS_STYLES } from "../constants";
import { Bot } from "lucide-react";
import { TemplateVariableTextarea } from "@/lib/template-highlight";



const formSchema = z.object({
    varibleName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().min(1, { message: "User prompt is required" }),
    credentialId: z.string().min(1, { message: "Credential is required" }),
    model: z.string().min(1, { message: "Model is required" }),
    chatMode: z.enum(["OFF", "MEMORY"]).default("OFF"),
    maxMemoryMessages: z.preprocess(
        (value) => {
            if (value === "" || value === undefined || value === null) return undefined;
            const parsed = Number(value);
            return Number.isNaN(parsed) ? undefined : parsed;
        },
        z.number().int().min(5, { message: "Minimum is 5 messages" }).max(10, { message: "Maximum is 10 messages" }).optional()
    ),
}).superRefine((values, ctx) => {
    if (values.chatMode === "MEMORY" && values.maxMemoryMessages === undefined) {
        ctx.addIssue({
            path: ["maxMemoryMessages"],
            code: "custom",
            message: "Max memory messages is required when chat mode is enabled.",
        });
    }
});

type AgentNodeFormInput = z.input<typeof formSchema>;
export type AgentNodeFormValues = z.output<typeof formSchema>;
export type AgentNodeVariableNodeOption = {
    nodeId: string;
    nodeType: string;
    variableRoot: string;
};

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: AgentNodeFormValues) => void;
    defaultValues?: Partial<AgentNodeFormValues>;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: AvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: AgentNodeVariableNodeOption[];
}

export const AgentNodeDialog = ({
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
    const [activeTarget, setActiveTarget] = useState<"systemPrompt" | "userPrompt">("userPrompt");
    const systemPromptRef = useRef<HTMLTextAreaElement | null>(null);
    const userPromptRef = useRef<HTMLTextAreaElement | null>(null);
    const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);
    const initialName = defaultValues.varibleName ?? (defaultValues as { variableName?: string }).variableName ?? "";
    const { data: credentials, isLoading: isLoadingCredentials } = useGetCredentialsByType(CredentialType.OPENROUTER);

    const form = useForm<AgentNodeFormInput, unknown, AgentNodeFormValues>({
        resolver: zodResolver(formSchema),
        shouldUnregister: false,
        defaultValues: {
            varibleName: initialName,
            systemPrompt: defaultValues.systemPrompt ?? "",
            userPrompt: defaultValues.userPrompt ?? "",
            credentialId: defaultValues.credentialId ?? "",
            model: defaultValues.model ?? DEFAULT_OPEN_ROUTER_MODEL,
            chatMode: defaultValues.chatMode ?? "OFF",
            maxMemoryMessages: defaultValues.maxMemoryMessages ?? 10,
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
                chatMode: defaultValues.chatMode ?? "OFF",
                maxMemoryMessages: defaultValues.maxMemoryMessages ?? 10,
            })
        }

    }, [defaultValues, open, form])

    const handleSubmit = (values: AgentNodeFormValues) => {
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
        insertAtCursor(activeTarget, token);
    };
    const selectedChatMode = form.watch("chatMode");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={DIALOG_CONTENT_STYLE}>
                <NodeDialogEntity
                    ref={nameFieldRef}
                    open={open}
                    initialName={initialName}
                    title="Agent"
                    description="Run an OpenRouter-powered agent that can optionally use tools and (optionally) memory."
                    icon={<Bot className="h-6 w-6 opacity-95" />}
                    placeholder="agent1"
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
                                <FormLabel>Agent Credential</FormLabel>
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
                            name="chatMode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Chat Mode</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select chat mode" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="OFF">Off</SelectItem>
                                            <SelectItem value="MEMORY">Memory</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Memory mode stores recent turns and adds them to the next prompt.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedChatMode === "MEMORY" && (
                            <FormField
                                control={form.control}
                                name="maxMemoryMessages"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Max Memory Messages</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={5}
                                                max={10}
                                                step={1}
                                                placeholder="10"
                                                value={
                                                    typeof field.value === "number" || typeof field.value === "string"
                                                        ? field.value
                                                        : ""
                                                }
                                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                                    const nextRawValue = event.target.value;
                                                    field.onChange(nextRawValue === "" ? undefined : Number(nextRawValue));
                                                }}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Number of recent messages to keep (5 to 10).
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                       
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

                        <NodeDialogEntityFooter />
                        </form>
                    </Form>
                    </div>
                    <ExecutionOutputPanel
                        executionStatus={executionStatus}
                        executionOutput={executionOutput}
                        executionError={executionError}
                        idleMessage="Execute this workflow to view the latest Agent output here."
                        className="max-h-[72vh] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}