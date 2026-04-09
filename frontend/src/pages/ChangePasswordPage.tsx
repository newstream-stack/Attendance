import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

const schema = z.object({
  oldPassword: z.string().min(1, '請輸入目前密碼'),
  newPassword: z.string().min(8, '新密碼至少 8 個字元'),
  confirmPassword: z.string().min(1, '請確認新密碼'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: '兩次密碼輸入不一致',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { changePassword, logout } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await changePassword(data.oldPassword, data.newPassword)
      await logout()
      toast({ title: '密碼已更新', description: '請使用新密碼登入' })
      navigate('/login')
    } catch {
      toast({ variant: 'destructive', title: '更新失敗', description: '目前密碼不正確，請重試' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-xl">修改密碼</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="目前密碼" error={errors.oldPassword} required>
            <Input type="password" placeholder="請輸入目前密碼" {...register('oldPassword')} />
          </FormField>
          <FormField label="新密碼" error={errors.newPassword} required>
            <Input type="password" placeholder="至少 8 個字元" {...register('newPassword')} />
          </FormField>
          <FormField label="確認新密碼" error={errors.confirmPassword} required>
            <Input type="password" placeholder="再次輸入新密碼" {...register('confirmPassword')} />
          </FormField>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '更新中...' : '確認修改'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
