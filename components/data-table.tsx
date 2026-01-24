"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty } from "@/components/ui/empty"

export interface DataTableColumn<T> {
  key: keyof T
  label: string
  render?: (value: T[keyof T], row: T) => ReactNode
  width?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  rowClassName?: string
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  empty = false,
  emptyMessage = "No data available",
  rowClassName,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="w-full border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={String(col.key)} style={{ width: col.width }}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={String(col.key)}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (empty || data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 border rounded-lg">
        <Empty
          title="No Data"
          description={emptyMessage}
        />
      </div>
    )
  }

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={String(col.key)} style={{ width: col.width }}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id} className={rowClassName}>
              {columns.map((col) => (
                <TableCell key={String(col.key)}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
