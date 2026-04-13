import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { useToast } from '@/hooks/use-toast'
import { useLeaveTypes, useSubmitLeaveRequest } from '@/api/leave.api'
import { useColleagues } from '@/api/users.api'

const schema = z.object({
  leave_type_id: z.string().uuid('請選擇假別'),
  start_time: z.string().min(1, '請選擇開始日期'),
  end_time: z.string().min(1, '請選擇結束日期'),
  half_day: z.boolean().default(false),
  half_day_period: z.enum(['am', 'pm']).nullable().optional(),
  work_proxy_user_id: z.string().uuid().nullable().optional(),
  reason: z.string().max(500).optional(),
}).refine((d) => d.start_time <= d.end_time, {
  message: '結束日期不得早於開始日期',
  path: ['end_time'],
})

type FormData = z.infer<typeof schema>

export default function LeaveApplyPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: leaveTypes = [] } = useLeaveTypes()
  const { data: colleagues = [] } = useColleagues()
  const submitLeave = useSubmitLeaveRequest()
  const [isHalfDay, setIsHalfDay] = useState(false)

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { half_day: false, half_day_period: null },
  })

  const onSubmit = async (data: FormData) => {
    try {
      // Convert date strings to ISO datetime (use start/end of workday in Taipei)
      const startISO = `${data.start_time}T09:00:00+08:00`
      const endISO = `${data.end_time}T18:00:00+08:00`

      await submitLeave.mutateAsync({
        leave_type_id: data.leave_type_id,
        start_time: startISO,
        end_time: endISO,
        half_day: data.half_day,
        half_day_period: data.half_day ? data.half_day_period : null,
        work_proxy_user_id: data.work_proxy_user_id ?? null,
        reason: data.reason || null,
      })
      toast({
        title: '請假申請已送出',
        description: data.work_proxy_user_id ? '等待代理人確認後，再進入主管審核' : '等待主管審核',
      })
      navigate('/leave/history')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? '送出失敗，請再試'
      toast({ variant: 'destructive', title: '申請失敗', description: msg })
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">請假申請</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">填寫請假資訊</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="假別" error={errors.leave_type_id} required>
              <Controller
                name="leave_type_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="選擇假別" /></SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name_zh}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="開始日期" error={errors.start_time} required>
                <Input type="date" {...register('start_time')} />
              </FormField>
              <FormField label="結束日期" error={errors.end_time} required>
                <Input type="date" {...register('end_time')} />
              </FormField>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={isHalfDay}
                onCheckedChange={(v) => {
                  setIsHalfDay(!!v)
                  setValue('half_day', !!v)
                }}
              />
              <span className="text-sm">半天假</span>
            </label>

            {isHalfDay && (
              <FormField label="上/下午" error={errors.half_day_period} required>
                <Controller
                  name="half_day_period"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger><SelectValue placeholder="選擇" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="am">上午（09:00–13:00）</SelectItem>
                        <SelectItem value="pm">下午（14:00–18:00）</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}

            <FormField label="代理人" error={errors.work_proxy_user_id}>
              <Controller
                name="work_proxy_user_id"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                    value={field.value ?? 'none'}
                  >
                    <SelectTrigger><SelectValue placeholder="選填，選擇代理人" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不指定</SelectItem>
                      {colleagues.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}（{c.employee_id}）</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="原因" error={errors.reason}>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[80px] resize-none"
                placeholder="選填"
                {...register('reason')}
              />
            </FormField>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>取消</Button>
              <Button type="submit" disabled={submitLeave.isPending}>
                {submitLeave.isPending ? '送出中...' : '送出申請'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
