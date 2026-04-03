"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTransferPanel, ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import { useTRPC } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { InterfaceType } from "generated/prisma";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import type { AvailableVariable } from "@/lib/variable-picker";
import { toast } from "sonner";
import { Table2, Zap } from "lucide-react";
import { NodeDialogNameField, type NodeDialogNameFieldHandle } from "@/components/node-dialog-name-field";

/**
 * Read column names from the table header row (`rows[0].cells`) — e.g. `id`, `email`.
 * Coerces each cell to string (same idea as the table executor) so labels match the UI table.
 */
function getColumnLabelsFromDataJson(dataJson: unknown): string[] {
  if (dataJson == null) return [];
  let parsed: unknown = dataJson;
  if (typeof dataJson === "string") {
    try {
      parsed = JSON.parse(dataJson) as unknown;
    } catch {
      return [];
    }
  }
  if (!parsed || typeof parsed !== "object") return [];
  const rows = (parsed as { rows?: unknown }).rows;
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const firstRow = rows[0] as { cells?: unknown } | undefined;
  if (!firstRow || !Array.isArray(firstRow.cells)) return [];

  return firstRow.cells.map((cell, index) => {
    const asString = typeof cell === "string" ? cell : cell != null ? String(cell) : "";
    const trimmed = asString.trim();
    return trimmed || `Column ${index + 1}`;
  });
}

const formSchema = z
  .object({
    variableName: z
      .string()
      .min(1, { message: "Variable name is required" })
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, { message: "Invalid variable name" }),
    interfaceId: z.string().min(1, { message: "Interface is required" }),
    operation: z.enum(["GET_DATA", "APPEND_DATA", "UPDATE_DATA"]),
    appendColumnValues: z.array(z.string()),
    matchField: z.string().optional(),
    matchValue: z.string().optional(),
    updateField: z.string().optional(),
    updateValue: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.operation === "UPDATE_DATA") {
      if (!values.matchField?.trim()) {
        ctx.addIssue({
          path: ["matchField"],
          code: "custom",
          message: "Match field is required when operation is Update Data",
        });
      }

      if (!values.matchValue?.trim()) {
        ctx.addIssue({
          path: ["matchValue"],
          code: "custom",
          message: "Match value is required when operation is Update Data",
        });
      }

      if (!values.updateField?.trim()) {
        ctx.addIssue({
          path: ["updateField"],
          code: "custom",
          message: "Update field is required when operation is Update Data",
        });
      }

      if (!values.updateValue?.trim()) {
        ctx.addIssue({
          path: ["updateValue"],
          code: "custom",
          message: "Update value is required when operation is Update Data",
        });
      }
    }
  });

export type InterfaceTableFormValues = z.infer<typeof formSchema>;
export type InterfaceTableVariableNodeOption = {
  nodeId: string;
  nodeType: string;
  variableRoot: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<InterfaceTableFormValues>;
  executionStatus?: NodeStatus;
  executionOutput?: string;
  executionError?: string;
  availableVariables?: AvailableVariable[];
  isLoadingVariables?: boolean;
  selectedNodeId?: string;
  onSelectedNodeIdChange?: (nodeId: string) => void;
  nodeOptions?: InterfaceTableVariableNodeOption[];
}

