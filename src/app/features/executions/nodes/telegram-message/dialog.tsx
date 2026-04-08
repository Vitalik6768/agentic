"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { Input } from "@/components/ui/input";
import { NodeDialogEntity, NodeDialogEntityFooter } from "@/components/node-dialog-entity";
import { type NodeDialogNameFieldHandle } from "@/components/node-dialog-name-field";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { TemplateVariableInput, TemplateVariableTextarea } from "@/lib/template-highlight";
import { DIALOG_CONTENT_STYLE, PANELS_STYLES } from "../constants";
import type { AvailableVariable, UpstreamVariableNodeOption } from "@/lib/variable-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { CredentialType } from "@/types";
import { useGetCredentialsByType } from "../../../credentials/hooks/use-credentials";

const formSchema = z.object({
    variableName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    message: z.string().min(1, { message: "Message is required" }),
    chatId: z.string().optional(),
    credentialId: z.string().min(1, { message: "Credential is required" }),
});

export type TelegramMessageDialogValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: TelegramMessageDialogValues) => void;
    defaultValues?: Partial<TelegramMessageDialogValues>;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: AvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: UpstreamVariableNodeOption[];
}

export const TelegramMessageDialog = ({
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
    const { data: credentials, isLoading: isLoadingCredentials } = useGetCredentialsByType(CredentialType.TELEGRAM_BOT);
    const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);
    const initialName = defaultValues.variableName ?? "";
    const [activeTarget, setActiveTarget] = useState<"chatId" | "message">("message");
    const chatIdInputRef = useRef<HTMLInputElement | null>(null);
    const messageTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const form = useForm<TelegramMessageDialogValues>({
        resolver: zodResolver(formSchema),
        shouldUnregister: false,
        defaultValues: {
            variableName: defaultValues.variableName ?? "",
            message: defaultValues.message ?? "",
            chatId: defaultValues.chatId ?? "",
            credentialId: defaultValues.credentialId ?? "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName ?? "",
                message: defaultValues.message ?? "",
                chatId: defaultValues.chatId ?? "",
                credentialId: defaultValues.credentialId ?? "",
            });
        }
    }, [defaultValues, open, form]);

    const handleSubmit = (values: TelegramMessageDialogValues) => {
        const err = nameFieldRef.current?.validate();
        if (err) {
            nameFieldRef.current?.enterEditMode();
            nameFieldRef.current?.focusNameInput();
            return;
        }

        const name = nameFieldRef.current?.getTrimmedName() ?? "";
        form.setValue("variableName", name, { shouldDirty: true });
        onSubmit({ ...values, variableName: name });
        onOpenChange(false);
    };

    const handleInsertVariable = (token: string) => {
        if (activeTarget === "chatId") {
            const currentValue = form.getValues("chatId") ?? "";
            const input = chatIdInputRef.current;
            if (!input) {
                form.setValue("chatId", `${currentValue}${token}`, { shouldDirty: true });
                return;
            }

            const start = input.selectionStart ?? currentValue.length;
            const end = input.selectionEnd ?? currentValue.length;
            const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
            form.setValue("chatId", nextValue, { shouldDirty: true });

            requestAnimationFrame(() => {
                input.focus();
                const nextCursor = start + token.length;
                input.setSelectionRange(nextCursor, nextCursor);
            });
            return;
        }

        const currentValue = form.getValues("message") ?? "";
        const textarea = messageTextareaRef.current;
        if (!textarea) {
            form.setValue("message", `${currentValue}${token}`, { shouldDirty: true });
            return;
        }

        const start = textarea.selectionStart ?? currentValue.length;
        const end = textarea.selectionEnd ?? currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
        form.setValue("message", nextValue, { shouldDirty: true });

        requestAnimationFrame(() => {
            textarea.focus();
            const nextCursor = start + token.length;
            textarea.setSelectionRange(nextCursor, nextCursor);
        });
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={DIALOG_CONTENT_STYLE}>
                <NodeDialogEntity
                    ref={nameFieldRef}
                    open={open}
                    initialName={initialName}
                    title="Telegram Message"
                    description="Send a message to a Telegram chat using your bot credential."
                    icon={<Send className="h-6 w-6 opacity-95" />}
                    placeholder="telegramMessage1"
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
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="credentialId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telegram Credential</FormLabel>
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
                                                                <Image
                                                                    src="/logos/telegram.svg"
                                                                    alt="Telegram"
                                                                    width={16}
                                                                    height={16}
                                                                />
                                                                {credential.name}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="chatId"
                                    render={({ field }) => {
                                        const { ref, value, ...fieldProps } = field;
                                        return (
                                            <FormItem>
                                                <FormLabel>Chat ID (Optional)</FormLabel>
                                                <FormControl>
                                                    <TemplateVariableInput
                                                        ref={(el) => {
                                                            ref(el);
                                                            chatIdInputRef.current = el;
                                                        }}
                                                        value={value ?? ""}
                                                        placeholder="{{telegram.chat.id}}"
                                                        onFocus={() => setActiveTarget("chatId")}
                                                        {...fieldProps}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    If omitted, we’ll try to use the chat id from a Telegram Trigger context.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => {
                                        const { ref, value, ...fieldProps } = field;
                                        return (
                                            <FormItem>
                                                <FormLabel>Message</FormLabel>
                                                <FormControl>
                                                    <TemplateVariableTextarea
                                                        ref={(el) => {
                                                            ref(el);
                                                            messageTextareaRef.current = el;
                                                        }}
                                                        value={value ?? ""}
                                                        placeholder="Hello {{telegram.from.firstName}}, your request is processed."
                                                        className="min-h-[160px] font-mono text-sm"
                                                        onFocus={() => setActiveTarget("message")}
                                                        {...fieldProps}
                                                    />
                                                </FormControl>
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
                        idleMessage="Execute this workflow to view the latest Telegram message output here."
                        className="max-h-[72vh] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}