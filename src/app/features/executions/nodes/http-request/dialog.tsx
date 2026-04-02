"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { VariablePickerPanel } from "@/components/data-transfer";
import type { AvailableVariable, UpstreamVariableNodeOption } from "@/lib/variable-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod";


const formSchema = z.object({
    varibleName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    endpoint: z.string().url({ message: "Invalid please enter a valid URL" }),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]),
    queryParams: z
        .array(
            z.object({
                name: z.string().trim().min(1, { message: "Name is required" }),
                value: z.string().optional(),
            })
        )
        .default([]),
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

type HttpRequestFormInput = z.input<typeof formSchema>;
export type HttpRequestFormValues = z.output<typeof formSchema>;

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: HttpRequestFormValues) => void;
    defaultValues?: Partial<HttpRequestFormValues>;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;
    availableVariables?: AvailableVariable[];
    isLoadingVariables?: boolean;
    selectedNodeId?: string;
    onSelectedNodeIdChange?: (nodeId: string) => void;
    nodeOptions?: UpstreamVariableNodeOption[];

}

export const HttpRequestDialog = ({ 
    open, 
    onOpenChange, 
    onSubmit, 
    defaultValues = {},
    executionStatus = "initial",
    executionOutput = "",
    executionError,
    availableVariables = [],
    isLoadingVariables = false,
    selectedNodeId,
    onSelectedNodeIdChange,
    nodeOptions = [],
}: Props) => {

    const form = useForm<HttpRequestFormInput, unknown, HttpRequestFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            varibleName: defaultValues.varibleName ?? "",
            endpoint: defaultValues.endpoint ?? "",
            method: defaultValues.method ?? "GET",
            queryParams: defaultValues.queryParams ?? [],
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
                queryParams: defaultValues.queryParams ?? [],
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
    const [activeTarget, setActiveTarget] = useState<"endpoint" | "body" | "queryName" | "queryValue">("endpoint");
    const endpointRef = useRef<HTMLInputElement | null>(null);
    const bodyRef = useRef<HTMLTextAreaElement | null>(null);
    const queryParamsArray = useFieldArray({
        control: form.control,
        name: "queryParams" as const,
    });

    const handleSubmit = (values: HttpRequestFormValues) => {
        onSubmit(values);
        onOpenChange(false)
    }

    const insertAtCursor = (fieldName: "endpoint" | "body", token: string) => {
        const currentValue = form.getValues(fieldName) ?? "";
        const el = fieldName === "endpoint" ? endpointRef.current : bodyRef.current;

        if (!el) {
            form.setValue(fieldName, `${currentValue}${token}`, { shouldDirty: true });
            return;
        }

        const start = "selectionStart" in el ? (el.selectionStart ?? currentValue.length) : currentValue.length;
        const end = "selectionEnd" in el ? (el.selectionEnd ?? currentValue.length) : currentValue.length;
        const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;

        form.setValue(fieldName, nextValue, { shouldDirty: true });
        requestAnimationFrame(() => {
            el.focus();
            const nextCursor = start + token.length;
            if ("setSelectionRange" in el) {
                el.setSelectionRange(nextCursor, nextCursor);
            }
        });
    };

    const handleInsertVariable = (token: string) => {
        if (activeTarget === "body" && showBodyField) {
            insertAtCursor("body", token);
            return;
        }
        insertAtCursor("endpoint", token);
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-6xl">
                <DialogHeader>
                    <DialogTitle>HTTP Request</DialogTitle>
                    <DialogDescription>
                        Configure the HTTP Request trigger.
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
                        resetModeKey={open}
                        className="max-h-[72vh] overflow-hidden"
                    />

                    <div className="max-h-[72vh] overflow-y-auto pr-1">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(handleSubmit)}
                                className="space-y-6 mt-2"
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
                                    render={({ field }) => {
                                        const { ref, ...fieldProps } = field;
                                        return (
                                            <FormItem>
                                                <FormLabel>Endpoint Url</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        ref={(el) => {
                                                            ref(el);
                                                            endpointRef.current = el;
                                                        }}
                                                        type="url"
                                                        placeholder="https://api.example.com/users/{{user.id}}"
                                                        onFocus={() => setActiveTarget("endpoint")}
                                                        {...fieldProps}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-medium leading-none">Query parameters</div>
                                            <div className="text-sm text-muted-foreground">
                                                Add query string parameters (name/value) to the request URL.
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => queryParamsArray.append({ name: "", value: "" })}
                                        >
                                            Add parameter
                                        </Button>
                                    </div>

                                    {queryParamsArray.fields.length === 0 ? (
                                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                            No query parameters.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {queryParamsArray.fields.map((item, index) => (
                                                <div key={item.id} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                                                    <FormField
                                                        control={form.control}
                                                        name={`queryParams.${index}.name`}
                                                        render={({ field }) => (
                                                            <FormItem className="sm:col-span-5">
                                                                <FormLabel>Name</FormLabel>
                                                                <FormControl>
                                                                    <Input type="text" placeholder="q" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`queryParams.${index}.value`}
                                                        render={({ field }) => (
                                                            <FormItem className="sm:col-span-6">
                                                                <FormLabel>Value</FormLabel>
                                                                <FormControl>
                                                                    <Input type="text" placeholder="search term" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <div className="sm:col-span-1 sm:flex sm:items-end">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="w-full cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={() => queryParamsArray.remove(index)}
                                                            aria-label="Remove parameter"
                                                            title="Remove parameter"
                                                        >
                                                            <Trash2Icon className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

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
                                        render={({ field }) => {
                                            const { ref, ...fieldProps } = field;
                                            return (
                                                <FormItem>
                                                    <FormLabel>Request body</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            ref={(el) => {
                                                                ref(el);
                                                                bodyRef.current = el;
                                                            }}
                                                            className="min-h-[120px] font-mono text-sm"
                                                            placeholder='{"hello":"world"}'
                                                            onFocus={() => setActiveTarget("body")}
                                                            {...fieldProps}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Enter the request body in JSON format.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
                                    />
                                )}

                                <DialogFooter className="mt-4">
                                    <Button className="w-full" type="submit">Save</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>

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
                                Execute this workflow to view the latest HTTP response output here.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}