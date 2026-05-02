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
import { TemplateVariableInput } from "@/lib/template-highlight";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const formSchema = z
  .object({
    variableName: z
      .string()
      .min(1, { message: "Variable name is required" })
      .regex(NODE_VARIABLE_NAME_REGEX, { message: "Invalid variable name" }),
    authType: z.enum(["OAUTH", "SERVICE_ACCOUNT"]),
    credentialId: z.string().optional(),
    operation: z.enum(["CREATE_FILE", "DELETE_FILE"]),
    fileName: z.string().optional(),
    parentFolderId: z.string().optional(),
    fileId: z.string().optional(),
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
    if (values.operation === "CREATE_FILE" && !values.fileName?.trim()) {
      ctx.addIssue({
        path: ["fileName"],
        code: "custom",
        message: "Document title is required",
      });
    }
    if (values.operation === "DELETE_FILE" && !values.fileId?.trim()) {
      ctx.addIssue({
        path: ["fileId"],
        code: "custom",
        message: "Document ID is required",
      });
    }
  });

export type GoogleDocsFileFormValues = z.infer<typeof formSchema>;

export type GoogleDocsFileVariableNodeOption = {
  nodeId: string;
  nodeType: string;
  variableRoot: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleDocsFileFormValues) => void;
  defaultValues?: Partial<GoogleDocsFileFormValues>;
  executionStatus?: NodeStatus;
  executionOutput?: string;
  executionError?: string;
  availableVariables?: AvailableVariable[];
  isLoadingVariables?: boolean;
  selectedNodeId?: string;
  onSelectedNodeIdChange?: (nodeId: string) => void;
  nodeOptions?: GoogleDocsFileVariableNodeOption[];
}

type ActiveField = "fileName" | "parentFolderId" | "fileId";

export const GoogleDocsFileDialog = ({
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
  const fileNameRef = useRef<HTMLInputElement | null>(null);
  const parentFolderRef = useRef<HTMLInputElement | null>(null);
  const fileIdRef = useRef<HTMLInputElement | null>(null);
  const [activeField, setActiveField] = useState<ActiveField>("fileName");

  const initialName = defaultValues.variableName ?? (defaultValues as { varibleName?: string }).varibleName ?? "";

  const form = useForm<GoogleDocsFileFormValues>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      variableName: initialName,
      authType: defaultValues.authType ?? "OAUTH",
      credentialId: defaultValues.credentialId ?? "",
      operation: defaultValues.operation ?? "CREATE_FILE",
      fileName: defaultValues.fileName ?? "",
      parentFolderId: defaultValues.parentFolderId ?? "",
      fileId: defaultValues.fileId ?? "",
    },
  });

  const watchAuthType = form.watch("authType");
  const watchOperation = form.watch("operation");
  const showCreate = watchOperation === "CREATE_FILE";

  useEffect(() => {
    if (!open) return;
    form.reset({
      variableName: initialName,
      authType: defaultValues.authType ?? "OAUTH",
      credentialId: defaultValues.credentialId ?? "",
      operation: defaultValues.operation ?? "CREATE_FILE",
      fileName: defaultValues.fileName ?? "",
      parentFolderId: defaultValues.parentFolderId ?? "",
      fileId: defaultValues.fileId ?? "",
    });
  }, [defaultValues, open, form, initialName]);

  const handleSubmit = (values: GoogleDocsFileFormValues) => {
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

  const insertAtField = (fieldName: ActiveField, token: string) => {
    const formKey =
      fieldName === "fileName" ? "fileName" : fieldName === "parentFolderId" ? "parentFolderId" : "fileId";
    const ref =
      fieldName === "fileName" ? fileNameRef : fieldName === "parentFolderId" ? parentFolderRef : fileIdRef;
    const el = ref.current;
    const currentValue = form.getValues(formKey) ?? "";
    if (!el || !("selectionStart" in el)) {
      form.setValue(formKey, `${currentValue}${token}`, { shouldDirty: true });
      return;
    }
    const start = el.selectionStart ?? currentValue.length;
    const end = el.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
    form.setValue(formKey, nextValue, { shouldDirty: true });
    requestAnimationFrame(() => {
      el.focus();
      const nextCursor = start + token.length;
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleInsertVariable = (token: string) => {
    insertAtField(activeField, token);
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
          title="Google Doc (create / delete)"
          description="Create a blank Google Doc in Drive, or delete an existing doc by its ID (same ID as in the doc URL)."
          icon={<FileTextIcon className="h-6 w-6 opacity-95" />}
          placeholder="googleDocsFile1"
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
                          Reconnect so this credential includes Google Drive scope (create/delete docs).
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
                          Share the target Drive folder with the service account email so it can create docs there.
                        </FormDescription>
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
                          <SelectItem value="CREATE_FILE">Create Google Doc</SelectItem>
                          <SelectItem value="DELETE_FILE">Delete Google Doc</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showCreate && (
                  <>
                    <FormField
                      control={form.control}
                      name="fileName"
                      render={({ field }) => {
                        const { ref, value, ...fieldProps } = field;
                        return (
                          <FormItem>
                            <FormLabel>Document title</FormLabel>
                            <FormControl>
                              <TemplateVariableInput
                                ref={(el) => {
                                  ref(el);
                                  fileNameRef.current = el;
                                }}
                                placeholder="Quarterly report"
                                onFocus={() => setActiveField("fileName")}
                                value={value ?? ""}
                                {...fieldProps}
                              />
                            </FormControl>
                            <FormDescription>New blank Google Doc with this title. Supports {"{{variables}}"}.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="parentFolderId"
                      render={({ field }) => {
                        const { ref, value, ...fieldProps } = field;
                        return (
                          <FormItem>
                            <FormLabel>Parent folder ID (optional)</FormLabel>
                            <FormControl>
                              <TemplateVariableInput
                                ref={(el) => {
                                  ref(el);
                                  parentFolderRef.current = el;
                                }}
                                placeholder="Leave empty for My Drive root"
                                onFocus={() => setActiveField("parentFolderId")}
                                value={value ?? ""}
                                {...fieldProps}
                              />
                            </FormControl>
                            <FormDescription>Folder ID from the Drive URL; omit to create at drive root.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </>
                )}

                {watchOperation === "DELETE_FILE" && (
                  <FormField
                    control={form.control}
                    name="fileId"
                    render={({ field }) => {
                      const { ref, value, ...fieldProps } = field;
                      return (
                        <FormItem>
                          <FormLabel>Document ID</FormLabel>
                          <FormControl>
                            <TemplateVariableInput
                              ref={(el) => {
                                ref(el);
                                fileIdRef.current = el;
                              }}
                              placeholder="ID between /d/ and /edit in the Doc URL"
                              onFocus={() => setActiveField("fileId")}
                              value={value ?? ""}
                              {...fieldProps}
                            />
                          </FormControl>
                          <FormDescription>Drive permanently removes the file — same as deleting in Drive.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                <NodeDialogEntityFooter />
              </form>
            </Form>
          </div>

          <ExecutionOutputPanel
            executionStatus={executionStatus}
            executionOutput={executionOutput}
            executionError={executionError}
            idleMessage="Execute this workflow to view the latest output here."
            className="max-h-[72vh] overflow-hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
