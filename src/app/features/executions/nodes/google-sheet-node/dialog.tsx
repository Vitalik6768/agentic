"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetCredentialsByType } from "@/app/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import type { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { ExecutionOutputPanel, VariablePickerPanel } from "@/components/data-transfer";
import type { AvailableVariable } from "@/lib/variable-picker";
import { NodeDialogEntity, NodeDialogEntityFooter } from "@/components/node-dialog-entity";
import { type NodeDialogNameFieldHandle } from "@/components/node-dialog-name-field";
import { SheetIcon } from "lucide-react";
import { DIALOG_CONTENT_STYLE, PANELS_STYLES } from "../constants";
import { NODE_VARIABLE_NAME_REGEX } from "@/components/node-dialog-name-field";
import { TemplateVariableTextarea } from "@/lib/template-highlight";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(NODE_VARIABLE_NAME_REGEX, { message: "Invalid variable name" }),
  authType: z.enum(["OAUTH", "SERVICE_ACCOUNT"]),
  credentialId: z.string().optional(),
  spreadsheetId: z.string().min(1, { message: "Spreadsheet ID is required" }),
  sheetName: z.string().min(1, { message: "Sheet name is required (e.g. Sheet1)" }),
  range: z.string().optional(),
  operation: z.enum(["GET_ROWS", "APPEND_ROWS", "UPDATE_RANGE"]),
  valueInputOption: z.enum(["RAW", "USER_ENTERED"]),
  valuesJson: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.authType === "SERVICE_ACCOUNT") {
    if (!values.credentialId?.trim()) {
      ctx.addIssue({
        path: ["credentialId"],
        code: "custom",
        message: "Google credential is required for Service Account auth",
      });
    }
  }
  if (values.authType === "OAUTH") {
    if (!values.credentialId?.trim()) {
      ctx.addIssue({
        path: ["credentialId"],
        code: "custom",
        message: "Google OAuth credential is required",
      });
    }
  }

  if (values.operation === "UPDATE_RANGE" && !values.range?.trim()) {
    ctx.addIssue({
      path: ["range"],
      code: "custom",
      message: 'Range is required for Update (e.g. "Sheet1!A1:C10")',
    });
  }
});

export type GoogleSheetFormValues = z.infer<typeof formSchema>;

export type GoogleSheetVariableNodeOption = {
  nodeId: string;
  nodeType: string;
  variableRoot: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleSheetFormValues) => void;
  defaultValues?: Partial<GoogleSheetFormValues>;
  executionStatus?: NodeStatus;
  executionOutput?: string;
  executionError?: string;
  availableVariables?: AvailableVariable[];
  isLoadingVariables?: boolean;
  selectedNodeId?: string;
  onSelectedNodeIdChange?: (nodeId: string) => void;
  nodeOptions?: GoogleSheetVariableNodeOption[];
}