export const InterfaceTableDialog = ({
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
  const trpc = useTRPC();
  const interfacesQuery = useQuery(trpc.interfaces.getMany.queryOptions());
  const tableInterfaces = interfacesQuery.data?.items.filter((item) => item.type === InterfaceType.TABLE) ?? [];
  const [activeTarget, setActiveTarget] = useState<"append" | "matchValue" | "updateValue">("matchValue");
  const [activeAppendColumnIndex, setActiveAppendColumnIndex] = useState<number | null>(null);
  const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);
  const initialName = defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      variableName: defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "",
      interfaceId: defaultValues.interfaceId ?? "",
      operation:
        defaultValues.operation ??
        ((defaultValues as { method?: "ADD" | "GET" }).method === "ADD" ? "UPDATE_DATA" : "GET_DATA"),
      appendColumnValues: defaultValues.appendColumnValues ?? [],
      matchField: defaultValues.matchField ?? "",
      matchValue: defaultValues.matchValue ?? "",
      updateField: defaultValues.updateField ?? "",
      updateValue: defaultValues.updateValue ?? "",
    },
  });

  const watchInterfaceId = form.watch("interfaceId");
  const watchOperation = form.watch("operation");
  const showAppendFields = watchOperation === "APPEND_DATA";
  const showUpdateFields = watchOperation === "UPDATE_DATA";

  const tableQuery = useQuery({
    ...(watchInterfaceId
      ? trpc.tableInterface.getOne.queryOptions({ id: watchInterfaceId })
      : trpc.tableInterface.getOne.queryOptions({ id: "" })),
    enabled: Boolean(watchInterfaceId) && open,
  });

  /** One label per table column (first row), for append row fields. */
  const columnLabels = useMemo(() => {
    return getColumnLabelsFromDataJson(tableQuery.data?.table?.dataJson);
  }, [tableQuery.data?.table?.dataJson]);

  const headerFields = useMemo(() => {
    return columnLabels.filter((value, index, list) => list.indexOf(value) === index);
  }, [columnLabels]);

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "",
        interfaceId: defaultValues.interfaceId ?? "",
        operation:
          defaultValues.operation ??
          ((defaultValues as { method?: "ADD" | "GET" }).method === "ADD" ? "UPDATE_DATA" : "GET_DATA"),
        appendColumnValues: defaultValues.appendColumnValues?.length
          ? defaultValues.appendColumnValues
          : [],
        matchField: defaultValues.matchField ?? "",
        matchValue: defaultValues.matchValue ?? "",
        updateField: defaultValues.updateField ?? "",
        updateValue: defaultValues.updateValue ?? "",
      });
    }
  }, [defaultValues, open, form]);

  /** Keep one form value per column before inputs render (avoids empty append fields). */
  useLayoutEffect(() => {
    if (!open || watchOperation !== "APPEND_DATA") return;

    const len = columnLabels.length;
    const current = form.getValues("appendColumnValues") ?? [];
    const saved = defaultValues.appendColumnValues ?? [];
    const next = Array.from({ length: len }, (_, i) => current[i] ?? saved[i] ?? "");
    form.setValue("appendColumnValues", next, { shouldDirty: false });
  }, [open, watchOperation, columnLabels, defaultValues.appendColumnValues, form]);

  const handleInsertVariable = (token: string) => {
    if (activeTarget === "append" && activeAppendColumnIndex !== null) {
      const path = `appendColumnValues.${activeAppendColumnIndex}` as const;
      const current = (form.getValues(path) as string | undefined) ?? "";
      form.setValue(path, `${current}${token}`, { shouldDirty: true });
      return;
    }

    if (activeTarget === "matchValue") {
      const current = form.getValues("matchValue") ?? "";
      form.setValue("matchValue", `${current}${token}`, { shouldDirty: true });
      return;
    }

    const current = form.getValues("updateValue") ?? "";
    form.setValue("updateValue", `${current}${token}`, { shouldDirty: true });
  };

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const err = nameFieldRef.current?.validate();
    if (err) {
      nameFieldRef.current?.enterEditMode();
      nameFieldRef.current?.focusNameInput();
      return;
    }
    const name = nameFieldRef.current?.getTrimmedName() ?? "";
    // Header name field is the source of truth for the node label.
    // Keep the form value in sync so saved data matches what the user sees.
    form.setValue("variableName", name, { shouldDirty: true });
    const nextValues = { ...values, variableName: name };

    if (values.operation === "APPEND_DATA") {
      if (columnLabels.length === 0) {
        toast.error("This table has no columns. Add a header row in the table interface first.");
        return;
      }
      const padded = Array.from({ length: columnLabels.length }, (_, i) => nextValues.appendColumnValues?.[i] ?? "");
      onSubmit({ ...nextValues, appendColumnValues: padded });
      onOpenChange(false);
      return;
    }
    onSubmit(nextValues);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[98vw] overflow-hidden rounded-2xl border border-border bg-background p-0 shadow-lg sm:max-w-7xl">
        <DialogHeader>
          <div className="w-full rounded-t-2xl border-b bg-linear-to-r from-blue-100/80 via-blue-50/40 to-blue-50/20 px-6 py-5 dark:from-blue-950/55 dark:via-blue-950/25 dark:to-background">
            <DialogTitle className="sr-only">Interface Table</DialogTitle>
            <div className="flex items-start gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/20">
                <Table2 className="h-6 w-6 opacity-95" />
              </span>
              <div className="min-w-0 flex-1">
                <NodeDialogNameField
                  ref={nameFieldRef}
                  open={open}
                  initialName={initialName}
                  placeholder="interfaceTable1"
                  variant="header"
                  helpText="Canvas label and variable name for this table step."
                />
                <DialogDescription className="pt-2">
                  Read, append, or update rows in a Table Interface and store results for downstream nodes.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="grid h-[calc(90vh-88px)] items-start gap-6 overflow-hidden bg-background px-6 py-6 md:grid-cols-3 md:gap-8">
          <div className="flex h-full flex-col overflow-y-auto">
            <VariablePickerPanel
              items={availableVariables}
              isLoading={isLoadingVariables}
              nodeOptions={nodeOptions}
              selectedNodeId={selectedNodeId}
              onSelectedNodeIdChange={onSelectedNodeIdChange}
              onInsertVariable={handleInsertVariable}
              resetModeKey={open}
              className="flex-1 rounded-2xl border border-emerald-200 bg-white p-4"
            />
          </div>

          <div className="flex h-full min-h-0 flex-col">
            <DataTransferPanel
              title="Interface Table Settings"
              subtitle="Configure interface and operation"
              icon={<Zap className="h-4 w-4 text-sky-600" />}
              className="flex-1 min-h-0 rounded-2xl border border-sky-200 bg-white p-4"
            >
              <div className="flex h-full min-h-0 flex-col">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleSubmit)}
                    className="flex h-full min-h-0 flex-1 flex-col"
                  >
                    <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pr-1 pb-20">
                <FormField
                  control={form.control}
                  name="interfaceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interface</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a table interface" />
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
                      <FormDescription>Select the table interface this node should use.</FormDescription>
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
                          <SelectItem value="GET_DATA">Get Data</SelectItem>
                          <SelectItem value="APPEND_DATA">Append row</SelectItem>
                          <SelectItem value="UPDATE_DATA">Update Data</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Choose how this node interacts with the table.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showAppendFields && (
                  <div
                    key={`append-${watchInterfaceId ?? "none"}-${columnLabels.length}`}
                    className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">Values for the new row</p>
                      <p className="text-xs text-muted-foreground">
                        Labels come from the first row of your table (e.g. <strong>id</strong>,{" "}
                        <strong>email</strong>) — one input per column. You can use{" "}
                        <code className="rounded bg-muted px-1">{"{{variables}}"}</code> from the workflow.
                      </p>
                    </div>
                    {!watchInterfaceId && (
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        Select a table interface above to load column names and fields.
                      </p>
                    )}
                    {watchInterfaceId && tableQuery.isLoading && (
                      <p className="text-xs text-muted-foreground">Loading columns…</p>
                    )}
                    {showAppendFields && watchInterfaceId && !tableQuery.isLoading && columnLabels.length === 0 && (
                      <p className="text-xs text-destructive">
                        This table has no header row yet. Open the table in Interfaces and add column names in the
                        first row, then save.
                      </p>
                    )}
                    {columnLabels.map((label, index) => (
                      <Controller
                        key={`append-${watchInterfaceId}-${index}-${label}`}
                        control={form.control}
                        name={`appendColumnValues.${index}`}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-foreground">{label}</FormLabel>
                            <FormControl>
                              <Input
                                className="bg-background"
                                {...field}
                                value={field.value ?? ""}
                                placeholder={`${label}…`}
                                autoComplete="off"
                                onFocus={() => {
                                  setActiveTarget("append");
                                  setActiveAppendColumnIndex(index);
                                }}
                              />
                            </FormControl>
                            {fieldState.error?.message ? (
                              <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                            ) : null}
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}

                {showUpdateFields && (
                  <FormField
                    control={form.control}
                    name="matchField"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Field</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose field to match" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {headerFields.map((fieldName) => (
                              <SelectItem key={fieldName} value={fieldName}>
                                {fieldName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Only non-empty header fields from table are listed.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {showUpdateFields && (
                  <FormField
                    control={form.control}
                    name="matchValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Value</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. {{customer.id}}"
                            onFocus={() => {
                              setActiveTarget("matchValue");
                              setActiveAppendColumnIndex(null);
                            }}
                          />
                        </FormControl>
                        <FormDescription>Rows with equal value in Match Field are updated.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {showUpdateFields && (
                  <FormField
                    control={form.control}
                    name="updateField"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Update Field</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose field to update" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {headerFields.map((fieldName) => (
                              <SelectItem key={fieldName} value={fieldName}>
                                {fieldName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {showUpdateFields && (
                  <FormField
                    control={form.control}
                    name="updateValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Update Value</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. {{order.status}}"
                            onFocus={() => {
                              setActiveTarget("updateValue");
                              setActiveAppendColumnIndex(null);
                            }}
                          />
                        </FormControl>
                        <FormDescription>Supports Handlebars templates from workflow context.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {interfacesQuery.isLoading && <p className="text-xs text-muted-foreground">Loading interfaces...</p>}
                {!interfacesQuery.isLoading && tableInterfaces.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No table interfaces found. Create one in the Interfaces page first.
                  </p>
                )}
                {showUpdateFields && watchInterfaceId && !tableQuery.isLoading && headerFields.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No table fields found. Add header values in first row of this table first.
                  </p>
                )}
                <DialogFooter className="mt-4">
                  <Button className="w-full" type="submit">
                    Save
                  </Button>
                </DialogFooter>
                    </div>
                    <DialogFooter className="pt-2">
                      <Button className="w-full" type="submit">
                        Save
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </div>
            </DataTransferPanel>
          </div>

          <div className="flex h-full flex-col">
            <ExecutionOutputPanel
              executionStatus={executionStatus}
              executionOutput={executionOutput}
              executionError={executionError}
              idleMessage="Execute this workflow to view the latest Interface Table node output here."
              className="flex-1 rounded-2xl border border-amber-200 bg-white p-4"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
