
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
const formSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    type: z.nativeEnum(CredentialType),
    value: z.string().min(1, { message: "Value is required" }),
});

type FormValues = z.infer<typeof formSchema>;

const credentialTypeOptions = [
    {
        value: CredentialType.OPENROUTER,
        label: "OpenRouter",
        icon: "/logos/openrouter.svg",

    },
    {
        value: CredentialType.GEMINI,
        label: "Gemini",
        icon: "/logos/gemini.svg",
    },
]

interface CredentialFormProps {
    initialData?: {
        id?: string;
        name?: string;
        type?: CredentialType;
        value: string;

    }
}

export const CredentialForm = ({ initialData }: CredentialFormProps) => {
    const router = useRouter();
    const createCredential = useCreateCredential();
    const updateCredential = useUpdateCredential();

    const isEdit = !!initialData?.id;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ?? {
            name: "",
            type: CredentialType.OPENROUTER,
            value: "",
        },
    });
    const onSubmit = async (values: FormValues) => {
        try {
            if (isEdit && initialData?.id) {
                await updateCredential.mutateAsync({
                    id: initialData?.id,
                    ...values,
                });
            } else {
                await createCredential.mutateAsync(values);
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

                                <FormField control={form.control} name="value" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>api key</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="...sk" {...field} />
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