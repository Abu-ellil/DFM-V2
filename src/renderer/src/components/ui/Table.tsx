import { ReactNode } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface Column<T> {
  header: string
  accessor: keyof T | ((item: T) => ReactNode)
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  className?: string
  onRowClick?: (item: T) => void
}

export function Table<T>({ columns, data, className, onRowClick }: TableProps<T>) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700',
        className
      )}
    >
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/50">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={cn(
                  'px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.map.length}
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
