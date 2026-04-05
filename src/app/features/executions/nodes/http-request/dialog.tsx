"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TemplateVariableInput,
  TemplateVariableTextarea,
} from "@/lib/template-highlight";
import { type NodeStatus } from "@/components/react-flow/node-status-indicator";
import {
  ExecutionOutputPanel,
  VariablePickerPanel,
} from "@/components/data-transfer";
import {
  NodeDialogEntity,
  NodeDialogEntityFooter,
} from "@/components/node-dialog-entity";
import { type NodeDialogNameFieldHandle } from "@/components/node-dialog-name-field";
import type {
  AvailableVariable,
  UpstreamVariableNodeOption,
} from "@/lib/variable-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  type Path,
  type PathValue,
  useFieldArray,
  useForm,
} from "react-hook-form";
import z from "zod";
import { DIALOG_CONTENT_STYLE, PANELS_STYLES } from "../constants";

const formSchema = z
  .object({
    endpoint: z.string().url({ message: "Invalid please enter a valid URL" }),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]),
    queryParams: z
      .array(
        z.object({
          name: z.string().trim().min(1, { message: "Name is required" }),
          value: z.string().optional(),
        }),
      )
      .default([]),
    body: z.string().optional(),
    authType: z.enum(["NONE", "BEARER", "BASIC", "API_KEY"]),
    bearerToken: z.string().optional(),
    basicUsername: z.string().optional(),
    basicPassword: z.string().optional(),
    apiKeyHeaderName: z.string().optional(),
    apiKeyValue: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.authType === "BEARER" && !values.bearerToken?.trim()) {
      ctx.addIssue({
        path: ["bearerToken"],
        code: "custom",
        message: "Bearer token is required",
      });
    }

    if (values.authType === "BASIC") {
      if (!values.basicUsername?.trim()) {
        ctx.addIssue({
          path: ["basicUsername"],
          code: "custom",
          message: "Username is required",
        });
      }
      if (!values.basicPassword?.trim()) {
        ctx.addIssue({
          path: ["basicPassword"],
          code: "custom",
          message: "Password is required",
        });
      }
    }

    if (values.authType === "API_KEY") {
      if (!values.apiKeyHeaderName?.trim()) {
        ctx.addIssue({
          path: ["apiKeyHeaderName"],
          code: "custom",
          message: "Header name is required",
        });
      }
      if (!values.apiKeyValue?.trim()) {
        ctx.addIssue({
          path: ["apiKeyValue"],
          code: "custom",
          message: "API key is required",
        });
      }
    }
  });

type HttpRequestFormInput = z.input<typeof formSchema>;
export type HttpRequestFormValues = z.output<typeof formSchema>;

export type HttpRequestDialogSubmitValues = HttpRequestFormValues & {
  varibleName: string;
};

type InsertTarget =
  | { kind: "endpoint" }
  | { kind: "body" }
  | { kind: "query"; index: number; part: "name" | "value" }
  | {
      kind: "auth";
      field:
        | "bearerToken"
        | "basicUsername"
        | "basicPassword"
        | "apiKeyHeaderName"
        | "apiKeyValue";
    };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: HttpRequestDialogSubmitValues) => void;
  defaultValues?: Partial<HttpRequestDialogSubmitValues>;
  executionStatus?: NodeStatus;
  executionOutput?: string;
  executionError?: string;
  availableVariables?: AvailableVariable[];
  isLoadingVariables?: boolean;
  selectedNodeId?: string;
  onSelectedNodeIdChange?: (nodeId: string) => void;
  nodeOptions?: UpstreamVariableNodeOption[];
}

function insertTargetPathAndKey(
  target: InsertTarget,
): { path: Path<HttpRequestFormInput>; refKey: string } | null {
  switch (target.kind) {
    case "endpoint":
      return { path: "endpoint", refKey: "endpoint" };
    case "body":
      return { path: "body", refKey: "body" };
    case "query":
      return {
        path: `queryParams.${target.index}.${target.part}` as Path<HttpRequestFormInput>,
        refKey: `query-${target.index}-${target.part}`,
      };
    case "auth":
      return { path: target.field, refKey: target.field };
  }
}

