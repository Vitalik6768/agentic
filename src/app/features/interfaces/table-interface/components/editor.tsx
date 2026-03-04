"use client";

import { useSaveTableInterface, useSuspenseTableInterface, type TableDataJson } from "@/app/features/interfaces/table-interface/hooks/use-table-interface";
import { ImportFromWorkflowDialog } from "@/app/features/interfaces/table-interface/components/import-from-workflow-dialog";
import { ErrorView, LoadingView } from "@/components/entity-components";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Minus, Plus, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

type SelectedCell = {
  row: number;
  col: number;
};

type TableCellBinding = NonNullable<TableDataJson["bindings"]>[string];

const toBindingKey = (rowId: string, colIndex: number) => `${rowId}:${colIndex}`;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const getValueByPath = (root: unknown, path: string): unknown => {
  if (!path) return root;
  const segments = path.split(".").filter(Boolean);
  let current: unknown = root;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
      continue;
    }

    if (isRecord(current)) {
      current = current[segment];
      continue;
    }

    return undefined;
  }

  return current;
};

const toCellString = (value: unknown): string => {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol") return value.description ?? "symbol";
  if (typeof value === "function") return "[function]";
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable object]";
  }
};

const createRow = (columnCount: number) => ({
  id: `r_${crypto.randomUUID()}`,
  cells: Array.from({ length: columnCount }, () => ""),
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
  const candidate = input as { version?: unknown; rows?: unknown; bindings?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.rows) || candidate.rows.length === 0) {
    return getDefaultTableData();
  }

  const mappedRows = candidate.rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const castedRow = row as { id?: unknown; cells?: unknown };
      if (typeof castedRow.id !== "string" || !Array.isArray(castedRow.cells)) return null;

      const parsedCells = castedRow.cells.map((cell) => (typeof cell === "string" ? cell : String(cell ?? "")));
      return { id: castedRow.id, cells: parsedCells };
    })
    .filter((row): row is { id: string; cells: string[] } => Boolean(row));

  if (mappedRows.length === 0) return getDefaultTableData();

  const headerSize = mappedRows[0]?.cells.length ?? 0;
  const normalizedRows = mappedRows.map((row) => {
    if (row.cells.length === headerSize) return row;
    if (row.cells.length > headerSize) {
      return { ...row, cells: row.cells.slice(0, headerSize) };
    }
    return {
      ...row,
      cells: [...row.cells, ...Array.from({ length: headerSize - row.cells.length }, () => "")],
    };
  });

  const allowedRowIds = new Set(normalizedRows.map((row) => row.id));
  const normalizedBindings: NonNullable<TableDataJson["bindings"]> = {};

  if (isRecord(candidate.bindings)) {
    for (const [key, binding] of Object.entries(candidate.bindings)) {
      if (!binding || typeof binding !== "object") continue;
      const casted = binding as { workflowId?: unknown; path?: unknown; mode?: unknown };
      if (
        typeof casted.workflowId !== "string" ||
        typeof casted.path !== "string" ||
        casted.mode !== "latestOutput"
      ) {
        continue;
      }

      const [rowId, colIndexRaw] = key.split(":");
      const colIndex = Number(colIndexRaw);
      if (!rowId || !Number.isInteger(colIndex) || colIndex < 0 || !allowedRowIds.has(rowId)) continue;
      const row = normalizedRows.find((item) => item.id === rowId);
      if (!row || colIndex >= row.cells.length) continue;

      normalizedBindings[key] = {
        workflowId: casted.workflowId,
        path: casted.path,
        mode: "latestOutput",
      };
    }
  }

  return {
    version: 1,
    rows: normalizedRows,
    ...(Object.keys(normalizedBindings).length > 0 ? { bindings: normalizedBindings } : {}),
  };
};

export const TableInterfaceEditorLoading = () => {
  return <LoadingView message="Loading table interface..." />;
};

export const TableInterfaceEditorError = () => {
  return <ErrorView message="Error loading table interface..." />;
};

