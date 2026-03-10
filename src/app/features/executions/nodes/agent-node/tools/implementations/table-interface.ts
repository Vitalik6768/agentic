import Handlebars from "handlebars";
import { InterfaceType } from "generated/prisma";
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/server/db";
import type { TableInterfaceToolConfig } from "../types";

type TableInterfaceToolRuntime = {
  userId: string;
  safeContext: Record<string, unknown>;
  config?: TableInterfaceToolConfig;
};

type TableDataJson = {
  version: 1;
  rows: Array<{
    id: string;
    cells: string[];
  }>;
};

type TableRow = TableDataJson["rows"][number];

const outputSchema = z.object({
  success: z.boolean(),
  interfaceId: z.string().optional(),
  interfaceName: z.string().optional(),
  operation: z.enum(["GET_CONTENT", "ADD_CONTENT", "APPEND_CONTENT", "UPDATE_CONTENT"]).optional(),
  headers: z.array(z.string()).optional(),
  rows: z.array(z.record(z.string(), z.string())).optional(),
  addedRow: z.record(z.string(), z.string()).optional(),
  updatedCount: z.number().optional(),
  error: z.string().optional(),
});

const inputSchema = z.object({
  content: z.union([z.string(), z.array(z.string()), z.record(z.string(), z.string())]).optional(),
  matchField: z.string().optional(),
  matchValue: z.string().optional(),
  updateField: z.string().optional(),
  updateValue: z.string().optional(),
});

const getDefaultTableData = (): TableDataJson => ({
  version: 1,
  rows: [
    { id: "r_header", cells: ["Column 1", "Column 2"] },
    { id: "r_1", cells: ["", ""] },
  ],
});

const normalizeTableData = (input: unknown): TableDataJson => {
  if (!input || typeof input !== "object") return getDefaultTableData();
  const candidate = input as { version?: unknown; rows?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.rows) || candidate.rows.length === 0) {
    return getDefaultTableData();
  }

  const mappedRows = candidate.rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const castedRow = row as { id?: unknown; cells?: unknown };
      if (typeof castedRow.id !== "string" || !Array.isArray(castedRow.cells)) return null;
      return {
        id: castedRow.id,
        cells: castedRow.cells.map((cell) => (typeof cell === "string" ? cell : String(cell ?? ""))),
      };
    })
    .filter((row): row is TableRow => Boolean(row));

  if (mappedRows.length === 0) return getDefaultTableData();

  const headerSize = mappedRows[0]?.cells.length ?? 0;
  const normalizedRows = mappedRows.map((row) => {
    if (row.cells.length === headerSize) return row;
    if (row.cells.length > headerSize) return { ...row, cells: row.cells.slice(0, headerSize) };
    return {
      ...row,
      cells: [...row.cells, ...Array.from({ length: headerSize - row.cells.length }, () => "")],
    };
  });

  return {
    version: 1,
    rows: normalizedRows,
  };
};

const rowsToObjects = (rows: TableRow[], headers: string[]) => {
  return rows.map((row) =>
    headers.reduce<Record<string, string>>((acc, header, index) => {
      const key = header.trim() || `Column ${index + 1}`;
      acc[key] = row.cells[index] ?? "";
      return acc;
    }, {}),
  );
};

const toCellString = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

const getRowCellsFromPayload = (
  payload: string | string[] | Record<string, string>,
  headers: string[],
): string[] => {
  if (Array.isArray(payload)) {
    return headers.map((_, index) => payload[index] ?? "");
  }

  if (typeof payload === "object") {
    return headers.map((header, index) => payload[header.trim()] ?? payload[`Column ${index + 1}`] ?? "");
  }

  const trimmed = payload.trim();
  if (!trimmed) return headers.map(() => "");

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return headers.map((_, index) => toCellString(parsed[index]));
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      return headers.map((header, index) => {
        const value = record[header.trim()] ?? record[`Column ${index + 1}`];
        return toCellString(value);
      });
    }
  } catch {
    // Fallback: treat plain text as first-column content.
  }

  return headers.map((_, index) => (index === 0 ? payload : ""));
};

