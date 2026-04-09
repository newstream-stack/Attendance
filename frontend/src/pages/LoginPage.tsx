import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/shared/FormField'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

const REMEMBER_EMAIL_KEY = 'remembered_email'
const REMEMBER_PASSWORD_KEY = 'remembered_password'

const loginSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(1, '請輸入密碼'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(
    () => !!localStorage.getItem(REMEMBER_EMAIL_KEY)
  )

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: localStorage.getItem(REMEMBER_EMAIL_KEY) ?? '',
      password: localStorage.getItem(REMEMBER_PASSWORD_KEY) ?? '',
    },
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, data.email)
        localStorage.setItem(REMEMBER_PASSWORD_KEY, data.password)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
        localStorage.removeItem(REMEMBER_PASSWORD_KEY)
      }
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch {
      toast({ variant: 'destructive', title: '登入失敗', description: 'Email 或密碼不正確' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">員工登入</CardTitle>
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
          <FormField label="密碼" error={errors.password} required>
            <Input
              type="password"
              placeholder="請輸入密碼"
              autoComplete="current-password"
              {...register('password')}
            />
          </FormField>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
              />
              <span className="text-sm">記住帳號密碼</span>
            </label>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              忘記密碼？
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '登入中...' : '登入'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
