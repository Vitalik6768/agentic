"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import type { AvailableVariable, UpstreamVariableNodeOption } from "@/lib/variable-picker";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
  expression: z.string().min(1, { message: "Condition expression is required" }),
});

export type ConditionDialogValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ConditionDialogValues) => void;
  defaultValues?: Partial<ConditionDialogValues>;
  executionStatus?: NodeStatus;
  executionOutput?: string;
  executionError?: string;
  availableVariables?: AvailableVariable[];
  isLoadingVariables?: boolean;
  selectedNodeId?: string;
  onSelectedNodeIdChange?: (nodeId: string) => void;
  nodeOptions?: UpstreamVariableNodeOption[];
}

export const ConditionDialog = ({
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
  const expressionInputRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<ConditionDialogValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      expression: defaultValues.expression ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName ?? "",
        expression: defaultValues.expression ?? "",
      });
    }
  }, [defaultValues, open, form]);

  const handleSubmit = (values: ConditionDialogValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const handleInsertVariable = (token: string) => {
    const input = expressionInputRef.current;
    const currentValue = form.getValues("expression") ?? "";
    if (!input) {
      form.setValue("expression", `${currentValue}${token}`, { shouldDirty: true });
      return;
    }

    const start = input.selectionStart ?? currentValue.length;
    const end = input.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
    form.setValue("expression", nextValue, { shouldDirty: true });

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
          <DialogTitle>Condition If</DialogTitle>
          <DialogDescription>
            If true it continues from the right handle, if false it goes to the bottom handle.
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="variableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variable Name</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="isConditionTrue" {...field} />
                    </FormControl>
                    <FormDescription>
                      Stores the condition result in workflow context as true or false.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expression"
                render={({ field }) => {
                  const { ref, ...fieldProps } = field;
                  return (
                    <FormItem>
                      <FormLabel>Condition Expression</FormLabel>
                      <FormControl>
                        <Input
                          ref={(element) => {
                            ref(element);
                            expressionInputRef.current = element;
                          }}
                          type="text"
                          placeholder='{{set_value}} == "ok"'
                          {...fieldProps}
                        />
                      </FormControl>
                      <FormDescription>
                        Use Handlebars variables. If rendered value is true/1 it goes right, otherwise bottom.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <DialogFooter>
                <Button className="w-full" type="submit">
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
          <ExecutionOutputPanel
            executionStatus={executionStatus}
            executionOutput={executionOutput}
            executionError={executionError}
            idleMessage="Execute this workflow to view the latest Condition node output here."
            className="max-h-[72vh] overflow-hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};