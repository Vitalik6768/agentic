import type { NodeExecutor } from "../../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { db } from "@/server/db";
import { interfaceTableChannel } from "@/inngest/channels/interface-table";
import { InterfaceType } from "generated/prisma";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";
import type { TableDataJson } from "@/app/features/interfaces/table-interface/hooks/use-table-interface";

registerHandlebarsHelpers();

type InterfaceTableNodeData = {
  variableName?: string;
  varibleName?: string;
  interfaceId?: string;
  operation?: "GET_DATA" | "UPDATE_DATA";
  method?: "ADD" | "GET";
  matchField?: string;
  matchValue?: string;
  updateField?: string;
  updateValue?: string;
};

type TableRow = {
  id: string;
  cells: string[];
};

const getDefaultTableData = (): TableDataJson => ({
  version: 1,
  rows: [
    { id: "r_header", cells: ["Column 1", "Column 2"] },
    { id: "r_1", cells: ["", ""] },
  ],
});

const normalizeTableData = (input: unknown): TableDataJson => {
  if (!input || typeof input !== "object") return getDefaultTableData();
  const candidate = input as { version?: unknown; rows?: unknown; bindings?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.rows) || candidate.rows.length === 0) {
    return getDefaultTableData();
  }

  const mappedRows = candidate.rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const castedRow = row as { id?: unknown; cells?: unknown };
      if (typeof castedRow.id !== "string" || !Array.isArray(castedRow.cells)) return null;
      const parsedCells = castedRow.cells.map((cell) =>
        typeof cell === "string" ? cell : String(cell ?? ""),
      );
      return { id: castedRow.id, cells: parsedCells };
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

  const normalized: TableDataJson = {
    version: 1,
    rows: normalizedRows,
  };

  if (candidate.bindings && typeof candidate.bindings === "object" && !Array.isArray(candidate.bindings)) {
    normalized.bindings = candidate.bindings as TableDataJson["bindings"];
  }

  return normalized;
};

const getHeaderMap = (tableData: TableDataJson) => {
  const headers = tableData.rows[0]?.cells ?? [];
  return new Map(headers.map((header, index) => [header.trim(), index]));
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

export const interfaceTableNodeExecutor: NodeExecutor<InterfaceTableNodeData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  const variableName = data.variableName ?? data.varibleName;

  await publish(
    interfaceTableChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!variableName) {
    await publish(
      interfaceTableChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      interfaceTableChannel().result({
        nodeId,
        status: "error",
        error: "Variable name is required",
      })
    );
    throw new NonRetriableError("Variable name is required");
  }

  if (!data.interfaceId) {
    await publish(
      interfaceTableChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      interfaceTableChannel().result({
        nodeId,
        status: "error",
        error: "Interface is required",
      })
    );
    throw new NonRetriableError("Interface is required");
  }

  const operation = data.operation ?? (data.method === "ADD" ? "UPDATE_DATA" : "GET_DATA");
  if (
    operation === "UPDATE_DATA" &&
    (!data.matchField?.trim() ||
      !data.matchValue?.trim() ||
      !data.updateField?.trim() ||
      !data.updateValue?.trim())
  ) {
    await publish(
      interfaceTableChannel().status({
        nodeId,
        status: "error",
      })
    );
    await publish(
      interfaceTableChannel().result({
        nodeId,
        status: "error",
        error: "Match field/value and update field/value are required for Update Data",
      })
    );
    throw new NonRetriableError("Invalid update configuration");
  }

  try {
    const result = await step.run(`interface-table-${nodeId}`, async () => {
      const item = await db.interface.findFirst({
        where: {
          id: data.interfaceId,
          userId,
          type: InterfaceType.TABLE,
        },
        include: {
          table: true,
        },
      });

      if (!item) {
        throw new NonRetriableError("Table interface not found");
      }

      const currentTableData = normalizeTableData(item.table?.dataJson);
      const headers = currentTableData.rows[0]?.cells ?? [];
      const dataRows = currentTableData.rows.slice(1);

      if (operation === "GET_DATA") {
        const responsePayload = {
          interfaceTable: {
            interfaceId: item.id,
            interfaceName: item.name,
            operation,
            headers,
            rows: rowsToObjects(dataRows, headers),
            totalRows: dataRows.length,
          },
        };

        return {
          ...context,
          [variableName]: responsePayload,
        };
      }

      const matchField = data.matchField!.trim();
      const updateField = data.updateField!.trim();
      const renderedMatchValue = Handlebars.compile(data.matchValue ?? "")(context);
      const renderedUpdateValue = Handlebars.compile(data.updateValue ?? "")(context);

      const headerMap = getHeaderMap(currentTableData);
      const matchColumnIndex = headerMap.get(matchField);
      const updateColumnIndex = headerMap.get(updateField);

      if (matchColumnIndex === undefined || updateColumnIndex === undefined) {
        throw new NonRetriableError("Selected match/update field does not exist in table headers");
      }

      const nextRows: TableRow[] = currentTableData.rows.map((row) => ({
        ...row,
        cells: [...row.cells],
      }));

      let updatedCount = 0;
      for (let rowIndex = 1; rowIndex < nextRows.length; rowIndex += 1) {
        const row = nextRows[rowIndex];
        if (!row) continue;
        const matchCell = row.cells[matchColumnIndex] ?? "";
        if (matchCell !== renderedMatchValue) continue;
        row.cells[updateColumnIndex] = renderedUpdateValue;
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

      const responsePayload = {
        interfaceTable: {
          interfaceId: item.id,
          interfaceName: item.name,
          operation,
          matchField,
          matchValue: renderedMatchValue,
          updateField,
          updateValue: renderedUpdateValue,
          updatedCount,
          rows: rowsToObjects(nextRows.slice(1), headers),
        },
      };

      return {
        ...context,
        [variableName]: responsePayload,
      };
    });

    await publish(
      interfaceTableChannel().result({
        nodeId,
        status: "success",
        output: JSON.stringify(result[variableName], null, 2),
      })
    );

    await publish(
      interfaceTableChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown interface table error";
    await publish(
      interfaceTableChannel().result({
        nodeId,
        status: "error",
        error: errorMessage,
      })
    );
    await publish(
      interfaceTableChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};