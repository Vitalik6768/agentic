
"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CredentialType } from "@/types";
import type { Credential } from "@/types";

import { useCreateCredential, useSuspenseCredential, useUpdateCredential } from "../hooks/use-credentials";
import type { SubmitHandler } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { ExternalLinkIcon } from "lucide-react";
const formSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    type: z.nativeEnum(CredentialType),
    value: z.string().min(1, { message: "Value is required" }),
    clientId: z.string().optional(),
    googleAuthType: z.enum(["OAUTH", "SERVICE_ACCOUNT"]).optional(),
}).superRefine((val, ctx) => {
    if (val.type === CredentialType.GOOGLE) {
        const mode = val.googleAuthType ?? "OAUTH";
        if (mode === "OAUTH" && (!val.clientId || val.clientId.trim().length === 0)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["clientId"],
                message: "Client ID is required for Google",
            });
        }
    }
});

type FormValues = z.infer<typeof formSchema>;

const credentialTypeOptions = [
    {
        value: CredentialType.OPENROUTER,
        label: "OpenRouter",
        icon: "/logos/openrouter.svg",

    },
    {
        value: CredentialType.TELEGRAM_BOT,
        label: "Telegram Bot",
        icon: "/logos/telegram.svg",
    },
    {
        value: CredentialType.GEMINI,
        label: "Gemini",
        icon: "/logos/gemini.svg",
    },
    {
        value: CredentialType.GOOGLE,
        label: "Google",
        icon: "/logos/google.svg",
    },
]

interface CredentialFormProps {
    initialData?: {
        id?: string;
        name?: string;
        type?: CredentialType;
        value: string;
        settings?: Record<string, unknown> | null;

    }
}

export const CredentialForm = ({ initialData }: CredentialFormProps) => {
    const router = useRouter();
    const createCredential = useCreateCredential();
    const updateCredential = useUpdateCredential();

    const isEdit = !!initialData?.id;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            name: initialData.name ?? "",
            type: initialData.type ?? CredentialType.OPENROUTER,
            value: initialData.value ?? "",
            clientId:
                (initialData.settings && typeof initialData.settings === "object"
                    ? (initialData.settings).clientId
                    : "") as string,
            googleAuthType:
                (initialData.settings && typeof initialData.settings === "object"
                    ? ((initialData.settings as Record<string, unknown>).googleAuthType as "OAUTH" | "SERVICE_ACCOUNT" | undefined)
                    : undefined) ?? "OAUTH",
        } : {
            name: "",
            type: CredentialType.OPENROUTER,
            value: "",
            clientId: "",
            googleAuthType: "OAUTH",
        },
    });
    const selectedType = form.watch("type");
    const googleAuthType = form.watch("googleAuthType") ?? "OAUTH";
    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        try {
            const settings =
                values.type === CredentialType.GOOGLE
                    ? { clientId: values.clientId?.trim() ?? "", googleAuthType: values.googleAuthType ?? "OAUTH" }
                    : undefined;
            if (isEdit && initialData?.id) {
                await updateCredential.mutateAsync({
                    id: initialData?.id,
                    name: values.name,
                    type: values.type,
                    value: values.value,
                    settings,
                });
            } else {
                await createCredential.mutateAsync({
                    name: values.name,
                    type: values.type,
                    value: values.value,
                    settings,
                });
            }
            router.push("/credentials");
        } catch (error) {
            // Error handling is already done in the mutation hooks
        }
    }

    return (
        <>
            <Card className="shadow-none">
                <CardHeader>
                    <CardTitle>
                        {isEdit ? "Edit Credential" : "Create Credential"}
                    </CardTitle>
                    <CardDescription>{isEdit ? "Edit your credential" : "Create a new credential"}

                    </CardDescription>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter your credential name" {...field} />
                                            </FormControl>

                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {credentialTypeOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        <div className="flex items-center gap-2">
                                                            <Image src={option.icon} alt={option.label} width={16} height={16} />
                                                            {option.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {selectedType === CredentialType.GOOGLE && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="googleAuthType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Google auth type</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value ?? "OAUTH"}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select Google auth type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="OAUTH">OAuth (Connect account)</SelectItem>
                                                            <SelectItem value="SERVICE_ACCOUNT">Service Account (JSON)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {googleAuthType === "OAUTH" && (
                                            <FormField
                                                control={form.control}
                                                name="clientId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Client ID</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Google OAuth Client ID" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </>
                                )}

                                <FormField control={form.control} name="value" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {selectedType === CredentialType.GOOGLE
                                                ? googleAuthType === "SERVICE_ACCOUNT"
                                                    ? "Service account JSON"
                                                    : "Client secret"
                                                : "api key"}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type={selectedType === CredentialType.GOOGLE && googleAuthType === "SERVICE_ACCOUNT" ? "text" : "password"}
                                                placeholder={
                                                    selectedType === CredentialType.GOOGLE
                                                        ? googleAuthType === "SERVICE_ACCOUNT"
                                                            ? '{ "type": "service_account", ... }'
                                                            : "Google OAuth client secret"
                                                        : "...sk"
                                                }
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {isEdit && selectedType === CredentialType.GOOGLE && googleAuthType === "OAUTH" && initialData?.id ? (
                                    <>
                                        <Separator />
                                        <div className="flex flex-col gap-2">
                                            <div className="text-sm font-medium">Connect Google account</div>
                                            <div className="text-sm text-muted-foreground">
                                                This saves the refresh token inside this credential (n8n-style), so nodes can run without relying on the user’s login session.
                                            </div>
                                            <Button type="button" variant="outline" asChild>
                                                <a href={`/api/google/oauth/start?credentialId=${encodeURIComponent(initialData.id)}`}>
                                                    Connect / Reconnect <ExternalLinkIcon className="ml-2 size-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    </>
                                ) : null}
                                <div className="flex gap-2 justify-start">
                                    <Button
                                        type="submit"
                                        disabled={createCredential.isPending || updateCredential.isPending}
                                    >
                                        Save
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        asChild
                                    >
                                        <Link href="/credentials">Cancel</Link>
                                    </Button>

                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </CardHeader>
            </Card>
        </>
    );
};

export const CredentialView = ({ credentialId }: { credentialId: string }) => {
    const { data: credential } = useSuspenseCredential(credentialId);

    return <CredentialForm initialData={credential as Credential} />;
};