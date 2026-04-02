"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { TemplateHighlightInput } from "@/lib/template-highlight";
import type { AvailableVariable, UpstreamVariableNodeOption } from "@/lib/variable-picker";


const formSchema = z.object({
    varibleName: z.string()
        .trim()
        .min(1, { message: "Variable name is required" })
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    endpoint: z.string()
        .trim()
        .min(1, { message: "Endpoint URL is required" })
        .url({ message: "Please enter a valid URL" }),
    method: z.enum(["GET"]),
    body: z.string().optional(),
    authType: z.enum(["NONE", "BEARER", "BASIC", "API_KEY"]),
    bearerToken: z.string().optional(),
    basicUsername: z.string().optional(),
    basicPassword: z.string().optional(),
    apiKeyHeaderName: z.string().optional(),
    apiKeyValue: z.string().optional(),
    engine: z.string().trim().min(1, { message: "Engine is required" }),
    q: z.string().trim().min(1, { message: "Query is required" }),
    location: z.string().trim().min(1, { message: "Location is required" }),
    google_domain: z.string().trim().min(1, { message: "Google domain is required" }),
    hl: z.string().trim().min(1, { message: "hl is required" }),
    gl: z.string().trim().min(1, { message: "gl is required" }),
    api_key: z.string().trim().min(1, { message: "API key is required" }),

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

export type SerpApiNodeFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<SerpApiNodeFormValues>;
    nodeName: string;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: AvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: UpstreamVariableNodeOption[];
}

export const SerpApiNodeDialog = ({ 
    open, 
    onOpenChange, 
    onSubmit, 
    defaultValues = {},
    nodeName,
    executionStatus = "initial",
    executionOutput = "",
    executionError,
    availableVariables = [],
    isLoadingVariables = false,
    selectedNodeId,
    onSelectedNodeIdChange,
    nodeOptions = [],
 }: Props) => {
    const createDefaultVariableName = () => `${nodeName}${Math.floor(Math.random() * 9) + 1}`;
    const queryInputRef = useRef<HTMLInputElement | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            varibleName: defaultValues.varibleName ?? createDefaultVariableName(),
            endpoint: defaultValues.endpoint ?? "",
            method: defaultValues.method ?? "GET",
            body: defaultValues.body ?? "",
            authType: defaultValues.authType ?? "NONE",
            bearerToken: defaultValues.bearerToken ?? "",
            basicUsername: defaultValues.basicUsername ?? "",
            basicPassword: defaultValues.basicPassword ?? "",
            engine: defaultValues.engine ?? "google",
            q: defaultValues.q ?? "",
            location: defaultValues.location ?? "",
            google_domain: defaultValues.google_domain ?? "",
            hl: defaultValues.hl ?? "",
            gl: defaultValues.gl ?? "",
            api_key: defaultValues.api_key ?? "",
            apiKeyHeaderName: defaultValues.apiKeyHeaderName ?? "",
            apiKeyValue: defaultValues.apiKeyValue ?? "",
        },
    })

    useEffect(() => {
        if (open) {
            const fallbackVariableName = createDefaultVariableName();
            form.reset({
                varibleName: defaultValues.varibleName ?? fallbackVariableName,
                endpoint: defaultValues.endpoint ?? "",
                method: defaultValues.method ?? "GET",
                body: defaultValues.body ?? "",
                authType: defaultValues.authType ?? "NONE",
                bearerToken: defaultValues.bearerToken ?? "",
                basicUsername: defaultValues.basicUsername ?? "",
                basicPassword: defaultValues.basicPassword ?? "",
                engine: defaultValues.engine ?? "google",
                q: defaultValues.q ?? "",
                location: defaultValues.location ?? "",
                google_domain: defaultValues.google_domain ?? "",
                hl: defaultValues.hl ?? "",
                gl: defaultValues.gl ?? "",
                api_key: defaultValues.api_key ?? "",
            })
        }

    }, [defaultValues, open, form])


    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false)
    }
    const handleInsertVariable = (token: string) => {
        const input = queryInputRef.current;
        const currentValue = form.getValues("q") ?? "";
        if (!input) {
            form.setValue("q", `${currentValue}${token}`, { shouldDirty: true });
            return;
        }

        const start = input.selectionStart ?? currentValue.length;
        const end = input.selectionEnd ?? currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
        form.setValue("q", nextValue, { shouldDirty: true });

        requestAnimationFrame(() => {
            input.focus();
            const nextCursor = start + token.length;
            input.setSelectionRange(nextCursor, nextCursor);
        });
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-6xl">
                <DialogHeader>
                    <DialogTitle>SERP API Node</DialogTitle>
                    <DialogDescription>
                        Configure the SERP API Node.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid items-start gap-6 md:grid-cols-3">
                    <VariablePickerPanel
                        items={availableVariables}
                        isLoading={isLoadingVariables}
                        nodeOptions={nodeOptions}
                        selectedNodeId={selectedNodeId}
                        onSelectedNodeIdChange={onSelectedNodeIdChange}
                        onInsertVariable={handleInsertVariable}
                        className="max-h-[72vh] overflow-hidden"
                    />
                    <div className="max-h-[72vh] overflow-y-auto pr-1">
                    <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-6"
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
                                        <TemplateHighlightInput
                                            type="url"
                                            placeholder="https://api.example.com/api/v1/endpoint/
                                        {{httpResponse.data.id}}
                                        "
                                            {...field}
                                        />
                                    </FormControl>

                                    <FormMessage />

                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="engine"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Engine</FormLabel>
                                    <FormControl>
                                        <TemplateHighlightInput
                                            type="string"
                                            placeholder="google
                                        {{httpResponse.data.id}}
                                        "
                                            {...field}
                                        />
                                    </FormControl>

                                    <FormMessage />

                                </FormItem>
                            )}
                        />
                           <FormField
                            control={form.control}
                            name="q"
                            render={({ field }) => {
                                const { ref, ...fieldProps } = field;
                                return (
                                    <FormItem>
                                        <FormLabel>Query</FormLabel>
                                        <FormControl>
                                            <TemplateHighlightInput
                                                ref={(element) => {
                                                    ref(element);
                                                    queryInputRef.current = element;
                                                }}
                                                type="string"
                                                placeholder="google
                                        {{httpResponse.data.id}}
                                        "
                                                {...fieldProps}
                                            />
                                        </FormControl>

                                        <FormMessage />

                                    </FormItem>
                                );
                            }}
                        />
                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Location</FormLabel>
                                    <FormControl>
                                        <TemplateHighlightInput
                                            type="text"
                                            placeholder="Austin, Texas, United States"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="google_domain"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Google Domain</FormLabel>
                                    <FormControl>
                                        <TemplateHighlightInput
                                            type="text"
                                            placeholder="google.com"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="hl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>hl</FormLabel>
                                    <FormControl>
                                        <TemplateHighlightInput
                                            type="text"
                                            placeholder="en"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="gl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>gl</FormLabel>
                                    <FormControl>
                                        <TemplateHighlightInput
                                            type="text"
                                            placeholder="us"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="api_key"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>API Key</FormLabel>
                                    <FormControl>
                                        <TemplateHighlightInput
                                            type="text"
                                            placeholder="Enter SERP API key"
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
                    </div>
                    <ExecutionOutputPanel
                        executionStatus={executionStatus}
                        executionOutput={executionOutput}
                        executionError={executionError}
                        idleMessage="Execute this workflow to view the latest SERP API node output here."
                        className="max-h-[72vh] overflow-hidden"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}