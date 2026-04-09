import { useState } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications, useMarkRead, useMarkAllRead } from '@/api/notifications.api'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const unread = data?.unread ?? 0
  const notifications = data?.notifications ?? []

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative" onClick={() => setOpen((o) => !o)}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-white shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-medium text-sm">通知</span>
              {unread > 0 && (
                <button
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="h-3 w-3" />全部已讀
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">目前沒有通知</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50' : ''}`}
                    onClick={() => { if (!n.is_read) markRead.mutate(n.id) }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.is_read && <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />}
                    </div>
                    {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(n.created_at).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
