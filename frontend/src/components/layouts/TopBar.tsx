import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from '@/components/shared/NotificationBell'

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user } = useAuth()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
      {/* Hamburger (mobile) */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden lg:block" /> {/* spacer */}

      <div className="flex items-center gap-3">
        <NotificationBell />

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
            {user?.fullName?.[0] ?? '?'}
          </div>
          <span className="hidden sm:block text-sm font-medium">{user?.fullName}</span>
        </div>
      </div>
    </header>
  )
}
