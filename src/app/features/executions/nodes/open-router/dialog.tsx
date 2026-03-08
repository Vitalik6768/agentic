"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import z from "zod";
import { useGetCredentialsByType } from "@/app/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/types";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { VariablePickerPanel } from "@/components/data-transfer";
import type { AvailableVariable } from "@/lib/variable-picker";
import { DEFAULT_OPEN_ROUTER_MODEL, OPEN_ROUTER_MODELS } from "@/config/constans";



const formSchema = z.object({
    varibleName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().min(1, { message: "User prompt is required" }),
    credentialId: z.string().min(1, { message: "Credential is required" }),
    model: z.string().min(1, { message: "Model is required" }),
    forceJsonOutput: z.boolean(),
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
    const [activeTarget, setActiveTarget] = useState<"systemPrompt" | "userPrompt">("userPrompt");
    const systemPromptRef = useRef<HTMLTextAreaElement | null>(null);
    const userPromptRef = useRef<HTMLTextAreaElement | null>(null);
    const { data: credentials, isLoading: isLoadingCredentials } = useGetCredentialsByType(CredentialType.OPENROUTER);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            varibleName: defaultValues.varibleName ?? "",
            systemPrompt: defaultValues.systemPrompt ?? "",
            userPrompt: defaultValues.userPrompt ?? "",
            credentialId: defaultValues.credentialId ?? "",
            model: defaultValues.model ?? DEFAULT_OPEN_ROUTER_MODEL,
            forceJsonOutput: defaultValues.forceJsonOutput ?? false,
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                varibleName: defaultValues.varibleName ?? "",
                credentialId: defaultValues.credentialId ?? "",
                systemPrompt: defaultValues.systemPrompt ?? "",
                userPrompt: defaultValues.userPrompt ?? "",
                model: defaultValues.model ?? DEFAULT_OPEN_ROUTER_MODEL,
                forceJsonOutput: defaultValues.forceJsonOutput ?? false,
            })
        }

    }, [defaultValues, open, form])

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>OpenRouter</DialogTitle>
                    <DialogDescription>
                        Configure the OpenRouter trigger.
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
               
                    <div className="max-h-[72vh] overflow-y-auto pr-1">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="space-y-6"
                        >
                        <FormField
                            control={form.control}
                            name="varibleName"
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
                                        The name of the variable to store the Gemini response data.
                                        Must be a valid JavaScript variable name.
                                    </FormDescription>
                                    <FormMessage />

                                </FormItem>
                            )}
                        />
                        
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
                       
                        <FormField
                            control={form.control}
                            name="systemPrompt"
                            render={({ field }) => {
                                const { ref, ...fieldProps } = field;
                                return (
                                    <FormItem>
                                        <FormLabel>System Prompt (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                ref={(element) => {
                                                    ref(element);
                                                    systemPromptRef.current = element;
                                                }}
                                                className="min-h-[80px] font-mono text-sm"
                                                placeholder="you are a helpful assistant"
                                                onFocus={() => setActiveTarget("systemPrompt")}
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
                                const { ref, ...fieldProps } = field;
                                return (
                                    <FormItem>
                                        <FormLabel>User Prompt</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                ref={(element) => {
                                                    ref(element);
                                                    userPromptRef.current = element;
                                                }}
                                                className="min-h-[80px] font-mono text-sm"
                                                placeholder="What is the capital of France?"
                                                onFocus={() => setActiveTarget("userPrompt")}
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

                        <DialogFooter className="mt-4">

                            <Button className="w-full" type="submit">Save</Button>
                        </DialogFooter>
                        </form>
                    </Form>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Execution Output</h3>
                            <span className="text-xs text-muted-foreground">
                                {executionStatus === "loading" ? "Running..." : executionStatus === "success" ? "Completed" : executionStatus === "error" ? "Failed" : "Idle"}
                            </span>
                        </div>
                        {executionStatus === "success" && executionOutput ? (
                            <pre className="max-h-[420px] overflow-auto rounded-md bg-background p-3 font-mono text-xs whitespace-pre-wrap">
                                {executionOutput}
                            </pre>
                        ) : executionStatus === "error" ? (
                            <pre className="max-h-[420px] overflow-auto rounded-md bg-background p-3 font-mono text-xs whitespace-pre-wrap text-red-500">
                                {executionError ?? "Execution failed"}
                            </pre>
                        ) : (
                            <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
                                Execute this workflow to view the latest OpenRouter output here.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}