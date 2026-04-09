"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { CredentialType } from "@/types";
import z from "zod";
import { useGetCredentialsByType } from "../../credentials/hooks/use-credentials";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ExecutionOutputPanel } from "@/components/data-transfer";
import { NodeDialogEntityFooter } from "@/components/node-dialog-entity";
import { TriggerDialogEntity } from "@/components/trigger-dialog-entity";
import { TRIGGER_DIALOG_CONTENT_STYLE, TRIGGER_PANELS_STYLES } from "../trigger-constants";
import { MessageCircle } from "lucide-react";
import { NODE_VARIABLE_NAME_REGEX } from "@/components/node-dialog-name-field";


const formSchema = z.object({
    variableName: z
        .string()
        .min(1, { message: "Variable name is required" })
        .regex(NODE_VARIABLE_NAME_REGEX, { message: "Invalid variable name" }),
    credentialId: z.string().min(1, { message: "Credential is required" }),

})

export type TelegramTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<TelegramTriggerFormValues>;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
}

export const TelegramTriggerDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
    executionStatus = "initial",
    executionOutput = "",
    executionError,
}: Props) => {
    const [webhookAction, setWebhookAction] = useState<"set" | "remove" | null>(null);
    const params = useParams<{ workflowsId?: string | string[] }>();
    const workflowIdValue = params.workflowsId;
    const workflowId = Array.isArray(workflowIdValue) ? workflowIdValue[0] : workflowIdValue;

    const { data: credentials, isLoading: isLoadingCredentials } = useGetCredentialsByType(CredentialType.TELEGRAM_BOT);


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        shouldUnregister: false,
        defaultValues: {
            variableName: defaultValues.variableName ?? "telegramTrigger",
            credentialId: defaultValues.credentialId ?? "",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName ?? "telegramTrigger",
                credentialId: defaultValues.credentialId ?? "",
            })
        }

    }, [defaultValues, open, form])


    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false)
    }

    const handleSetWebhook: () => Promise<void> = async () => {
        if (!workflowId) {
            toast.error("Workflow ID is missing in URL");
            return;
        }

        setWebhookAction("set");
        try {
            const response = await fetch(`/api/webhooks/set-webhook?workflowId=${encodeURIComponent(workflowId)}`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ workflowId }),
            });

            const result = (await response.json()) as { success?: boolean; message?: string };
            if (!response.ok || !result.success) {
                toast.error(result.message ?? "Failed to set Telegram webhook");
                return;
            }

            toast.success(result.message ?? "Telegram webhook set successfully");
        } catch {
            toast.error("Failed to set Telegram webhook");
        } finally {
            setWebhookAction(null);
        }
    };

    const handleRemoveWebhook: () => Promise<void> = async () => {
        if (!workflowId) {
            toast.error("Workflow ID is missing in URL");
            return;
        }

        setWebhookAction("remove");
        try {
            const response = await fetch(`/api/webhooks/remove-webhook?workflowId=${encodeURIComponent(workflowId)}`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ workflowId }),
            });

            const result = (await response.json()) as { success?: boolean; message?: string };
            if (!response.ok || !result.success) {
                toast.error(result.message ?? "Failed to remove Telegram webhook");
                return;
            }

            toast.success(result.message ?? "Telegram webhook removed successfully");
        } catch {
            toast.error("Failed to remove Telegram webhook");
        } finally {
            setWebhookAction(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={TRIGGER_DIALOG_CONTENT_STYLE}>
                <TriggerDialogEntity
                    title="Telegram Trigger"
                    description="Configure the Telegram trigger."
                    icon={<MessageCircle className="h-6 w-6 opacity-95" />}
                />
                <div className={TRIGGER_PANELS_STYLES}>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="space-y-8"
                        >
                            <FormField control={form.control} name="variableName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="text"
                                            placeholder="telegramTrigger"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="credentialId" render={({ field }) => (
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
                                                        <Image src="/logos/telegram.svg"
                                                            alt="Telegram"
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
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSetWebhook}
                                    disabled={!workflowId || webhookAction !== null}
                                >
                                    {webhookAction === "set" ? "Setting..." : "Set Webhook"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleRemoveWebhook}
                                    disabled={!workflowId || webhookAction !== null}
                                >
                                    {webhookAction === "remove" ? "Removing..." : "Remove Webhook"}
                                </Button>
                            </div>
                            <NodeDialogEntityFooter />
                        </form>
                    </Form>
                    <ExecutionOutputPanel
                        executionStatus={executionStatus}
                        executionOutput={executionOutput}
                        executionError={executionError}
                        idleMessage="Execute this workflow to view the latest Telegram trigger output here."
                        className="max-h-[420px] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}