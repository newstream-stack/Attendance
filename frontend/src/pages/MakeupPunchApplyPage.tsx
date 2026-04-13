import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/shared/FormField'
import { useToast } from '@/hooks/use-toast'
import { useSubmitMakeupPunchRequest, useMakeupPunchRules } from '@/api/makeupPunch.api'

const schema = z.object({
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '請選擇日期'),
  punch_type: z.enum(['clock_in', 'clock_out']),
  requested_time: z.string().regex(/^\d{2}:\d{2}$/, '請選擇時間'),
  reason: z.string().max(1000).optional(),
})

type FormData = z.infer<typeof schema>

export default function MakeupPunchApplyPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: rules } = useMakeupPunchRules()
  const submit = useSubmitMakeupPunchRequest()

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { punch_type: 'clock_in' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await submit.mutateAsync({
        work_date: data.work_date,
        punch_type: data.punch_type,
        requested_time: data.requested_time + ':00',
        reason: data.reason || null,
      })
      toast({ title: '補打卡申請已送出', description: '等待管理員審核' })
      navigate('/makeup-punch/history')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '送出失敗'
      toast({ variant: 'destructive', title: '申請失敗', description: msg })
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">補打卡申請</h1>
      {rules && (
        <p className="text-sm text-slate-500 mb-4">
          申請截止：補打日期起算第 {rules.deadline_working_days} 個工作日結束前
        </p>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">填寫補打卡資訊</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="補打日期" error={errors.work_date} required>
              <Input type="date" {...register('work_date')} />
            </FormField>

            <FormField label="打卡類型" error={errors.punch_type} required>
              <Controller
                name="punch_type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clock_in">補上班打卡</SelectItem>
                      <SelectItem value="clock_out">補下班打卡</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="打卡時間" error={errors.requested_time} required>
              <Input type="time" {...register('requested_time')} />
            </FormField>

            <FormField label={`說明${rules?.reason_required ? '' : '（選填）'}`} error={errors.reason} required={rules?.reason_required}>
              <Textarea placeholder="請說明補打卡原因" rows={3} {...register('reason')} />
            </FormField>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>取消</Button>
              <Button type="submit" disabled={submit.isPending}>
                {submit.isPending ? '送出中...' : '送出申請'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
