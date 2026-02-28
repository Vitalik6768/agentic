"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";


const formSchema = z.object({
    varibleName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    endpoint: z.string().url({ message: "Invalid please enter a valid URL" }),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]),
    body: z.string().optional(),
    authType: z.enum(["NONE", "BEARER", "BASIC", "API_KEY"]),
    bearerToken: z.string().optional(),
    basicUsername: z.string().optional(),
    basicPassword: z.string().optional(),
    apiKeyHeaderName: z.string().optional(),
    apiKeyValue: z.string().optional(),
}).superRefine((values, ctx) => {
    if (values.authType === "BEARER" && !values.bearerToken?.trim()) {
        ctx.addIssue({
            path: ["bearerToken"],
            code: "custom",
            message: "Bearer token is required",
        });
    }

    if (values.authType === "BASIC") {
        if (!values.basicUsername?.trim()) {
            ctx.addIssue({
                path: ["basicUsername"],
                code: "custom",
                message: "Username is required",
            });
        }
        if (!values.basicPassword?.trim()) {
            ctx.addIssue({
                path: ["basicPassword"],
                code: "custom",
                message: "Password is required",
            });
        }
    }

    if (values.authType === "API_KEY") {
        if (!values.apiKeyHeaderName?.trim()) {
            ctx.addIssue({
                path: ["apiKeyHeaderName"],
                code: "custom",
                message: "Header name is required",
            });
        }
        if (!values.apiKeyValue?.trim()) {
            ctx.addIssue({
                path: ["apiKeyValue"],
                code: "custom",
                message: "API key is required",
            });
        }
    }
});

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
            authType: defaultValues.authType ?? "NONE",
            bearerToken: defaultValues.bearerToken ?? "",
            basicUsername: defaultValues.basicUsername ?? "",
            basicPassword: defaultValues.basicPassword ?? "",
            apiKeyHeaderName: defaultValues.apiKeyHeaderName ?? "",
            apiKeyValue: defaultValues.apiKeyValue ?? "",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                varibleName: defaultValues.varibleName ?? "",
                endpoint: defaultValues.endpoint ?? "",
                method: defaultValues.method ?? "GET",
                body: defaultValues.body ?? "",
                authType: defaultValues.authType ?? "NONE",
                bearerToken: defaultValues.bearerToken ?? "",
                basicUsername: defaultValues.basicUsername ?? "",
                basicPassword: defaultValues.basicPassword ?? "",
                apiKeyHeaderName: defaultValues.apiKeyHeaderName ?? "",
                apiKeyValue: defaultValues.apiKeyValue ?? "",
            })
        }

    }, [defaultValues, open, form])


    const watchMethod = form.watch("method");
    const watchAuthType = form.watch("authType");
    const showBodyField = ["POST", "PUT", "PATCH"].includes(watchMethod);

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false)
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
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
                                    {/* <FormDescription>
                                        The name of the variable to store the HTTP response data.
                                        Must be a valid JavaScript variable name.
                                    </FormDescription> */}
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
                                            <SelectItem value="HEAD">HEAD</SelectItem>
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
                                    {/* <FormDescription>
                                        Static URL or use {`{{varibles}}`}
                                        for simple values ro {`{{json varible}}`}
                                        to stringifay object

                                    </FormDescription> */}
                                    <FormMessage />

                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="authType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Auth Type</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select auth type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="NONE">None</SelectItem>
                                            <SelectItem value="BEARER">Bearer Token</SelectItem>
                                            <SelectItem value="BASIC">Basic Auth</SelectItem>
                                            <SelectItem value="API_KEY">API Key Header</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choose how to authenticate this request.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {watchAuthType === "BEARER" && (
                            <FormField
                                control={form.control}
                                name="bearerToken"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bearer Token</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="sk-..."
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Token value used in the Authorization header.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {watchAuthType === "BASIC" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="basicUsername"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Basic Auth Username</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="username"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="basicPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Basic Auth Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="password"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                        {watchAuthType === "API_KEY" && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="apiKeyHeaderName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Header Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="x-api-key"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="apiKeyValue"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>API Key</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="your-api-key"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
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