import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { useToast } from '@/hooks/use-toast'
import { useMakeupPunchRules, useUpdateMakeupPunchRules } from '@/api/makeupPunch.api'

const schema = z.object({
  deadline_working_days: z.coerce.number().int().min(1, '至少 1 個工作日'),
  reason_required: z.enum(['true', 'false']),
})

type FormData = z.infer<typeof schema>

export default function AdminMakeupPunchRulesPage() {
  const { toast } = useToast()
  const { data: rules, isLoading } = useMakeupPunchRules()
  const update = useUpdateMakeupPunchRules()

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { deadline_working_days: 1, reason_required: 'true' },
  })

  useEffect(() => {
    if (rules) {
      reset({
        deadline_working_days: rules.deadline_working_days,
        reason_required: rules.reason_required ? 'true' : 'false',
      })
    }
  }, [rules, reset])

  const onSubmit = async (data: FormData) => {
    try {
      await update.mutateAsync({
        deadline_working_days: Number(data.deadline_working_days),
        reason_required: data.reason_required === 'true',
      })
      toast({ title: '規則已更新' })
    } catch {
      toast({ variant: 'destructive', title: '更新失敗' })
    }
  }

  if (isLoading) return <p className="text-slate-500">載入中...</p>

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">補打卡規則設定</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">規則設定</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="申請截止（工作日）"
              error={errors.deadline_working_days}
              required
            >
              <Input
                type="number"
                min={1}
                {...register('deadline_working_days')}
              />
            </FormField>

            <FormField label="是否必填說明" error={errors.reason_required} required>
              <Controller
                name="reason_required"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">必填</SelectItem>
                      <SelectItem value="false">選填</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <div className="pt-2">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? '儲存中...' : '儲存設定'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
