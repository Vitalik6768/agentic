"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { FileTextIcon } from "lucide-react";
import { DIALOG_CONTENT_STYLE, PANELS_STYLES } from "../constants";
import { NODE_VARIABLE_NAME_REGEX } from "@/components/node-dialog-name-field";
import { TemplateVariableInput, TemplateVariableTextarea } from "@/lib/template-highlight";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";

const formSchema = z
  .object({
    variableName: z
      .string()
      .min(1, { message: "Variable name is required" })
      .regex(NODE_VARIABLE_NAME_REGEX, { message: "Invalid variable name" }),
    authType: z.enum(["OAUTH", "SERVICE_ACCOUNT"]),
    credentialId: z.string().optional(),
    documentId: z.string().min(1, { message: "Document ID is required" }),
    operation: z.enum(["GET_DOCUMENT", "UPDATE_DOCUMENT"]),
    updateMode: z.enum(["APPEND_TEXT", "REPLACE_ALL_TEXT"]),
    appendText: z.string().optional(),
    findText: z.string().optional(),
    replaceText: z.string().optional(),
    replaceMatchCase: z.boolean(),
  })
  .superRefine((values, ctx) => {
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
    if (values.operation === "UPDATE_DOCUMENT" && values.updateMode === "REPLACE_ALL_TEXT") {
      if (!values.findText?.trim()) {
        ctx.addIssue({
          path: ["findText"],
          code: "custom",
          message: "Find text is required for replace-all (can include {{variables}}).",
        });
      }
    }
  });

export type GoogleDocsFormValues = z.infer<typeof formSchema>;

export type GoogleDocsVariableNodeOption = {
  nodeId: string;
  nodeType: string;
  variableRoot: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleDocsFormValues) => void;
  defaultValues?: Partial<GoogleDocsFormValues>;
  executionStatus?: NodeStatus;
  executionOutput?: string;
  executionError?: string;
  availableVariables?: AvailableVariable[];
  isLoadingVariables?: boolean;
  selectedNodeId?: string;
  onSelectedNodeIdChange?: (nodeId: string) => void;
  nodeOptions?: GoogleDocsVariableNodeOption[];
}

type TextFieldName = "appendText" | "findText" | "replaceText";
type TemplateInsertField = "documentId" | TextFieldName;

