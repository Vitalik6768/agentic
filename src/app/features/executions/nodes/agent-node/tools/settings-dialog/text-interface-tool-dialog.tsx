"use client";

import { useEffect } from "react";
import { InterfaceType } from "generated/prisma";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useTRPC } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TextInterfaceToolConfig } from "../types";

const formSchema = z
  .object({
    interfaceId: z.string().min(1, { message: "Interface is required" }),
    operation: z.enum(["GET_CONTENT", "ADD_CONTENT"]),
    contentSource: z.enum(["TEMPLATE", "AGENT_INPUT"]).optional(),
    body: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (
      values.operation === "ADD_CONTENT" &&
      (values.contentSource ?? "TEMPLATE") === "TEMPLATE" &&
      !values.body?.trim()
    ) {
      ctx.addIssue({
        path: ["body"],
        code: "custom",
        message: "Content is required when operation is Add Content",
      });
    }
  });

interface TextInterfaceToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValue?: TextInterfaceToolConfig;
  onSave: (value: TextInterfaceToolConfig) => void;
}

export const TextInterfaceToolDialog = ({
  open,
  onOpenChange,
  defaultValue,
  onSave,
}: TextInterfaceToolDialogProps) => {
  const trpc = useTRPC();
  const interfacesQuery = useQuery(trpc.interfaces.getMany.queryOptions());
  const textInterfaces = interfacesQuery.data?.items.filter((item) => item.type === InterfaceType.TEXT) ?? [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      interfaceId: defaultValue?.interfaceId ?? "",
      operation: defaultValue?.operation ?? "GET_CONTENT",
      contentSource: defaultValue?.contentSource ?? "TEMPLATE",
      body: defaultValue?.body ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      interfaceId: defaultValue?.interfaceId ?? "",
      operation: defaultValue?.operation ?? "GET_CONTENT",
      contentSource: defaultValue?.contentSource ?? "TEMPLATE",
      body: defaultValue?.body ?? "",
    });
  }, [defaultValue, form, open]);

  const operation = form.watch("operation");
  const contentSource = form.watch("contentSource") ?? "TEMPLATE";
  const showBody = operation === "ADD_CONTENT" && contentSource === "TEMPLATE";

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Text Interface Tool</DialogTitle>
          <DialogDescription>
            This tool can read or append content in a selected Text Interface.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="interfaceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interface</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select text interface" />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GET_CONTENT">Get Content</SelectItem>
                      <SelectItem value="ADD_CONTENT">Add Content</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Add mode appends rendered text using workflow context variables.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {operation === "ADD_CONTENT" && (
              <FormField
                control={form.control}
                name="contentSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? "TEMPLATE"}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select content source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TEMPLATE">Template From Settings</SelectItem>
                        <SelectItem value="AGENT_INPUT">Agent Provides Content</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose whether content is fixed template or supplied by the agent at runtime.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showBody && (
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Template</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[120px] font-mono text-sm"
                        placeholder="Example: {{customer.name}}"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Supports Handlebars variables from workflow context.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {operation === "ADD_CONTENT" && contentSource === "AGENT_INPUT" && (
              <p className="text-xs text-muted-foreground">
                Agent will call this tool with a <code>content</code> input value to append.
              </p>
            )}

            {interfacesQuery.isLoading && (
              <p className="text-xs text-muted-foreground">Loading interfaces...</p>
            )}
            {!interfacesQuery.isLoading && textInterfaces.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No text interfaces found. Create one in Interfaces first.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
