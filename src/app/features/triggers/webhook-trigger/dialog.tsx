"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "next/navigation";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { ExecutionOutputPanel } from "@/components/data-transfer";
import { NodeDialogEntityFooter } from "@/components/node-dialog-entity";
import { TriggerDialogEntity } from "@/components/trigger-dialog-entity";
import { Webhook } from "lucide-react";
import z from "zod";
import { TRIGGER_DIALOG_CONTENT_STYLE, TRIGGER_PANELS_STYLES } from "../trigger-constants";

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
  const prodWebhookUrl =
    workflowId && typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/prod/workflow?workflowId=${workflowId}`
      : "";

  const form = useForm<WebhookTriggerFormValues>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
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

  const handleCopyUrl = async (url: string) => {
    if (!url || !navigator?.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={TRIGGER_DIALOG_CONTENT_STYLE}>
        <TriggerDialogEntity
          title="Webhook Trigger"
          description="Choose which HTTP method can trigger this workflow."
          icon={<Webhook className="h-6 w-6 opacity-95" />}
        />
        <div className={TRIGGER_PANELS_STYLES}>
          <div className="overflow-y-auto pr-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopyUrl(webhookUrl)}
                    disabled={!webhookUrl}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <FormLabel>Production Webhook URL</FormLabel>
                <div className="flex gap-2">
                  <Input readOnly value={prodWebhookUrl} placeholder="Save workflow to generate URL" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopyUrl(prodWebhookUrl)}
                    disabled={!prodWebhookUrl}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              <NodeDialogEntityFooter />
              </form>
            </Form>
          </div>

          <ExecutionOutputPanel
            executionStatus={executionStatus}
            executionOutput={executionOutput}
            executionError={executionError}
            idleMessage="Execute this workflow to view the latest Webhook trigger output here."
            className="max-h-[420px] overflow-hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
