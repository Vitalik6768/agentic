"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { boolean } from "zod";
import z from "zod";


const formSchema = z.object({
    varibleName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    endpoint: z.string().url({ message: "Invalid please enter a valid URL" }),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
    body: z.string().optional(),
})

export type HttpRequestFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<HttpRequestFormValues>;

}

export const HttpRequestDialog = ({ 
    open, 
    onOpenChange, 
    onSubmit, 
    defaultValues = {} }: Props) => {

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            varibleName: defaultValues.varibleName ?? "",
            endpoint: defaultValues.endpoint ?? "",
            method: defaultValues.method ?? "GET",
            body: defaultValues.body ?? "",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                varibleName: defaultValues.varibleName ?? "",
                endpoint: defaultValues.endpoint ?? "",
                method: defaultValues.method ?? "GET",
                body: defaultValues.body ?? "",
            })
        }

    }, [defaultValues, open, form])


    const watchMethod = form.watch("method");
    const showBodyField = ["POST", "PUT", "PATCH"].includes(watchMethod);

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false)
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>HTTP Request</DialogTitle>
                    <DialogDescription>
                        Configure the HTTP Request trigger.
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
                                        The name of the variable to store the HTTP response data.
                                        Must be a valid JavaScript variable name.
                                    </FormDescription>
                                    <FormMessage />

                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Method</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a method" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="GET">GET</SelectItem>
                                            <SelectItem value="POST">POST</SelectItem>
                                            <SelectItem value="PUT">PUT</SelectItem>
                                            <SelectItem value="DELETE">DELETE</SelectItem>
                                            <SelectItem value="PATCH">PATCH</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the HTTP method to use for the request.
                                    </FormDescription>
                                    <FormMessage />

                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="endpoint"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Endpoint Url</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="url"
                                            placeholder="https://api.example.com/api/v1/endpoint/
                                        {{httpResponse.data.id}}
                                        "
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Static URL or use {`{{varibles}}`}
                                        for simple values ro {`{{json varible}}`}
                                        to stringifay object

                                    </FormDescription>
                                    <FormMessage />

                                </FormItem>
                            )}
                        />
                        {showBodyField && (
                            <FormField
                                control={form.control}
                                name="body"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>request body</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="min-h-[120px] font-mono text-sm"
                                                placeholder="Enter the request body"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Enter the request body in JSON format.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <DialogFooter className="mt-4">

                            <Button className="w-full" type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}