"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { InterfaceType } from "generated/prisma";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import z from "zod";


const formSchema = z.object({
    variableName: z.string().min(1, { message: "Variable name is required" }).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    interfaceId: z.string().min(1, { message: "Interface is required" }),
    operation: z.enum(["ADD_CONTENT", "GET_CONTENT"]),
    body: z.string().optional(),
}).superRefine((values, ctx) => {
    if (values.operation === "ADD_CONTENT" && !values.body?.trim()) {
        ctx.addIssue({
            path: ["body"],
            code: "custom",
            message: "Content is required when operation is Add Content",
        });
    }
})


export type InterfaceTextFormValues = z.infer<typeof formSchema>;

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: z.infer<typeof formSchema>) => void;
    defaultValues?: Partial<InterfaceTextFormValues>;
    executionStatus?: NodeStatus;
    executionOutput?: string;
    executionError?: string;

}

export const InterfaceTextDialog = ({ 
    open, 
    onOpenChange, 
    onSubmit, 
    defaultValues = {},
    executionStatus = "initial",
    executionOutput = "",
    executionError,
}: Props) => {
    const trpc = useTRPC();
    const interfacesQuery = useQuery(trpc.interfaces.getMany.queryOptions());
    const textInterfaces = interfacesQuery.data?.items.filter((item) => item.type === InterfaceType.TEXT) ?? [];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "",
            interfaceId: defaultValues.interfaceId ?? "",
            operation: defaultValues.operation ?? ((defaultValues as { method?: "ADD" | "GET" }).method === "ADD" ? "ADD_CONTENT" : "GET_CONTENT"),
            body: defaultValues.body ?? "",
        },
    })

    useEffect(() => {
        if (open) {
            form.reset({
                variableName: defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "",
                interfaceId: defaultValues.interfaceId ?? "",
                operation: defaultValues.operation ?? ((defaultValues as { method?: "ADD" | "GET" }).method === "ADD" ? "ADD_CONTENT" : "GET_CONTENT"),
                body: defaultValues.body ?? "",
            })
        }

    }, [defaultValues, open, form])

    const watchOperation = form.watch("operation");
    const showBodyField = watchOperation === "ADD_CONTENT";

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit(values);
        onOpenChange(false)
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Interface Text</DialogTitle>
                    <DialogDescription>
                        Add content to an interface or fetch its current content.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 md:grid-cols-2">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="space-y-8 mt-4"
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
                            name="interfaceId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Interface</FormLabel>
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
                                            {textInterfaces.map((item) => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Select the text interface this node should use.
                                    </FormDescription>
                                    <FormMessage />

                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="operation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Operation</FormLabel>
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
                                            <SelectItem value="ADD_CONTENT">Add Content</SelectItem>
                                            <SelectItem value="GET_CONTENT">Get Content</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Choose whether to append content or read existing content.
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
                                        <FormLabel>Content to Add</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="min-h-[120px] font-mono text-sm"
                                                placeholder="Write text or use {{template}} variables from context"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Supports Handlebars templates like {`{{variableName}}`}.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {interfacesQuery.isLoading && (
                            <p className="text-xs text-muted-foreground">Loading interfaces...</p>
                        )}
                        {!interfacesQuery.isLoading && textInterfaces.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No text interfaces found. Create one in the Interfaces page first.
                            </p>
                        )}
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
                                Execute this workflow to view the latest Interface Text node output here.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}