import "server-only"

import { NextResponse } from "next/server"

export function csvCell(value: unknown) {
  if (value === null || value === undefined) return ""
  const text = typeof value === "object" ? JSON.stringify(value) : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function makeCsvResponse(filenamePrefix: string, columns: string[], rows: Array<Record<string, unknown>>) {
  const csvRows = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ]

  return new NextResponse(csvRows.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
