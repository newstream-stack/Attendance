import { ReactNode } from 'react'
import { FieldError } from 'react-hook-form'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: FieldError
  required?: boolean
  className?: string
  children: ReactNode
}

export function FormField({ label, error, required, className, children }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  )
}