export const HttpRequestDialog = ({
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
  const form = useForm<HttpRequestFormInput, unknown, HttpRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      endpoint: defaultValues.endpoint ?? "",
      method: defaultValues.method ?? "GET",
      queryParams: defaultValues.queryParams ?? [],
      body: defaultValues.body ?? "",
      authType: defaultValues.authType ?? "NONE",
      bearerToken: defaultValues.bearerToken ?? "",
      basicUsername: defaultValues.basicUsername ?? "",
      basicPassword: defaultValues.basicPassword ?? "",
      apiKeyHeaderName: defaultValues.apiKeyHeaderName ?? "",
      apiKeyValue: defaultValues.apiKeyValue ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        endpoint: defaultValues.endpoint ?? "",
        method: defaultValues.method ?? "GET",
        queryParams: defaultValues.queryParams ?? [],
        body: defaultValues.body ?? "",
        authType: defaultValues.authType ?? "NONE",
        bearerToken: defaultValues.bearerToken ?? "",
        basicUsername: defaultValues.basicUsername ?? "",
        basicPassword: defaultValues.basicPassword ?? "",
        apiKeyHeaderName: defaultValues.apiKeyHeaderName ?? "",
        apiKeyValue: defaultValues.apiKeyValue ?? "",
      });
    }
  }, [defaultValues, open, form]);

  const watchMethod = form.watch("method");
  const watchAuthType = form.watch("authType");
  const showBodyField = ["POST", "PUT", "PATCH"].includes(watchMethod);
  const [insertTarget, setInsertTarget] = useState<InsertTarget>({
    kind: "endpoint",
  });
  const fieldRefs = useRef(new Map<string, HTMLInputElement | null>());
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const nameFieldRef = useRef<NodeDialogNameFieldHandle>(null);
  const queryParamsArray = useFieldArray({
    control: form.control,
    name: "queryParams" as const,
  });

  const handleSubmit = (values: HttpRequestFormValues) => {
    const err = nameFieldRef.current?.validate();
    if (err) {
      nameFieldRef.current?.enterEditMode();
      nameFieldRef.current?.focusNameInput();
      return;
    }
    const name = nameFieldRef.current?.getTrimmedName() ?? "";
    onSubmit({ ...values, varibleName: name });
    onOpenChange(false);
  };

  const insertTokenAtPath = (
    path: Path<HttpRequestFormInput>,
    el: HTMLInputElement | HTMLTextAreaElement | null,
    token: string,
  ) => {
    const raw = form.getValues(path);
    const currentValue = typeof raw === "string" ? raw : "";
    if (!el) {
      const next = `${currentValue}${token}` as PathValue<
        HttpRequestFormInput,
        typeof path
      >;
      form.setValue(path, next, { shouldDirty: true });
      return;
    }
    const start =
      "selectionStart" in el
        ? (el.selectionStart ?? currentValue.length)
        : currentValue.length;
    const end =
      "selectionEnd" in el
        ? (el.selectionEnd ?? currentValue.length)
        : currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
    form.setValue(
      path,
      nextValue as PathValue<HttpRequestFormInput, typeof path>,
      { shouldDirty: true },
    );
    requestAnimationFrame(() => {
      el.focus();
      const nextCursor = start + token.length;
      if ("setSelectionRange" in el) {
        el.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  const handleInsertVariable = (token: string) => {
    let target: InsertTarget = insertTarget;
    if (target.kind === "body" && !showBodyField) {
      target = { kind: "endpoint" };
    }
    const mapped = insertTargetPathAndKey(target);
    if (!mapped) return;
    const el =
      mapped.refKey === "body"
        ? bodyRef.current
        : (fieldRefs.current.get(mapped.refKey) ?? null);
    insertTokenAtPath(mapped.path, el, token);
  };

  const initialName = defaultValues.varibleName ?? "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CONTENT_STYLE}>
        <NodeDialogEntity
          ref={nameFieldRef}
          open={open}
          initialName={initialName}
          title="HTTP Request"
          description="Configure an HTTP request and store the response for downstream nodes."
          icon={<Globe className="h-6 w-6 opacity-95" />}
          placeholder="httpRequest1"
          helpText="Canvas label and variable for this step’s response."
        />
        <div className={PANELS_STYLES}>
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
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="max-h-[72vh] space-y-6 overflow-y-auto pr-1"
            >
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="HEAD">HEAD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the HTTP method to use for the request.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endpoint"
                render={({ field }) => {
                  const { ref } = field;
                  return (
                    <FormItem>
                      <FormLabel>Endpoint Url</FormLabel>
                      <FormControl>
                        <TemplateVariableInput
                          ref={(el) => {
                            ref(el);
                            if (el) fieldRefs.current.set("endpoint", el);
                            else fieldRefs.current.delete("endpoint");
                          }}
                          inputMode="url"
                          type="text"
                          autoComplete="off"
                          placeholder="https://api.example.com/users/{{user.id}}"
                          onFocus={() => setInsertTarget({ kind: "endpoint" })}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm leading-none font-medium">
                      Query parameters
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Add query string parameters (name/value) to the request
                      URL.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      queryParamsArray.append({ name: "", value: "" })
                    }
                  >
                    Add parameter
                  </Button>
                </div>

                {queryParamsArray.fields.length === 0 ? (
                  <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                    No query parameters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {queryParamsArray.fields.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-1 gap-3 sm:grid-cols-12"
                      >
                        <FormField
                          control={form.control}
                          name={`queryParams.${index}.name`}
                          render={({ field }) => {
                            const rkey = `query-${index}-name`;
                            const { ref, ...rest } = field;
                            return (
                              <FormItem className="sm:col-span-5">
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <TemplateVariableInput
                                    ref={(el) => {
                                      ref(el);
                                      if (el) fieldRefs.current.set(rkey, el);
                                      else fieldRefs.current.delete(rkey);
                                    }}
                                    type="text"
                                    placeholder="q"
                                    onFocus={() =>
                                      setInsertTarget({
                                        kind: "query",
                                        index,
                                        part: "name",
                                      })
                                    }
                                    value={rest.value ?? ""}
                                    onChange={rest.onChange}
                                    onBlur={rest.onBlur}
                                    name={rest.name}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        <FormField
                          control={form.control}
                          name={`queryParams.${index}.value`}
                          render={({ field }) => {
                            const rkey = `query-${index}-value`;
                            const { ref, ...rest } = field;
                            return (
                              <FormItem className="sm:col-span-6">
                                <FormLabel>Value</FormLabel>
                                <FormControl>
                                  <TemplateVariableInput
                                    ref={(el) => {
                                      ref(el);
                                      if (el) fieldRefs.current.set(rkey, el);
                                      else fieldRefs.current.delete(rkey);
                                    }}
                                    type="text"
                                    placeholder="search term"
                                    onFocus={() =>
                                      setInsertTarget({
                                        kind: "query",
                                        index,
                                        part: "value",
                                      })
                                    }
                                    value={rest.value ?? ""}
                                    onChange={rest.onChange}
                                    onBlur={rest.onBlur}
                                    name={rest.name}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        <div className="sm:col-span-1 sm:flex sm:items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full cursor-pointer"
                            onClick={() => queryParamsArray.remove(index)}
                            aria-label="Remove parameter"
                            title="Remove parameter"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="authType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auth Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select auth type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="BEARER">Bearer Token</SelectItem>
                        <SelectItem value="BASIC">Basic Auth</SelectItem>
                        <SelectItem value="API_KEY">API Key Header</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose how to authenticate this request.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchAuthType === "BEARER" && (
                <FormField
                  control={form.control}
                  name="bearerToken"
                  render={({ field }) => {
                    const { ref, ...rest } = field;
                    return (
                      <FormItem>
                        <FormLabel>Bearer Token</FormLabel>
                        <FormControl>
                          <TemplateVariableInput
                            ref={(el) => {
                              ref(el);
                              if (el) fieldRefs.current.set("bearerToken", el);
                              else fieldRefs.current.delete("bearerToken");
                            }}
                            type="text"
                            autoComplete="off"
                            placeholder="sk-... or {{myToken}}"
                            onFocus={() =>
                              setInsertTarget({
                                kind: "auth",
                                field: "bearerToken",
                              })
                            }
                            value={rest.value ?? ""}
                            onChange={rest.onChange}
                            onBlur={rest.onBlur}
                            name={rest.name}
                          />
                        </FormControl>
                        <FormDescription>
                          Token value used in the Authorization header.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

              {watchAuthType === "BASIC" && (
                <>
                  <FormField
                    control={form.control}
                    name="basicUsername"
                    render={({ field }) => {
                      const { ref, ...rest } = field;
                      return (
                        <FormItem>
                          <FormLabel>Basic Auth Username</FormLabel>
                          <FormControl>
                            <TemplateVariableInput
                              ref={(el) => {
                                ref(el);
                                if (el)
                                  fieldRefs.current.set("basicUsername", el);
                                else fieldRefs.current.delete("basicUsername");
                              }}
                              type="text"
                              autoComplete="off"
                              placeholder="username"
                              onFocus={() =>
                                setInsertTarget({
                                  kind: "auth",
                                  field: "basicUsername",
                                })
                              }
                              value={rest.value ?? ""}
                              onChange={rest.onChange}
                              onBlur={rest.onBlur}
                              name={rest.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="basicPassword"
                    render={({ field }) => {
                      const { ref, ...rest } = field;
                      return (
                        <FormItem>
                          <FormLabel>Basic Auth Password</FormLabel>
                          <FormControl>
                            <TemplateVariableInput
                              ref={(el) => {
                                ref(el);
                                if (el)
                                  fieldRefs.current.set("basicPassword", el);
                                else fieldRefs.current.delete("basicPassword");
                              }}
                              type="text"
                              autoComplete="off"
                              placeholder="password or {{secret}}"
                              onFocus={() =>
                                setInsertTarget({
                                  kind: "auth",
                                  field: "basicPassword",
                                })
                              }
                              value={rest.value ?? ""}
                              onChange={rest.onChange}
                              onBlur={rest.onBlur}
                              name={rest.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </>
              )}

              {watchAuthType === "API_KEY" && (
                <>
                  <FormField
                    control={form.control}
                    name="apiKeyHeaderName"
                    render={({ field }) => {
                      const { ref, ...rest } = field;
                      return (
                        <FormItem>
                          <FormLabel>Header Name</FormLabel>
                          <FormControl>
                            <TemplateVariableInput
                              ref={(el) => {
                                ref(el);
                                if (el)
                                  fieldRefs.current.set("apiKeyHeaderName", el);
                                else
                                  fieldRefs.current.delete("apiKeyHeaderName");
                              }}
                              type="text"
                              autoComplete="off"
                              placeholder="x-api-key"
                              onFocus={() =>
                                setInsertTarget({
                                  kind: "auth",
                                  field: "apiKeyHeaderName",
                                })
                              }
                              value={rest.value ?? ""}
                              onChange={rest.onChange}
                              onBlur={rest.onBlur}
                              name={rest.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="apiKeyValue"
                    render={({ field }) => {
                      const { ref, ...rest } = field;
                      return (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <TemplateVariableInput
                              ref={(el) => {
                                ref(el);
                                if (el)
                                  fieldRefs.current.set("apiKeyValue", el);
                                else fieldRefs.current.delete("apiKeyValue");
                              }}
                              type="text"
                              autoComplete="off"
                              placeholder="your-api-key or {{apiKey}}"
                              onFocus={() =>
                                setInsertTarget({
                                  kind: "auth",
                                  field: "apiKeyValue",
                                })
                              }
                              value={rest.value ?? ""}
                              onChange={rest.onChange}
                              onBlur={rest.onBlur}
                              name={rest.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </>
              )}

              {showBodyField && (
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => {
                    const { ref, ...fieldProps } = field;
                    return (
                      <FormItem>
                        <FormLabel>Request body</FormLabel>
                        <FormControl>
                          <TemplateVariableTextarea
                            ref={(el) => {
                              ref(el);
                              bodyRef.current = el;
                            }}
                            className="min-h-[120px] font-mono text-sm"
                            placeholder='{"hello":"world"}'
                            onFocus={() => setInsertTarget({ kind: "body" })}
                            {...fieldProps}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the request body in JSON format.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}
              <NodeDialogEntityFooter />
            </form>
          </Form>

          <ExecutionOutputPanel
            executionStatus={executionStatus}
            executionOutput={executionOutput}
            executionError={executionError}
            idleMessage="Execute this workflow to view the latest HTTP response output here."
            className="max-h-[72vh] overflow-hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
