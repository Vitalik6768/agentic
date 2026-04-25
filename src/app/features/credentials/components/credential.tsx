
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
const formSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    type: z.nativeEnum(CredentialType),
    value: z.string().min(1, { message: "Value is required" }),
    clientId: z.string().optional(),
}).superRefine((val, ctx) => {
    if (val.type === CredentialType.GOOGLE) {
        if (!val.clientId || val.clientId.trim().length === 0) {
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
        } : {
            name: "",
            type: CredentialType.OPENROUTER,
            value: "",
            clientId: "",
        },
    });
    const selectedType = form.watch("type");
    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        try {
            const settings =
                values.type === CredentialType.GOOGLE
                    ? { clientId: values.clientId?.trim() ?? "" }
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

                                <FormField control={form.control} name="value" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {selectedType === CredentialType.GOOGLE ? "Client secret" : "api key"}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder={selectedType === CredentialType.GOOGLE ? "Google OAuth client secret" : "...sk"}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
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