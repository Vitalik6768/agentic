import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import { extractorNodeChannel } from "@/inngest/channels/extractor-node";
import Handlebars from "handlebars";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";

registerHandlebarsHelpers();

type ExtractorNodeData = {
  variableName?: string;
  varibleName?: string;
  fields?: Array<{
    outputKey?: string;
    lookupMode?: "path" | "key_name" | "key_value" | "object_where";
    sourcePath?: string;
    lookupValue?: string;
    matchKey?: string;
    matchValue?: string;
    outputType?: "string" | "number" | "boolean" | "object" | "array";
    operation?: "as_is" | "first" | "join" | "count";
    separator?: string;
  }>;
  // legacy single-field shape
  sourcePath?: string;
  operation?: "as_is" | "first" | "join" | "count";
  separator?: string;
};

const renderTemplate = (template: string, context: Record<string, unknown>): string => {
  const trimmed = template.trim();
  if (!trimmed) return "";
  try {
    return Handlebars.compile(trimmed)(context).trim();
  } catch {
    // If template compilation fails, treat it as a literal.
    return trimmed;
  }
};

const getByPath = (source: unknown, path: string): unknown => {
  const segments = path
    .split(".")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return undefined;
  }

  let cursor: unknown = source;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined) {
      return undefined;
    }

    if (Array.isArray(cursor) && /^\d+$/.test(segment)) {
      const index = Number(segment);
      cursor = cursor[index];
      continue;
    }

    if (typeof cursor === "object") {
      cursor = (cursor as Record<string, unknown>)[segment];
      continue;
    }

    return undefined;
  }

  return cursor;
};

type NormalizedExtractorField = {
  outputKey: string;
  lookupMode: "path" | "key_name" | "key_value" | "object_where";
  sourcePath: string;
  lookupValue: string;
  matchKey: string;
  matchValue: string;
  outputType: "string" | "number" | "boolean" | "object" | "array";
  operation: "as_is" | "first" | "join" | "count";
  separator: string;
};

const normalizeFields = (data: ExtractorNodeData): NormalizedExtractorField[] => {
  const fromFields = (data.fields ?? [])
    .map((field) => {
      const outputKey = field.outputKey?.trim() ?? "";
      const lookupMode = field.lookupMode ?? "path";
      const sourcePath = field.sourcePath?.trim() ?? "";
      const lookupValue = field.lookupValue?.trim() ?? "";
      const matchKey = field.matchKey?.trim() ?? "";
      const matchValue = field.matchValue?.trim() ?? "";
      const hasLookupInput =
        lookupMode === "path"
          ? sourcePath.length > 0
          : lookupMode === "object_where"
            ? sourcePath.length > 0 && matchKey.length > 0 && matchValue.length > 0
            : lookupValue.length > 0;
      if (!outputKey || !hasLookupInput) return null;
      return {
        outputKey,
        lookupMode,
        sourcePath,
        lookupValue,
        matchKey,
        matchValue,
        outputType: field.outputType ?? "string",
        operation: field.operation ?? "as_is",
        separator: field.separator ?? ", ",
      } satisfies NormalizedExtractorField;
    })
    .filter((field): field is NormalizedExtractorField => field !== null);

  if (fromFields.length > 0) return fromFields;

  const legacySourcePath = data.sourcePath?.trim();
  if (!legacySourcePath) return [];
  return [
    {
      outputKey: "value",
      lookupMode: "path",
      sourcePath: legacySourcePath,
      lookupValue: "",
      matchKey: "",
      matchValue: "",
      outputType: "string",
      operation: data.operation ?? "as_is",
      separator: data.separator ?? ", ",
    },
  ];
};

const collectValuesByKeyName = (value: unknown, keyName: string, results: unknown[]): void => {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectValuesByKeyName(item, keyName, results);
    }
    return;
  }
  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, keyName)) {
    results.push(record[keyName]);
  }

  for (const nestedValue of Object.values(record)) {
    collectValuesByKeyName(nestedValue, keyName, results);
  }
};

const findValuesByKeyName = (value: unknown, keyName: string): unknown[] => {
  const results: unknown[] = [];
  collectValuesByKeyName(value, keyName, results);
  return results;
};

