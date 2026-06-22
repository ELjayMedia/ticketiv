"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  align?: "left" | "right" | "center";
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
}

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

const skeletonWidths = [
  ["60%", "80%", "40%", "70%", "55%"],
  ["75%", "50%", "90%", "35%", "65%"],
  ["45%", "70%", "60%", "85%", "50%"],
];

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyState,
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  function getCellValue(row: T, accessor: Column<T>["accessor"]): React.ReactNode {
    if (typeof accessor === "function") {
      return accessor(row);
    }
    const value = row[accessor];
    if (value === null || value === undefined) return null;
    return value as React.ReactNode;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead className="border-b border-line">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  "px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-ink-3 font-medium",
                  alignClass[col.align ?? "left"],
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            skeletonWidths.map((widths, rowIdx) => (
              <tr key={rowIdx} className="border-b border-line last:border-0">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-3 py-3">
                    <div
                      className="h-3.5 rounded bg-surface-2 animate-pulse"
                      style={{ width: widths[colIdx % widths.length] }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="py-10 text-center font-mono text-[12px] text-ink-3">
                  {emptyState ?? "No data"}
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "border-b border-line last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-surface-2"
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={cn(
                      "px-3 py-3",
                      alignClass[col.align ?? "left"],
                      col.className
                    )}
                  >
                    {getCellValue(row, col.accessor)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
