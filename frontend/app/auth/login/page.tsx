'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Please enter username and password')
      return
    }
    setLoading(true)
    try {
      await authApi.login(username.trim(), password)
      const user = await authApi.getCurrentUser()
      const role = String(user?.role || '').toLowerCase()
      // Set user_role cookie so Next.js middleware can enforce route access
      const isAdmin = role === 'owner' || role === 'admin'
      document.cookie = `user_role=${isAdmin ? 'admin' : 'collector'}; path=/; max-age=86400; samesite=lax`
      if (isAdmin) {
        router.push('/admin/dashboard')
      } else {
        router.push('/collector/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary/10 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <Image src="/logo.png" alt="Sri Sendhur Sri Lakshmi Finance" width={96} height={96} priority unoptimized className="rounded-xl object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Sri Sendhur | Sri Lakshmi</h1>
          <p className="text-muted-foreground mt-2">Finance Collection Management</p>
        </div>

        <Card className="border-border/40 shadow-2xl backdrop-blur-xl bg-card/95">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl tracking-tight">Welcome Back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Username</label>
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-border/50"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-border/50"
                  disabled={loading}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 rounded-lg transition-all active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 Sri Sendhur | Sri Lakshmi Finance. All rights reserved.
        </p>
      </div>
    </div>
  )
}