export const GoogleSheetDialog = ({
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
  const { data: credentials, isLoading: isLoadingCredentials } = useGetCredentialsByType(CredentialType.GOOGLE);
  const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);
  const valuesRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeTarget, setActiveTarget] = useState<"valuesJson">("valuesJson");

  const initialName = defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "";

  const form = useForm<GoogleSheetFormValues>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      variableName: initialName,
      authType: defaultValues.authType ?? "OAUTH",
      credentialId: defaultValues.credentialId ?? "",
      spreadsheetId: defaultValues.spreadsheetId ?? "",
      sheetName: defaultValues.sheetName ?? "",
      range: defaultValues.range ?? "",
      operation: defaultValues.operation ?? "GET_ROWS",
      valueInputOption: defaultValues.valueInputOption ?? "USER_ENTERED",
      valuesJson: defaultValues.valuesJson ?? '[""]',
    },
  });

  const watchAuthType = form.watch("authType");
  const watchOperation = form.watch("operation");
  const showValues = watchOperation === "APPEND_ROWS" || watchOperation === "UPDATE_RANGE";
  const showRange = watchOperation === "UPDATE_RANGE";

  useEffect(() => {
    if (!open) return;
    form.reset({
      variableName: initialName,
      authType: defaultValues.authType ?? "OAUTH",
      credentialId: defaultValues.credentialId ?? "",
      spreadsheetId: defaultValues.spreadsheetId ?? "",
      sheetName: defaultValues.sheetName ?? "",
      range: defaultValues.range ?? "",
      operation: defaultValues.operation ?? "GET_ROWS",
      valueInputOption: defaultValues.valueInputOption ?? "USER_ENTERED",
      valuesJson: defaultValues.valuesJson ?? '[""]',
    });
  }, [defaultValues, open, form, initialName]);

  const handleSubmit = (values: GoogleSheetFormValues) => {
    const err = nameFieldRef.current?.validate();
    if (err) {
      nameFieldRef.current?.enterEditMode();
      nameFieldRef.current?.focusNameInput();
      return;
    }
    const name = nameFieldRef.current?.getTrimmedName() ?? "";
    form.setValue("variableName", name, { shouldDirty: true });
    onSubmit({ ...values, variableName: name });
    onOpenChange(false);
  };

  const insertAtCursor = (token: string) => {
    const fieldName = "valuesJson";
    const textarea = valuesRef.current;
    const currentValue = form.getValues(fieldName) ?? "";
    if (!textarea) {
      form.setValue(fieldName, `${currentValue}${token}`, { shouldDirty: true });
      return;
    }
    const start = textarea.selectionStart ?? currentValue.length;
    const end = textarea.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
    form.setValue(fieldName, nextValue, { shouldDirty: true });
    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + token.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleInsertVariable = (token: string) => {
    if (activeTarget === "valuesJson") insertAtCursor(token);
  };

  const credentialOptions = useMemo(() => credentials ?? [], [credentials]);
  const selectedCredentialId = form.watch("credentialId") ?? "";
  const selectedCredential = useMemo(() => {
    return credentialOptions.find((c) => c.id === selectedCredentialId);
  }, [credentialOptions, selectedCredentialId]);
  const selectedCredentialSettings =
    selectedCredential?.settings && typeof selectedCredential.settings === "object"
      ? (selectedCredential.settings as Record<string, unknown>)
      : null;
  const connectedEmail =
    selectedCredentialSettings &&
    typeof (selectedCredentialSettings.googleOAuth as { email?: unknown } | undefined)?.email === "string"
      ? ((selectedCredentialSettings.googleOAuth as { email?: unknown }).email as string)
      : "";
  const connectedAt =
    selectedCredentialSettings &&
    typeof (selectedCredentialSettings.googleOAuth as { connectedAt?: unknown } | undefined)?.connectedAt === "string"
      ? ((selectedCredentialSettings.googleOAuth as { connectedAt?: unknown }).connectedAt as string)
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CONTENT_STYLE}>
        <NodeDialogEntity
          ref={nameFieldRef}
          open={open}
          initialName={initialName}
          title="Google Sheets"
          description="Get rows, append rows, or update a range in Google Sheets and store results for downstream nodes."
          icon={<SheetIcon className="h-6 w-6 opacity-95" />}
          placeholder="googleSheet1"
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
                <FormField
                  control={form.control}
                  name="authType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auth method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select auth method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="OAUTH">Use connected Google account (OAuth)</SelectItem>
                          <SelectItem value="SERVICE_ACCOUNT">Service Account JSON (credential)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        OAuth uses the logged-in user’s Google connection. Service Account uses a saved JSON credential.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchAuthType === "OAUTH" && (
                  <FormField
                    control={form.control}
                    name="credentialId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google OAuth Credential</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          disabled={isLoadingCredentials || !credentialOptions.length}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a credential" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {credentialOptions.map((credential) => (
                              <SelectItem key={credential.id} value={credential.id}>
                                <div className="flex items-center gap-2">
                                  <Image src="/logos/google.svg" alt="Google" width={16} height={16} />
                                  {credential.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Store your Google OAuth client in a credential (client id + secret), then connect it to a Google account.
                        </FormDescription>
                        <FormMessage />
                        {field.value ? (
                          <div className="flex flex-col gap-2 pt-2">
                            {connectedEmail || connectedAt ? (
                              <div className="text-xs text-muted-foreground">
                                Connected{connectedEmail ? ` as ${connectedEmail}` : ""}{connectedAt ? ` · ${connectedAt}` : ""}
                              </div>
                            ) : (
                              <div className="text-xs text-amber-600 dark:text-amber-500">
                                Not connected yet. Click “Connect” to store a refresh token in this credential.
                              </div>
                            )}
                            <Button type="button" variant="outline" asChild>
                              <Link href={`/api/google/oauth/start?credentialId=${encodeURIComponent(field.value)}`}>
                                Connect / Reconnect
                              </Link>
                            </Button>
                          </div>
                        ) : null}
                      </FormItem>
                    )}
                  />
                )}

                {watchAuthType === "SERVICE_ACCOUNT" && (
                  <FormField
                    control={form.control}
                    name="credentialId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Service Account Credential</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ""}
                          disabled={isLoadingCredentials || !credentialOptions.length}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a credential" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {credentialOptions.map((credential) => (
                              <SelectItem key={credential.id} value={credential.id}>
                                <div className="flex items-center gap-2">
                                  <Image src="/logos/google.svg" alt="Google" width={16} height={16} />
                                  {credential.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Paste your service account JSON into a Google credential. Then share the sheet with the service
                          account email.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="spreadsheetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spreadsheet ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" />
                      </FormControl>
                      <FormDescription>Paste the ID from the Google Sheets URL.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sheetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sheet name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder='e.g. "Sheet1"' />
                      </FormControl>
                      <FormDescription>The tab name inside the spreadsheet.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showRange && (
                  <FormField
                    control={form.control}
                    name="range"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Range (A1 notation)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder='e.g. "Sheet1!A1:C10"' />
                        </FormControl>
                        <FormDescription>Required only for Update Range.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                          <SelectItem value="GET_ROWS">Get rows</SelectItem>
                          <SelectItem value="APPEND_ROWS">Append row(s)</SelectItem>
                          <SelectItem value="UPDATE_RANGE">Update range</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showValues && (
                  <>
                    <FormField
                      control={form.control}
                      name="valueInputOption"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value input option</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USER_ENTERED">User entered</SelectItem>
                              <SelectItem value="RAW">Raw</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            <strong>USER_ENTERED</strong> interprets values like a user typing into the sheet (formulas,
                            dates). <strong>RAW</strong> stores exact strings.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valuesJson"
                      render={({ field }) => {
                        const { ref, value, ...fieldProps } = field;
                        return (
                          <FormItem>
                            <FormLabel>Values (JSON)</FormLabel>
                            <FormControl>
                              <TemplateVariableTextarea
                                ref={(el) => {
                                  ref(el);
                                  valuesRef.current = el;
                                }}
                                className="min-h-[120px] font-mono text-sm"
                                placeholder={'["value1","value2"] or [["r1c1","r1c2"],["r2c1","r2c2"]]'}
                                onFocus={() => setActiveTarget("valuesJson")}
                                value={value ?? ""}
                                {...fieldProps}
                              />
                            </FormControl>
                            <FormDescription>
                              You can use <code className="rounded bg-muted px-1">{"{{variables}}"}</code> inside the
                              JSON before it’s parsed.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </>
                )}

                <NodeDialogEntityFooter />
              </form>
            </Form>
          </div>

          <ExecutionOutputPanel
            executionStatus={executionStatus}
            executionOutput={executionOutput}
            executionError={executionError}
            idleMessage="Execute this workflow to view the latest Google Sheets node output here."
            className="max-h-[72vh] overflow-hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

