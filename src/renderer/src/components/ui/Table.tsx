import { ReactNode, useState } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up'
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down'
import ChevronsUpDown from 'lucide-react/dist/esm/icons/chevrons-up-down'

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

type SortDirection = 'asc' | 'desc' | null

interface Column<T> {
  header: string
  accessor: keyof T | ((item: T) => ReactNode)
  className?: string
  sortable?: boolean
  sortKey?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  className?: string
  onRowClick?: (item: T) => void
  sortable?: boolean
  onSort?: (sortKey: string, direction: SortDirection) => void
  sortColumn?: string
  sortDirection?: SortDirection
}

export function Table<T>({
  columns,
  data,
  className,
  onRowClick,
  sortable = false,
  onSort,
  sortColumn,
  sortDirection
}: TableProps<T>) {
  const [internalSortColumn, setInternalSortColumn] = useState<string>('')
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>(null)

  const currentSortColumn = sortColumn ?? internalSortColumn
  const currentSortDirection = sortDirection ?? internalSortDirection

  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !column.sortKey) return

    let newDirection: SortDirection = 'asc'
    if (currentSortColumn === column.sortKey) {
      if (currentSortDirection === 'asc') {
        newDirection = 'desc'
      } else if (currentSortDirection === 'desc') {
        newDirection = null
      }
    }

    if (onSort) {
      onSort(column.sortKey, newDirection)
    } else {
      setInternalSortColumn(newDirection ? column.sortKey : '')
      setInternalSortDirection(newDirection)
    }
  }

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable || !column.sortKey) return null

    if (currentSortColumn !== column.sortKey) {
      return <ChevronsUpDown size={14} className="text-slate-400" />
    }

    if (currentSortDirection === 'asc') {
      return <ChevronUp size={14} className="text-emerald-600" />
    }

    if (currentSortDirection === 'desc') {
      return <ChevronDown size={14} className="text-emerald-600" />
    }

    return <ChevronsUpDown size={14} className="text-slate-400" />
  }

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700',
        className
      )}
    >
      <table className="w-full text-start border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={cn(
                  'px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700',
                  col.sortable && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors select-none',
                  col.className
                )}
                onClick={() => sortable && col.sortable && handleSort(col)}
              >
                <div
                  className={cn(
                    'flex items-center gap-2',
                    col.className?.includes('text-center')
                      ? 'justify-center'
                      : col.className?.includes('text-left') || col.className?.includes('text-end')
                        ? 'justify-end'
                        : 'justify-start'
                  )}
                >
                  {col.header}
                  {sortable && col.sortable && getSortIcon(col)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-10 text-center text-slate-500 dark:text-slate-400"
              >
                لا توجد بيانات متاحة
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={cn(
                      'px-6 py-4 text-sm text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700',
                      col.className
                    )}
                  >
                    {typeof col.accessor === 'function'
                      ? col.accessor(item)
                      : (item[col.accessor] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
