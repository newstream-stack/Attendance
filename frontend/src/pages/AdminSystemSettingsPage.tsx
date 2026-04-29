import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { useToast } from '@/hooks/use-toast'
import { useSystemSettings, useUpdateSystemSettings } from '@/api/systemSettings.api'

const schema = z.object({
  work_start_time: z.string().regex(/^\d{2}:\d{2}$/, '請輸入 HH:MM 格式'),
  work_end_time: z.string().regex(/^\d{2}:\d{2}$/, '請輸入 HH:MM 格式'),
  late_tolerance_mins: z.coerce.number().int().min(0, '不可為負數'),
  hours_per_day: z.coerce.number().int().min(1).max(24),
  base_bonus_days: z.coerce.number().int().min(0),
})

type FormData = z.infer<typeof schema>

export default function AdminSystemSettingsPage() {
  const { toast } = useToast()
  const { data: settings, isLoading } = useSystemSettings()
  const update = useUpdateSystemSettings()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      work_start_time: '09:00',
      work_end_time: '18:00',
      late_tolerance_mins: 0,
      hours_per_day: 8,
      base_bonus_days: 0,
    },
  })

  useEffect(() => {
    if (settings) {
      reset({
        work_start_time: settings.work_start_time.slice(0, 5),
        work_end_time: settings.work_end_time.slice(0, 5),
        late_tolerance_mins: settings.late_tolerance_mins,
        hours_per_day: settings.hours_per_day,
        base_bonus_days: settings.base_bonus_days,
      })
      setCcEmails(settings.notification_cc_emails ?? [])
    }
  }, [settings, reset])

  const onSubmit = (data: FormData) => {
    update.mutate(data, {
      onSuccess: () => toast({ title: '設定已儲存' }),
      onError: () => toast({ title: '儲存失敗', variant: 'destructive' }),
    })
  }

  // ── Notification CC emails ──────────────────────────────────────────────────
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [ccInput, setCcInput] = useState('')
  const [ccError, setCcError] = useState('')

  const addCcEmail = () => {
    const email = ccInput.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCcError('請輸入有效的 Email 格式')
      return
    }
    if (ccEmails.includes(email)) {
      setCcError('此 Email 已存在')
      return
    }
    setCcError('')
    const next = [...ccEmails, email]
    setCcEmails(next)
    setCcInput('')
    update.mutate({ notification_cc_emails: next }, {
      onSuccess: () => toast({ title: '已新增收件人' }),
      onError: () => toast({ title: '儲存失敗', variant: 'destructive' }),
    })
  }

  const removeCcEmail = (email: string) => {
    const next = ccEmails.filter((e) => e !== email)
    setCcEmails(next)
    update.mutate({ notification_cc_emails: next }, {
      onSuccess: () => toast({ title: '已移除收件人' }),
      onError: () => toast({ title: '儲存失敗', variant: 'destructive' }),
    })
  }

  if (isLoading) return <div className="p-6 text-slate-500">載入中…</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">系統設定</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">上班時間與遲到設定</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="上班時間" error={errors.work_start_time?.message}>
              <Input type="time" {...register('work_start_time')} />
            </FormField>

            <FormField label="下班時間" error={errors.work_end_time?.message}>
              <Input type="time" {...register('work_end_time')} />
            </FormField>

            <FormField label="遲到容許分鐘數" error={errors.late_tolerance_mins?.message}>
              <Input type="number" min={0} {...register('late_tolerance_mins')} />
            </FormField>

            <FormField label="每日工時（小時）" error={errors.hours_per_day?.message}>
              <Input type="number" min={1} max={24} {...register('hours_per_day')} />
            </FormField>

            <FormField label="年假基礎獎勵天數" error={errors.base_bonus_days?.message}>
              <Input type="number" min={0} {...register('base_bonus_days')} />
            </FormField>

            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? '儲存中…' : '儲存設定'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">申請通知收件人</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            員工提交請假、加班、補打卡申請時，除審核人外，也會寄送副本給以下 Email。
          </p>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="輸入 Email"
                value={ccInput}
                onChange={(e) => { setCcInput(e.target.value); setCcError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCcEmail() } }}
              />
              {ccError && <p className="mt-1 text-xs text-red-500">{ccError}</p>}
            </div>
            <Button type="button" variant="outline" onClick={addCcEmail}>新增</Button>
          </div>

          {ccEmails.length === 0 ? (
            <p className="text-sm text-slate-400">尚未設定任何收件人</p>
          ) : (
            <ul className="space-y-2">
              {ccEmails.map((email) => (
                <li key={email} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeCcEmail(email)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
