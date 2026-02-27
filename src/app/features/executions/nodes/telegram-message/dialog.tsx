"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
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
}

export const TelegramMessageDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {},
    executionStatus = "initial",
    executionOutput = "",
    executionError,
}: Props) => {
    const { data: credentials, isLoading: isLoadingCredentials } = useGetCredentialsByType(CredentialType.TELEGRAM_BOT);
    const form = useForm<TelegramMessageDialogValues>({
        resolver: zodResolver(formSchema),
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
        onSubmit(values);
        onOpenChange(false);
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Telegram Message</DialogTitle>
                    <DialogDescription>
                        Send a message to Telegram using your bot credential.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 md:grid-cols-2">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="space-y-6"
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
                                        <FormMessage />

                                    </FormItem>
                                )}
                            />
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
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Chat ID (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="{{telegram.chat.id}}"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Message</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="min-h-[140px] font-mono text-sm"
                                                placeholder="Hello {{telegram.from.firstName}}, your request is processed."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter className="mt-4">

                                <Button className="w-full" type="submit">Save</Button>
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
                                Execute this workflow to view the latest Telegram message output here.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}