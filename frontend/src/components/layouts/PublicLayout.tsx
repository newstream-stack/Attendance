import { ReactNode } from 'react'

interface PublicLayoutProps {
  children: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">出缺勤管理系統</h1>
          <p className="text-sm text-slate-500 mt-1">Attendance Management System</p>
        </div>
        {children}
      </div>
    </div>
  )
}
