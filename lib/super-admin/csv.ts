export function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return ""
  const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value)
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

export function rowsToCsv(rows: Record<string, unknown>[], columns: string[]) {
  const header = columns.map(escapeCsvValue).join(",")
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(","))
  return [header, ...body].join("\n")
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  })
}
