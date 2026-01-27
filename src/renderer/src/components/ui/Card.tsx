import { ReactNode } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  extra?: ReactNode
}

export function Card({ children, className, title, extra }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden',
        className
      )}
    >
      {(title || extra) && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          {title && <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>}
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