export const createTableInterfaceTool = ({ userId, safeContext, config }: TableInterfaceToolRuntime) => {
  return tool({
    description:
      "Read or modify a configured Table Interface. Supports get, append/add row, and update matching rows.",
    inputSchema,
    outputSchema,
    execute: async ({ content, matchField, matchValue, updateField, updateValue }) => {
      if (!config?.interfaceId) {
        return {
          success: false,
          error: "Table Interface tool is not configured. Set an interface first.",
        };
      }

      const item = await db.interface.findFirst({
        where: {
          id: config.interfaceId,
          userId,
          type: InterfaceType.TABLE,
        },
        include: {
          table: true,
        },
      });

      if (!item) {
        return {
          success: false,
          error: "Configured table interface was not found.",
        };
      }

      const currentTableData = normalizeTableData(item.table?.dataJson);
      const headers = currentTableData.rows[0]?.cells ?? [];
      const operation = config.operation ?? "GET_CONTENT";

      if (operation === "GET_CONTENT") {
        return {
          success: true,
          interfaceId: item.id,
          interfaceName: item.name,
          operation,
          headers,
          rows: rowsToObjects(currentTableData.rows.slice(1), headers),
        };
      }

      if (operation === "ADD_CONTENT" || operation === "APPEND_CONTENT") {
        const contentSource = config.contentSource ?? "TEMPLATE";
        const renderedBody =
          contentSource === "AGENT_INPUT" ? content : Handlebars.compile(config.body ?? "")(safeContext);

        if (renderedBody === undefined || renderedBody === null) {
          return {
            success: false,
            interfaceId: item.id,
            interfaceName: item.name,
            operation,
            error:
              contentSource === "AGENT_INPUT"
                ? "No content provided by agent input."
                : "Template content is empty.",
          };
        }

        const nextRows = [...currentTableData.rows];
        const addedCells = getRowCellsFromPayload(renderedBody, headers);
        const addedRowId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        nextRows.push({
          id: addedRowId,
          cells: addedCells,
        });

        const nextTableData: TableDataJson = {
          ...currentTableData,
          rows: nextRows,
        };

        await db.$transaction(async (tx) => {
          await tx.tableInterface.upsert({
            where: {
              interfaceId: item.id,
            },
            create: {
              interfaceId: item.id,
              dataJson: nextTableData,
            },
            update: {
              dataJson: nextTableData,
            },
          });

          await tx.interface.update({
            where: {
              id: item.id,
            },
            data: {
              updatedAt: new Date(),
            },
          });
        });

        return {
          success: true,
          interfaceId: item.id,
          interfaceName: item.name,
          operation,
          headers,
          addedRow: rowsToObjects([{ id: addedRowId, cells: addedCells }], headers)[0],
          rows: rowsToObjects(nextTableData.rows.slice(1), headers),
        };
      }

      const matchFieldValue = (matchField ?? config.matchField ?? "").trim();
      const updateFieldValue = (updateField ?? config.updateField ?? "").trim();
      const matchValueSource = matchValue ?? config.matchValue ?? "";
      const updateValueSource = updateValue ?? config.updateValue ?? "";
      const renderedMatchValue = Handlebars.compile(matchValueSource)(safeContext);
      const renderedUpdateValue = Handlebars.compile(updateValueSource)(safeContext);

      if (
        !matchFieldValue ||
        !updateFieldValue ||
        !String(renderedMatchValue).trim() ||
        !String(renderedUpdateValue).trim()
      ) {
        return {
          success: false,
          interfaceId: item.id,
          interfaceName: item.name,
          operation,
          error:
            "Update requires matchField/matchValue and updateField/updateValue (from config or runtime input).",
        };
      }

      const matchColumnIndex = headers.findIndex((header) => header.trim() === matchFieldValue);
      const updateColumnIndex = headers.findIndex((header) => header.trim() === updateFieldValue);

      if (matchColumnIndex < 0 || updateColumnIndex < 0) {
        return {
          success: false,
          interfaceId: item.id,
          interfaceName: item.name,
          operation,
          error: "Match field or update field was not found in table headers.",
        };
      }

      const nextRows: TableRow[] = currentTableData.rows.map((row) => ({
        ...row,
        cells: [...row.cells],
      }));

      let updatedCount = 0;
      for (let rowIndex = 1; rowIndex < nextRows.length; rowIndex += 1) {
        const row = nextRows[rowIndex];
        if (!row) continue;
        if ((row.cells[matchColumnIndex] ?? "") !== String(renderedMatchValue)) continue;
        row.cells[updateColumnIndex] = String(renderedUpdateValue);
        updatedCount += 1;
      }

      const nextTableData: TableDataJson = {
        ...currentTableData,
        rows: nextRows,
      };

      await db.$transaction(async (tx) => {
        await tx.tableInterface.upsert({
          where: {
            interfaceId: item.id,
          },
          create: {
            interfaceId: item.id,
            dataJson: nextTableData,
          },
          update: {
            dataJson: nextTableData,
          },
        });

        await tx.interface.update({
          where: {
            id: item.id,
          },
          data: {
            updatedAt: new Date(),
          },
        });
      });

      return {
        success: true,
        interfaceId: item.id,
        interfaceName: item.name,
        operation,
        updatedCount,
        headers,
        rows: rowsToObjects(nextTableData.rows.slice(1), headers),
      };
    },
  });
};
