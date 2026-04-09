import { Badge } from '@/components/ui/badge'

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'recalled' | 'active' | 'completed' | 'amended'

const statusConfig: Record<Status, { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' | 'info' }> = {
  pending:   { label: '待審核', variant: 'warning' },
  approved:  { label: '已核准', variant: 'success' },
  rejected:  { label: '已駁回', variant: 'destructive' },
  cancelled: { label: '已取消', variant: 'secondary' },
  recalled:  { label: '已撤回', variant: 'secondary' },
  active:    { label: '進行中', variant: 'info' },
  completed: { label: '已完成', variant: 'success' },
  amended:   { label: '已修改', variant: 'warning' },
}

interface StatusBadgeProps {
  status: Status
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: 'secondary' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
