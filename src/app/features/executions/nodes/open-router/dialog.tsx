"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import z from "zod";
import { useGetCredentialsByType } from "@/app/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/types";



const formSchema = z.object({
    varibleName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().min(1, { message: "User prompt is required" }),
    credentialId: z.string().min(1, { message: "Credential is required" }),
})

export type OpenRouterFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<OpenRouterFormValues>;

}

export const OpenRouterDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {} }: Props) => {
    const { data: credentials, isLoading: isLoadingCredentials } = useGetCredentialsByType(CredentialType.OPENROUTER);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            varibleName: defaultValues.varibleName ?? "",
            systemPrompt: defaultValues.systemPrompt ?? "",
            userPrompt: defaultValues.userPrompt ?? "",
            credentialId: defaultValues.credentialId ?? "",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                varibleName: defaultValues.varibleName ?? "",
                credentialId: defaultValues.credentialId ?? "",
                systemPrompt: defaultValues.systemPrompt ?? "",
                userPrompt: defaultValues.userPrompt ?? "",
            })
        }

    }, [defaultValues, open, form])

    const watchVaribleName = form.watch("varibleName") || "my_variable";


    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false)
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>OpenRouter</DialogTitle>
                    <DialogDescription>
                        Configure the OpenRouter trigger.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-8 mt-4"
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
                            name="systemPrompt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>System Prompt (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            className="min-h-[80px] font-mono text-sm"
                                            placeholder="you are a helpful assistant"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Set The Behavior Of The Assistant.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="userPrompt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>User Prompt</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            className="min-h-[80px] font-mono text-sm"
                                            placeholder="What is the capital of France?"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        The Prompt To Send To The Assistant.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-4">

                            <Button className="w-full" type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}