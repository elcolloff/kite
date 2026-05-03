import { useMemo, useState, type ReactNode } from 'react'
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'

import { ResourceTableView } from '@/components/resource-table-view'

import type { DataTableColumn, DataTableProps } from './types'

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  return String(value)
}

function getColumnId<T>(column: DataTableColumn<T>, index: number) {
  return column.id || column.accessorKey || `column-${index}`
}

function toColumnDef<T>(
  column: DataTableColumn<T>,
  index: number
): ColumnDef<T> {
  const accessorKey = column.accessorKey

  return {
    id: getColumnId(column, index),
    header: () => column.header,
    accessorFn:
      column.accessorFn ||
      (accessorKey ? (row) => row[accessorKey] : () => undefined),
    cell: ({ row, getValue }) => {
      const value = getValue()
      return column.cell
        ? column.cell({ row: row.original, value, index: row.index })
        : renderValue(value)
    },
    enableSorting: column.enableSorting,
    meta: {
      align: column.align,
      className: column.className,
      headerClassName: column.headerClassName,
    },
  }
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  rowKey,
  emptyText = 'No results.',
  loadingText = 'Loading...',
  emptyState,
  totalRowCount,
  filteredRowCount,
  searchQuery = '',
  maxBodyHeightClassName,
  fitViewportHeight = false,
  className,
}: DataTableProps<T>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [sorting, setSorting] = useState<SortingState>([])
  const tableColumns = useMemo(
    () => columns.map((column, index) => toColumnDef(column, index)),
    [columns]
  )

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: rowKey,
    autoResetPageIndex: false,
  })

  const resolvedEmptyState =
    emptyState ??
    (data.length === 0 ? (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        {isLoading ? loadingText : emptyText}
      </div>
    ) : null)
  const resolvedTotalRowCount = totalRowCount ?? data.length
  const resolvedFilteredRowCount = filteredRowCount ?? data.length

  return (
    <ResourceTableView
      table={table}
      columnCount={columns.length}
      isLoading={isLoading}
      data={data}
      allPageSize={data.length}
      maxBodyHeightClassName={maxBodyHeightClassName}
      containerClassName={className}
      fitViewportHeight={fitViewportHeight}
      emptyState={resolvedEmptyState}
      hasActiveFilters={
        Boolean(searchQuery) || resolvedFilteredRowCount !== resolvedTotalRowCount
      }
      filteredRowCount={resolvedFilteredRowCount}
      totalRowCount={resolvedTotalRowCount}
      searchQuery={searchQuery}
      pagination={pagination}
      setPagination={setPagination}
    />
  )
}
