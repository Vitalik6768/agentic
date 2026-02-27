"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "next/navigation";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import z from "zod";

const formSchema = z.object({
  method: z.enum(["GET", "POST"]),
});

export type WebhookTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WebhookTriggerFormValues) => void;
  defaultValues?: Partial<WebhookTriggerFormValues>;
  executionStatus?: NodeStatus;
  executionOutput?: string;
  executionError?: string;
}

export const WebhookTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  executionStatus = "initial",
  executionOutput = "",
  executionError,
}: Props) => {
  const params = useParams<{ workflowsId?: string | string[] }>();
  const workflowIdValue = params.workflowsId;
  const workflowId = Array.isArray(workflowIdValue) ? workflowIdValue[0] : workflowIdValue;
  const webhookUrl =
    workflowId && typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/workflow?workflowId=${workflowId}`
      : "";

  const form = useForm<WebhookTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      method: defaultValues.method ?? "POST",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        method: defaultValues.method ?? "POST",
      });
    }
  }, [defaultValues, open, form]);

  const handleSubmit = (values: WebhookTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const handleCopyUrl = async () => {
    if (!webhookUrl || !navigator?.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(webhookUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Webhook Trigger</DialogTitle>
          <DialogDescription>
            Choose which HTTP method can trigger this workflow.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allowed Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel>Webhook URL</FormLabel>
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl} placeholder="Save workflow to generate URL" />
                  <Button type="button" variant="outline" onClick={handleCopyUrl} disabled={!webhookUrl}>
                    Copy
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full" type="submit">
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
          <div className="rounded-md border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Execution Output</h3>
              <span className="text-xs text-muted-foreground">
                {executionStatus === "loading"
                  ? "Running..."
                  : executionStatus === "success"
                    ? "Completed"
                    : executionStatus === "error"
                      ? "Failed"
                      : "Idle"}
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
                Execute this workflow to view the latest Webhook trigger output here.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
