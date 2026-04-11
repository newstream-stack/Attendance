import { useEffect } from 'react'
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
    }
  }, [settings, reset])

  const onSubmit = (data: FormData) => {
    update.mutate(data, {
      onSuccess: () => toast({ title: '設定已儲存' }),
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
    </div>
  )
}
