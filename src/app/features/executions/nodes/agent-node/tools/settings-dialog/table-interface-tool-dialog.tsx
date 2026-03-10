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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TableInterfaceToolConfig } from "../types";

const formSchema = z
  .object({
    interfaceId: z.string().min(1, { message: "Interface is required" }),
    operation: z.enum(["GET_CONTENT", "ADD_CONTENT", "APPEND_CONTENT", "UPDATE_CONTENT"]),
    contentSource: z.enum(["TEMPLATE", "AGENT_INPUT"]).optional(),
    body: z.string().optional(),
    matchField: z.string().optional(),
    matchValue: z.string().optional(),
    updateField: z.string().optional(),
    updateValue: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const isAddOrAppend = values.operation === "ADD_CONTENT" || values.operation === "APPEND_CONTENT";
    if (isAddOrAppend && (values.contentSource ?? "TEMPLATE") === "TEMPLATE" && !values.body?.trim()) {
      ctx.addIssue({
        path: ["body"],
        code: "custom",
        message: "Row content template is required when source is Template.",
      });
    }

    if (values.operation === "UPDATE_CONTENT") {
      if (!values.matchField?.trim()) {
        ctx.addIssue({
          path: ["matchField"],
          code: "custom",
          message: "Match field is required for update.",
        });
      }
      if (!values.matchValue?.trim()) {
        ctx.addIssue({
          path: ["matchValue"],
          code: "custom",
          message: "Match value is required for update.",
        });
      }
      if (!values.updateField?.trim()) {
        ctx.addIssue({
          path: ["updateField"],
          code: "custom",
          message: "Update field is required for update.",
        });
      }
      if (!values.updateValue?.trim()) {
        ctx.addIssue({
          path: ["updateValue"],
          code: "custom",
          message: "Update value is required for update.",
        });
      }
    }
  });

interface TableInterfaceToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValue?: TableInterfaceToolConfig;
  onSave: (value: TableInterfaceToolConfig) => void;
}

export const TableInterfaceToolDialog = ({
  open,
  onOpenChange,
  defaultValue,
  onSave,
}: TableInterfaceToolDialogProps) => {
  const trpc = useTRPC();
  const interfacesQuery = useQuery(trpc.interfaces.getMany.queryOptions());
  const tableInterfaces =
    interfacesQuery.data?.items.filter((item) => item.type === InterfaceType.TABLE) ?? [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      interfaceId: defaultValue?.interfaceId ?? "",
      operation: defaultValue?.operation ?? "GET_CONTENT",
      contentSource: defaultValue?.contentSource ?? "TEMPLATE",
      body: defaultValue?.body ?? "",
      matchField: defaultValue?.matchField ?? "",
      matchValue: defaultValue?.matchValue ?? "",
      updateField: defaultValue?.updateField ?? "",
      updateValue: defaultValue?.updateValue ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      interfaceId: defaultValue?.interfaceId ?? "",
      operation: defaultValue?.operation ?? "GET_CONTENT",
      contentSource: defaultValue?.contentSource ?? "TEMPLATE",
      body: defaultValue?.body ?? "",
      matchField: defaultValue?.matchField ?? "",
      matchValue: defaultValue?.matchValue ?? "",
      updateField: defaultValue?.updateField ?? "",
      updateValue: defaultValue?.updateValue ?? "",
    });
  }, [defaultValue, form, open]);

  const operation = form.watch("operation");
  const contentSource = form.watch("contentSource") ?? "TEMPLATE";
  const isAddOrAppend = operation === "ADD_CONTENT" || operation === "APPEND_CONTENT";
  const showBody = isAddOrAppend && contentSource === "TEMPLATE";
  const isUpdate = operation === "UPDATE_CONTENT";

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure Table Interface Tool</DialogTitle>
          <DialogDescription>
            Read rows, append rows, or update matching rows in a selected Table Interface.
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
                        <SelectValue placeholder="Select table interface" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tableInterfaces.map((item) => (
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
                      <SelectItem value="ADD_CONTENT">Add Row</SelectItem>
                      <SelectItem value="APPEND_CONTENT">Append Row</SelectItem>
                      <SelectItem value="UPDATE_CONTENT">Update Content</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isAddOrAppend && (
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
                      Template expects JSON object/array string. Agent Input uses runtime tool input.
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
                    <FormLabel>Row Content Template</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[100px] font-mono text-sm"
                        placeholder='Example: {"Name":"{{customer.name}}","Status":"pending"}'
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Supports Handlebars variables from workflow context.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isUpdate && (
              <>
                <FormField
                  control={form.control}
                  name="matchField"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Field (Header)</FormLabel>
                      <FormControl>
                        <Input placeholder="Example: Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="matchValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Value</FormLabel>
                      <FormControl>
                        <Input placeholder="Example: {{user.email}}" {...field} />
                      </FormControl>
                      <FormDescription>Can use Handlebars variables.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="updateField"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Update Field (Header)</FormLabel>
                      <FormControl>
                        <Input placeholder="Example: Status" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="updateValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Update Value</FormLabel>
                      <FormControl>
                        <Input placeholder="Example: completed" {...field} />
                      </FormControl>
                      <FormDescription>Can use Handlebars variables.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {isAddOrAppend && contentSource === "AGENT_INPUT" && (
              <p className="text-xs text-muted-foreground">
                Agent should call this tool with a <code>content</code> input (string, array, or object).
              </p>
            )}

            {interfacesQuery.isLoading && (
              <p className="text-xs text-muted-foreground">Loading interfaces...</p>
            )}
            {!interfacesQuery.isLoading && tableInterfaces.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No table interfaces found. Create one in Interfaces first.
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
