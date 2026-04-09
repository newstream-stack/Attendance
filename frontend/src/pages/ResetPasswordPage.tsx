import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { useToast } from '@/hooks/use-toast'
import { apiResetPassword } from '@/api/auth.api'

const schema = z.object({
  newPassword: z.string().min(8, '新密碼至少 8 個字元'),
  confirmPassword: z.string().min(1, '請確認新密碼'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: '兩次密碼輸入不一致',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const token = searchParams.get('token') ?? ''

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast({ variant: 'destructive', title: '連結無效', description: '請重新申請密碼重設' })
      return
    }
    setLoading(true)
    try {
      await apiResetPassword(token, data.newPassword)
      toast({ title: '密碼已重設', description: '請使用新密碼登入' })
      navigate('/login')
    } catch {
      toast({ variant: 'destructive', title: '重設失敗', description: '連結已失效，請重新申請' })
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">連結無效</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">此重設連結無效或已過期。</p>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            重新申請密碼重設
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">設定新密碼</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="新密碼" error={errors.newPassword} required>
            <Input type="password" placeholder="至少 8 個字元" {...register('newPassword')} />
          </FormField>
          <FormField label="確認新密碼" error={errors.confirmPassword} required>
            <Input type="password" placeholder="再次輸入新密碼" {...register('confirmPassword')} />
          </FormField>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '更新中...' : '設定新密碼'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
