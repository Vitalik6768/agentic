"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { CredentialType } from "@/types";
import { boolean } from "zod";
import z from "zod";
import { useGetCredentialsByType } from "../../credentials/hooks/use-credentials";


const formSchema = z.object({
    credentialId: z.string().min(1, { message: "Credential is required" }),

})

export type TelegramTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<TelegramTriggerFormValues>;

}

export const TelegramTriggerDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues = {} }: Props) => {

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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Telegram Trigger</DialogTitle>
                    <DialogDescription>
                        Configure the Telegram trigger.
                    </DialogDescription>
                </DialogHeader>
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

                        <DialogFooter className="mt-4">

                            <Button className="w-full" type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}