export function Editor({ interfaceId }: { interfaceId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: tableInterface } = useSuspenseTableInterface(interfaceId);
  const saveTableInterface = useSaveTableInterface();

  const initialData = useMemo(
    () => normalizeTableData(tableInterface.table?.dataJson),
    [tableInterface.table?.dataJson],
  );

  const [tableData, setTableData] = useState<TableDataJson>(initialData);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [editingCell, setEditingCell] = useState<SelectedCell | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importTargetCell, setImportTargetCell] = useState<SelectedCell | null>(null);
  const [isRefreshingBindings, setIsRefreshingBindings] = useState(false);
  const hasAutoRefreshedBindings = useRef(false);

  const updateCell = (
    rowIndex: number,
    colIndex: number,
    value: string,
    options?: {
      binding?: TableCellBinding;
      preserveBinding?: boolean;
    },
  ) => {
    setTableData((prev) => {
      const row = prev.rows[rowIndex];
      if (!row) return prev;

      const nextRows = prev.rows.map((item, rIdx) =>
        rIdx === rowIndex
          ? {
              ...item,
              cells: item.cells.map((cell, cIdx) => (cIdx === colIndex ? value : cell)),
            }
          : item,
      );

      const bindingKey = toBindingKey(row.id, colIndex);
      const currentBindings = prev.bindings ?? {};
      const nextBindings = { ...currentBindings };

      if (options?.binding) {
        nextBindings[bindingKey] = options.binding;
      } else if (!options?.preserveBinding) {
        delete nextBindings[bindingKey];
      }

      return {
        ...prev,
        rows: nextRows,
        ...(Object.keys(nextBindings).length > 0 ? { bindings: nextBindings } : {}),
      };
    });
  };

  const startEdit = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setEditingCell({ row, col });
    setEditingValue(tableData.rows[row]?.cells[col] ?? "");
  };

  const commitEdit = () => {
    if (!editingCell) return;
    updateCell(editingCell.row, editingCell.col, editingValue);
    setEditingCell(null);
  };

  const addColumn = () => {
    setTableData((prev) => ({
      ...prev,
      rows: prev.rows.map((row, index) => ({
        ...row,
        cells: [...row.cells, index === 0 ? `Column ${row.cells.length + 1}` : ""],
      })),
    }));
  };

  const removeColumn = () => {
    const colCount = tableData.rows[0]?.cells.length ?? 0;
    if (colCount <= 1) return;

    const removedIndex = colCount - 1;

    setTableData((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => ({
        ...row,
        cells: row.cells.slice(0, -1),
      })),
      ...(prev.bindings
        ? {
            bindings: Object.fromEntries(
              Object.entries(prev.bindings).filter(([key]) => {
                const parts = key.split(":");
                const colIndex = Number(parts[1]);
                return !Number.isInteger(colIndex) || colIndex !== removedIndex;
              }),
            ),
          }
        : {}),
    }));

    setSelectedCell((prev) => {
      if (!prev) return prev;
      if (prev.col < removedIndex) return prev;
      return { row: prev.row, col: Math.max(0, removedIndex - 1) };
    });

    setEditingCell((prev) => {
      if (!prev) return prev;
      if (prev.col < removedIndex) return prev;
      return null;
    });
  };

  const addRow = () => {
    const colCount = tableData.rows[0]?.cells.length ?? 0;
    if (colCount === 0) return;
    setTableData((prev) => ({
      ...prev,
      rows: [...prev.rows, createRow(colCount)],
    }));
  };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!selectedCell || editingCell) return;

    if (event.key === "Enter") {
      event.preventDefault();
      startEdit(selectedCell.row, selectedCell.col);
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      updateCell(selectedCell.row, selectedCell.col, "");
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSelectedCell((prev) => (prev ? { row: prev.row, col: prev.col + 1 } : prev));
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSelectedCell((prev) => (prev ? { row: prev.row, col: Math.max(0, prev.col - 1) } : prev));
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedCell((prev) =>
        prev ? { row: Math.min(tableData.rows.length - 1, prev.row + 1), col: prev.col } : prev,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedCell((prev) => (prev ? { row: Math.max(0, prev.row - 1), col: prev.col } : prev));
    }
  };

  const handleSave = async () => {
    await saveTableInterface.mutateAsync({
      id: interfaceId,
      dataJson: tableData,
    });
  };

  const handleImportVariable = (payload: {
    value: string;
    workflowId: string;
    path: string;
  }) => {
    if (!importTargetCell) return;
    updateCell(importTargetCell.row, importTargetCell.col, payload.value, {
      binding: {
        workflowId: payload.workflowId,
        path: payload.path,
        mode: "latestOutput",
      },
    });
    setSelectedCell({ row: importTargetCell.row, col: importTargetCell.col });
    setImportTargetCell(null);
  };

  const handleRefreshLinkedValues = async () => {
    const bindings = tableData.bindings;
    if (!bindings || Object.keys(bindings).length === 0) return;

    const workflowIds = Array.from(new Set(Object.values(bindings).map((binding) => binding.workflowId)));
    if (workflowIds.length === 0) return;

    setIsRefreshingBindings(true);
    try {
      const outputs = await Promise.all(
        workflowIds.map(async (workflowId) => {
          const result = await queryClient.fetchQuery(
            trpc.executions.getLatestWorkflowOutput.queryOptions({ workflowId }),
          );
          return [workflowId, result?.output] as const;
        }),
      );

      const outputMap = new Map<string, unknown>(outputs);

      setTableData((prev) => {
        if (!prev.bindings || Object.keys(prev.bindings).length === 0) return prev;

        const nextRows = prev.rows.map((row) => ({
          ...row,
          cells: [...row.cells],
        }));

        for (const [bindingKey, binding] of Object.entries(prev.bindings)) {
          const [rowId, colIndexRaw] = bindingKey.split(":");
          const colIndex = Number(colIndexRaw);
          if (!rowId || !Number.isInteger(colIndex) || colIndex < 0) continue;

          const rowIndex = nextRows.findIndex((row) => row.id === rowId);
          if (rowIndex < 0) continue;
          if (colIndex >= nextRows[rowIndex]!.cells.length) continue;

          const workflowOutput = outputMap.get(binding.workflowId);
          const resolved = getValueByPath(workflowOutput, binding.path);
          nextRows[rowIndex]!.cells[colIndex] = toCellString(resolved);
        }

        return {
          ...prev,
          rows: nextRows,
        };
      });
    } finally {
      setIsRefreshingBindings(false);
    }
  };

  useEffect(() => {
    const bindingCount = tableData.bindings ? Object.keys(tableData.bindings).length : 0;
    if (hasAutoRefreshedBindings.current || bindingCount === 0) {
      return;
    }

    hasAutoRefreshedBindings.current = true;
    void handleRefreshLinkedValues();
  }, [tableData.bindings, handleRefreshLinkedValues]);

  return (
    <div className="space-y-4 h-full">
      <ImportFromWorkflowDialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            setImportTargetCell(null);
          }
        }}
        onImport={handleImportVariable}
      />
      <Card className="p-4 border-0 shadow-none rounded-lg h-full flex flex-col">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold leading-none tracking-tight">{tableInterface.name}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addColumn}>
              <Plus className="mr-1.5 size-4" />
              Column
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={removeColumn}
              disabled={(tableData.rows[0]?.cells.length ?? 0) <= 1}
            >
              <Minus className="mr-1.5 size-4" />
              Remove Column
            </Button>
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1.5 size-4" />
              Row
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRefreshLinkedValues()}
              disabled={isRefreshingBindings || !tableData.bindings || Object.keys(tableData.bindings).length === 0}
            >
              {isRefreshingBindings ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 size-4" />
              )}
              Refresh linked values
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saveTableInterface.isPending}>
              {saveTableInterface.isPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 size-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        <div className="overflow-auto rounded-md border" onKeyDown={handleGridKeyDown} tabIndex={0}>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {tableData.rows.map((row, rowIndex) => (
                <tr key={row.id} className={cn(rowIndex === 0 && "bg-muted/50")}>
                  {row.cells.map((cell, colIndex) => {
                    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                    return (
                      <td
                        key={`${row.id}-${colIndex}`}
                        className={cn(
                          "group relative min-w-[140px] border p-0 align-top",
                          rowIndex === 0 && "font-medium",
                          isSelected && "ring-2 ring-primary",
                        )}
                        onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                        onDoubleClick={() => startEdit(rowIndex, colIndex)}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingValue}
                            onChange={(event) => setEditingValue(event.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === "Tab") {
                                event.preventDefault();
                                commitEdit();
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                setEditingCell(null);
                              }
                            }}
                            className="h-10 w-full border-0 bg-background px-2 outline-none"
                          />
                        ) : (
                          <div className="h-10 px-2 py-2 text-muted-foreground">{cell || "\u00A0"}</div>
                        )}
                        {rowIndex > 0 ? (
                          <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                              "absolute right-1 top-1 z-10 size-6 p-0 transition-opacity",
                              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                            )}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const targetCell = { row: rowIndex, col: colIndex };
                              setSelectedCell(targetCell);
                              setImportTargetCell(targetCell);
                              setImportDialogOpen(true);
                            }}
                          >
                            <Download className="size-3.5" />
                          </Button>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