export const GoogleDocsDialog = ({
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
  const documentIdRef = useRef<HTMLInputElement | null>(null);
  const appendRef = useRef<HTMLTextAreaElement | null>(null);
  const findRef = useRef<HTMLTextAreaElement | null>(null);
  const replaceRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeTarget, setActiveTarget] = useState<TemplateInsertField>("documentId");

  const initialName = defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "";

  const form = useForm<GoogleDocsFormValues>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      variableName: initialName,
      authType: defaultValues.authType ?? "OAUTH",
      credentialId: defaultValues.credentialId ?? "",
      documentId: defaultValues.documentId ?? "",
      operation: defaultValues.operation ?? "GET_DOCUMENT",
      updateMode: defaultValues.updateMode ?? "APPEND_TEXT",
      appendText: defaultValues.appendText ?? "",
      findText: defaultValues.findText ?? "",
      replaceText: defaultValues.replaceText ?? "",
      replaceMatchCase: defaultValues.replaceMatchCase ?? false,
    },
  });

  const watchAuthType = form.watch("authType");
  const watchOperation = form.watch("operation");
  const watchUpdateMode = form.watch("updateMode");
  const showUpdateFields = watchOperation === "UPDATE_DOCUMENT";
  const showAppend = showUpdateFields && watchUpdateMode === "APPEND_TEXT";
  const showReplace = showUpdateFields && watchUpdateMode === "REPLACE_ALL_TEXT";

  useEffect(() => {
    if (!open) return;
    form.reset({
      variableName: initialName,
      authType: defaultValues.authType ?? "OAUTH",
      credentialId: defaultValues.credentialId ?? "",
      documentId: defaultValues.documentId ?? "",
      operation: defaultValues.operation ?? "GET_DOCUMENT",
      updateMode: defaultValues.updateMode ?? "APPEND_TEXT",
      appendText: defaultValues.appendText ?? "",
      findText: defaultValues.findText ?? "",
      replaceText: defaultValues.replaceText ?? "",
      replaceMatchCase: defaultValues.replaceMatchCase ?? false,
    });
  }, [defaultValues, open, form, initialName]);

  const handleSubmit = (values: GoogleDocsFormValues) => {
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

  const insertAtTemplateField = (fieldName: TemplateInsertField, token: string) => {
    if (fieldName === "documentId") {
      const el = documentIdRef.current;
      const currentValue = form.getValues("documentId") ?? "";
      if (!el) {
        form.setValue("documentId", `${currentValue}${token}`, { shouldDirty: true });
        return;
      }
      const start = el.selectionStart ?? currentValue.length;
      const end = el.selectionEnd ?? currentValue.length;
      const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
      form.setValue("documentId", nextValue, { shouldDirty: true });
      requestAnimationFrame(() => {
        el.focus();
        const nextCursor = start + token.length;
        el.setSelectionRange(nextCursor, nextCursor);
      });
      return;
    }
    const refMap = { appendText: appendRef, findText: findRef, replaceText: replaceRef } as const;
    const textarea = refMap[fieldName].current;
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
    insertAtTemplateField(activeTarget, token);
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
          title="Google Docs"
          description="Read a Google Doc as plain text, append text to the end, or replace all occurrences of a phrase."
          icon={<FileTextIcon className="h-6 w-6 opacity-95" />}
          placeholder="googleDoc1"
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
                          Reconnect after upgrading so your token includes Google Docs access (same credential as Sheets).
                        </FormDescription>
                        <FormMessage />
                        {field.value ? (
                          <div className="flex flex-col gap-2 pt-2">
                            {connectedEmail || connectedAt ? (
                              <div className="text-xs text-muted-foreground">
                                Connected{connectedEmail ? ` as ${connectedEmail}` : ""}
                                {connectedAt ? ` · ${connectedAt}` : ""}
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
                          Share the document with the service account email so it can read or update.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="documentId"
                  render={({ field }) => {
                    const { ref, value, ...fieldProps } = field;
                    return (
                      <FormItem>
                        <FormLabel>Document ID</FormLabel>
                        <FormControl>
                          <TemplateVariableInput
                            ref={(el) => {
                              ref(el);
                              documentIdRef.current = el;
                            }}
                            placeholder="ID from the Google Docs URL (or {{variables}})"
                            onFocus={() => setActiveTarget("documentId")}
                            value={value ?? ""}
                            {...fieldProps}
                          />
                        </FormControl>
                        <FormDescription>
                          The long ID between /d/ and /edit in the document URL, or templates like{" "}
                          <code className="rounded bg-muted px-1">{"{{variables}}"}</code>.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
                          <SelectItem value="GET_DOCUMENT">Read document (plain text)</SelectItem>
                          <SelectItem value="UPDATE_DOCUMENT">Update document</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showUpdateFields && (
                  <FormField
                    control={form.control}
                    name="updateMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Update mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select update mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="APPEND_TEXT">Append text to end</SelectItem>
                            <SelectItem value="REPLACE_ALL_TEXT">Replace all matching text</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {showAppend && (
                  <FormField
                    control={form.control}
                    name="appendText"
                    render={({ field }) => {
                      const { ref, value, ...fieldProps } = field;
                      return (
                        <FormItem>
                          <FormLabel>Text to append</FormLabel>
                          <FormControl>
                            <TemplateVariableTextarea
                              ref={(el) => {
                                ref(el);
                                appendRef.current = el;
                              }}
                              className="min-h-[120px] font-mono text-sm"
                              placeholder="Appended at the end of the document body…"
                              onFocus={() => setActiveTarget("appendText")}
                              value={value ?? ""}
                              {...fieldProps}
                            />
                          </FormControl>
                          <FormDescription>
                            Supports <code className="rounded bg-muted px-1">{"{{variables}}"}</code>. Empty string
                            inserts nothing.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                {showReplace && (
                  <>
                    <FormField
                      control={form.control}
                      name="findText"
                      render={({ field }) => {
                        const { ref, value, ...fieldProps } = field;
                        return (
                          <FormItem>
                            <FormLabel>Find text</FormLabel>
                            <FormControl>
                              <TemplateVariableTextarea
                                ref={(el) => {
                                  ref(el);
                                  findRef.current = el;
                                }}
                                className="min-h-[80px] font-mono text-sm"
                                placeholder="Exact phrase to find (after templates resolve)"
                                onFocus={() => setActiveTarget("findText")}
                                value={value ?? ""}
                                {...fieldProps}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="replaceText"
                      render={({ field }) => {
                        const { ref, value, ...fieldProps } = field;
                        return (
                          <FormItem>
                            <FormLabel>Replace with</FormLabel>
                            <FormControl>
                              <TemplateVariableTextarea
                                ref={(el) => {
                                  ref(el);
                                  replaceRef.current = el;
                                }}
                                className="min-h-[80px] font-mono text-sm"
                                placeholder="Replacement (can be empty to delete matches)"
                                onFocus={() => setActiveTarget("replaceText")}
                                value={value ?? ""}
                                {...fieldProps}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="replaceMatchCase"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Match case</FormLabel>
                            <FormDescription>When on, find text is case-sensitive.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
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
            idleMessage="Execute this workflow to view the latest Google Docs node output here."
            className="max-h-[72vh] overflow-hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
