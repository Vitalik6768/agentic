"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod";
import type { AvailableVariable, UpstreamVariableNodeOption } from "@/lib/variable-picker";
import { TemplateVariableInput, unwrapTemplateToken } from "@/lib/template-highlight";
import { NodeDialogEntity, NodeDialogEntityFooter } from "@/components/node-dialog-entity";
import { NODE_VARIABLE_NAME_REGEX, type NodeDialogNameFieldHandle } from "@/components/node-dialog-name-field";
import { DIALOG_CONTENT_STYLE, PANELS_STYLES } from "../constants";
import { cn } from "@/lib/utils";
import { Check, GitBranch, Plus, X } from "lucide-react";

const operatorSchema = z.enum(["eq", "ne", "gt", "gte", "lt", "lte"]);
type Operator = z.infer<typeof operatorSchema>;

const conditionRowSchema = z.object({
  left: z.string().trim().min(1, { message: "Value 1 is required" }),
  operator: operatorSchema,
  right: z.string().trim().min(1, { message: "Value 2 is required" }),
});

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(NODE_VARIABLE_NAME_REGEX, { message: "Invalid variable name" }),
  conditions: z.array(conditionRowSchema).min(1, { message: "Add at least one condition" }),
  // kept for legacy/back-compat; we compute it from conditions on submit.
  expression: z.string().optional(),
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

