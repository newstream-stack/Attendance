import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { useToast } from '@/hooks/use-toast'
import { apiForgotPassword } from '@/api/auth.api'

const schema = z.object({
  email: z.string().email('請輸入有效的 Email'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await apiForgotPassword(data.email)
      setSent(true)
    } catch {
      toast({ variant: 'destructive', title: '發送失敗', description: '請稍後再試' })
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">郵件已發送</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            若此 Email 已註冊，您將收到密碼重設連結，連結 1 小時內有效。
          </p>
          <Link to="/login" className="text-sm text-primary hover:underline">
            返回登入
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">忘記密碼</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Email" error={errors.email} required>
            <Input
              type="email"
              placeholder="your@company.com"
              autoComplete="email"
              {...register('email')}
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '發送中...' : '發送重設連結'}
          </Button>
          <p className="text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              返回登入
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