const collectValuesByValue = (value: unknown, target: string, results: unknown[]): void => {
  if (value === null || value === undefined) return;
  if (typeof value !== "object") {
    if (typeof value === "string") {
      if (value === target) results.push(value);
      return;
    }
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint" ||
      typeof value === "symbol"
    ) {
      if (value.toString() === target) results.push(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectValuesByValue(item, target, results);
    }
    return;
  }

  for (const nestedValue of Object.values(value as Record<string, unknown>)) {
    collectValuesByValue(nestedValue, target, results);
  }
};

const findValuesByValue = (value: unknown, target: string): unknown[] => {
  const results: unknown[] = [];
  collectValuesByValue(value, target, results);
  return results;
};

const findObjectWhere = (
  scope: unknown,
  matchKey: string,
  matchValue: string,
): Record<string, unknown> | undefined => {
  if (!Array.isArray(scope)) return undefined;

  for (const item of scope) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const candidate = record[matchKey];
    if (candidate === null || candidate === undefined) continue;

    if (typeof candidate === "string") {
      if (candidate === matchValue) return record;
      continue;
    }

    if (
      typeof candidate === "number" ||
      typeof candidate === "boolean" ||
      typeof candidate === "bigint" ||
      typeof candidate === "symbol"
    ) {
      if (candidate.toString() === matchValue) return record;
    }
  }

  return undefined;
};

const applyOperation = (
  value: unknown,
  operation: "as_is" | "first" | "join" | "count",
  separator: string
): unknown => {
  if (operation === "first") {
    return Array.isArray(value) ? value[0] : value;
  }

  if (operation === "join") {
    if (!Array.isArray(value)) return value;
    return value.map((item) => String(item)).join(separator);
  }

  if (operation === "count") {
    if (Array.isArray(value) || typeof value === "string") {
      return value.length;
    }
    if (value && typeof value === "object") {
      return Object.keys(value as Record<string, unknown>).length;
    }
    return 0;
  }

  return value;
};

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    typeof value === "symbol"
  ) {
    return value.toString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable value]";
  }
};

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  const normalized = stringifyValue(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  throw new NonRetriableError(`Invalid boolean value: "${stringifyValue(value)}"`);
};

const castType = (
  value: unknown,
  outputType: "string" | "number" | "boolean" | "object" | "array"
): unknown => {
  if (outputType === "string") return stringifyValue(value);
  if (outputType === "number") {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new NonRetriableError(`Invalid number value: "${stringifyValue(value)}"`);
    }
    return parsed;
  }
  if (outputType === "boolean") return parseBoolean(value);
  if (outputType === "object") {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    throw new NonRetriableError("Expected object value");
  }
  if (Array.isArray(value)) return value;
  throw new NonRetriableError("Expected array value");
};

export const extractorNodeExecutor: NodeExecutor<ExtractorNodeData> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  const variableName = data.variableName ?? data.varibleName;
  const fields = normalizeFields(data);

  await publish(
    extractorNodeChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!variableName) {
    await publish(
      extractorNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      extractorNodeChannel().result({
        nodeId,
        status: "error",
        error: "Variable name is required",
      })
    );
    throw new NonRetriableError("Variable name is required");
  }

  if (fields.length === 0) {
    await publish(
      extractorNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      extractorNodeChannel().result({
        nodeId,
        status: "error",
        error: "At least one extractor field is required",
      })
    );
    throw new NonRetriableError("At least one extractor field is required");
  }

  try {
    const extractedObject: Record<string, unknown> = {};

    for (const field of fields) {
      const scope = field.sourcePath ? getByPath(context, field.sourcePath) : context;
      const extractedValue =
        field.lookupMode === "path"
          ? getByPath(context, field.sourcePath)
          : field.lookupMode === "key_name"
            ? findValuesByKeyName(scope, field.lookupValue)
            : field.lookupMode === "key_value"
              ? findValuesByValue(scope, field.lookupValue)
              : findObjectWhere(
                  scope,
                  field.matchKey,
                  renderTemplate(field.matchValue, context),
                );
      const transformedValue = applyOperation(extractedValue, field.operation, field.separator);
      extractedObject[field.outputKey] = castType(transformedValue, field.outputType);
    }

    const result = {
      ...context,
      [variableName]: extractedObject,
      extractor: {
        ...((context.extractor as Record<string, unknown> | undefined) ?? {}),
        [nodeId]: {
          fieldCount: fields.length,
        },
      },
    };
    await publish(
      extractorNodeChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(
          {
            variable: variableName,
            value: extractedObject,
          },
          null,
          2
        ),
      })
    );
    await publish(
      extractorNodeChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Extractor node error";
    await publish(
      extractorNodeChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(
      extractorNodeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};