export const ConditionNodeDialog = ({
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
  const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);
  const initialName = defaultValues.variableName ?? "";
  const [activeConditionIndex, setActiveConditionIndex] = useState(0);
  const leftInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const normalizedDefaultConditions = useMemo(() => {
    const incoming = (defaultValues as Partial<ConditionDialogValues> & { conditions?: unknown })?.conditions;
    if (Array.isArray(incoming) && incoming.length > 0) {
      return incoming
        .map((c) => {
          if (!c || typeof c !== "object") return null;
          const obj = c as Partial<z.infer<typeof conditionRowSchema>>;
          return {
            left: typeof obj.left === "string" ? obj.left : "",
            operator: operatorSchema.safeParse(obj.operator).success ? (obj.operator!) : "eq",
            right: typeof obj.right === "string" ? obj.right : "",
          };
        })
        .filter(Boolean) as Array<z.infer<typeof conditionRowSchema>>;
    }
    return [{ left: "", operator: "eq", right: "" }] satisfies Array<z.infer<typeof conditionRowSchema>>;
  }, [defaultValues]);

  const form = useForm<ConditionDialogValues>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      variableName: defaultValues.variableName ?? "",
      conditions: normalizedDefaultConditions,
      expression: defaultValues.expression ?? "",
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName ?? "",
        conditions: normalizedDefaultConditions,
        expression: defaultValues.expression ?? "",
      });
      setActiveConditionIndex(0);
    }
  }, [defaultValues, open, form, normalizedDefaultConditions]);

  const normalizeHandlebarsArg = (raw: string): string => {
    const value = raw.trim();
    // If user inserted a template token like {{ foo.bar }}, convert to foo.bar for helper args.
    const unwrapped = unwrapTemplateToken(value);
    if (unwrapped) return unwrapped;
    // Already quoted literal.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value;
    // Numbers / booleans / null.
    if (/^-?\d+(\.\d+)?$/.test(value)) return value;
    if (/^(true|false|null)$/i.test(value)) return value.toLowerCase();
    // Otherwise treat as string literal.
    return JSON.stringify(value);
  };

  const buildExpressionFromConditions = (rows: Array<z.infer<typeof conditionRowSchema>>): string => {
    if (rows.length === 0) return "";

    const toComparison = (c: z.infer<typeof conditionRowSchema>) =>
      `${c.operator} ${normalizeHandlebarsArg(c.left)} ${normalizeHandlebarsArg(c.right)}`;

    // Single condition: top-level helper call (no parens).
    if (rows.length === 1) {
      const first = rows[0];
      if (!first) return "";
      return `{{${toComparison(first)}}}`;
    }

    // Multiple: top-level `and` with subexpressions.
    // Example: {{and (eq a b) (and (gt c d) (lt e f))}}
    const parts = rows.map((c) => `(${toComparison(c)})`);
    const rest = parts
      .slice(1)
      .reduceRight((acc, cur) => (acc ? `(and ${cur} ${acc})` : cur), "");

    return `{{and ${parts[0]!} ${rest}}}`;
  };

  const handleSubmit = (values: ConditionDialogValues) => {
    const err = nameFieldRef.current?.validate();
    if (err) {
      nameFieldRef.current?.enterEditMode();
      nameFieldRef.current?.focusNameInput();
      return;
    }

    const name = nameFieldRef.current?.getTrimmedName() ?? "";
    form.setValue("variableName", name, { shouldDirty: true });
    const expression = buildExpressionFromConditions(values.conditions);
    form.setValue("expression", expression, { shouldDirty: true });
    onSubmit({ ...values, variableName: name, expression });
    onOpenChange(false);
  };

  const handleInsertVariable = (token: string) => {
    const currentIndex = Math.max(0, Math.min(activeConditionIndex, fields.length - 1));
    const fieldName = `conditions.${currentIndex}.left` as const;
    const currentValue = form.getValues(fieldName) ?? "";
    const input = leftInputRefs.current[currentIndex];

    if (!input) {
      form.setValue(fieldName, `${currentValue}${token}`, { shouldDirty: true });
      return;
    }

    const start = input.selectionStart ?? currentValue.length;
    const end = input.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
    form.setValue(fieldName, nextValue, { shouldDirty: true });

    requestAnimationFrame(() => {
      input.focus();
      const nextCursor = start + token.length;
      input.setSelectionRange(nextCursor, nextCursor);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CONTENT_STYLE}>
        <NodeDialogEntity
          ref={nameFieldRef}
          open={open}
          initialName={initialName}
          title="Condition"
          description="Branch the workflow based on a boolean expression."
          icon={<GitBranch className="h-6 w-6 opacity-95" />}
          placeholder="condition1"
          helpText="Canvas label and variable for this step’s output."
        />
        <div className={PANELS_STYLES}>
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
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="space-y-3">
                  {fields.map((item, index) => {
                    const operator = form.watch(`conditions.${index}.operator`);
                    return (
                      <div key={item.id} className="rounded-md border bg-background">
                        <div className="flex items-stretch gap-0">
                          <div className="flex-1">
                            <FormField
                              control={form.control}
                              name={`conditions.${index}.left`}
                              render={({ field }) => {
                                const { ref, value, ...fieldProps } = field;
                                return (
                                  <FormItem className="space-y-0">
                                    <FormControl>
                                      <TemplateVariableInput
                                        ref={(el) => {
                                          ref(el);
                                          leftInputRefs.current[index] = el;
                                        }}
                                        value={value ?? ""}
                                        onFocus={() => setActiveConditionIndex(index)}
                                        placeholder="value1"
                                        className="rounded-none border-0 border-r focus-visible:ring-0"
                                        {...fieldProps}
                                      />
                                    </FormControl>
                                  </FormItem>
                                );
                              }}
                            />
                          </div>
                          <div className="w-[220px] shrink-0">
                            <FormField
                              control={form.control}
                              name={`conditions.${index}.operator`}
                              render={({ field }) => (
                                <FormItem className="space-y-0">
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="h-10 rounded-none border-0 focus:ring-0">
                                        <SelectValue placeholder="Operator" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="eq">is equal to</SelectItem>
                                      <SelectItem value="ne">is not equal to</SelectItem>
                                      <SelectItem value="gt">is greater than</SelectItem>
                                      <SelectItem value="gte">is greater than or equal</SelectItem>
                                      <SelectItem value="lt">is less than</SelectItem>
                                      <SelectItem value="lte">is less than or equal</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </div>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex w-10 items-center justify-center border-l text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                              fields.length === 1 ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                            )}
                            onClick={() => {
                              if (fields.length === 1) return;
                              remove(index);
                              setActiveConditionIndex((prev) => {
                                if (prev > index) return prev - 1;
                                if (prev === index) return Math.max(0, prev - 1);
                                return prev;
                              });
                            }}
                            disabled={fields.length === 1}
                            aria-label="Remove condition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="border-t">
                          <FormField
                            control={form.control}
                            name={`conditions.${index}.right`}
                            render={({ field }) => {
                              const { value, ...fieldProps } = field;
                              return (
                                <FormItem className="space-y-0">
                                  <FormControl>
                                    <TemplateVariableInput
                                      value={value ?? ""}
                                      placeholder="value2"
                                      className="rounded-none border-0 focus-visible:ring-0"
                                      {...fieldProps}
                                    />
                                  </FormControl>
                                </FormItem>
                              );
                            }}
                          />
                        </div>
                        <div className="hidden">
                          <span>{operator}</span>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      append({ left: "", operator: "eq", right: "" });
                      setActiveConditionIndex(fields.length);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add condition
                  </Button>
                </div>
                <FormDescription>
                  Build conditions using Handlebars variables (insert from the left panel). Multiple conditions are combined with AND.
                </FormDescription>
                <FormMessage />
                <NodeDialogEntityFooter />
              </form>
            </Form>
          </div>
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