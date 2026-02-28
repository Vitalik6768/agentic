"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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


const formSchema = z.object({
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
        defaultValues: {
            credentialId: defaultValues.credentialId ?? "",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                credentialId: defaultValues.credentialId ?? "",
            })
        }

    }, [defaultValues, open, form])


    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false)
    }

    const handleSetWebhook = async () => {
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

    const handleRemoveWebhook = async () => {
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
            <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Telegram Trigger</DialogTitle>
                    <DialogDescription>
                        Configure the Telegram trigger.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 md:grid-cols-2">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="space-y-8 mt-4"
                        >
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
                           
                            <DialogFooter className="mt-40 flex flex-wrap justify-end gap-2">
                                <Button type="submit">Save</Button>
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
                            </DialogFooter>
                        </form>
                    </Form>
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
                                Execute this workflow to view the latest Telegram trigger output here.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}