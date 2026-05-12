'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IndianRupee, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle, Building2, User, Phone, Mail, Lock } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1 = org info, 2 = personal info
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    org_name: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    password: '',
    confirm_password: '',
  })

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const validateStep1 = () => {
    if (!formData.org_name.trim()) {
      setError('Organization name is required')
      return false
    }
    if (formData.org_name.trim().length < 2) {
      setError('Organization name must be at least 2 characters')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.first_name.trim()) {
      setError('First name is required')
      return false
    }
    if (!formData.phone_number.trim()) {
      setError('Phone number is required')
      return false
    }
    if (!/^\d{10}$/.test(formData.phone_number.replace(/[\s-]/g, ''))) {
      setError('Please enter a valid 10-digit phone number')
      return false
    }
    if (!formData.password) {
      setError('Password is required')
      return false
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match')
      return false
    }
    return true
  }

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return

    setLoading(true)
    setError('')

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
      const base = API_BASE_URL === '/api' ? '' : API_BASE_URL.replace(/\/api$/, '')

      const response = await fetch(`${base}/api/users/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: formData.org_name.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone_number: formData.phone_number.replace(/[\s-]/g, ''),
          email: formData.email.trim(),
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Extract error message
        const errMsg = data.error || data.detail ||
          (typeof data === 'object' ? Object.values(data).flat().join(', ') : 'Signup failed')
        throw new Error(errMsg)
      }

      // Auto-login: save token
      if (data.token) {
        localStorage.setItem('auth_token', data.token)
        document.cookie = `user_role=owner; path=/; max-age=86400; samesite=lax`
        document.cookie = `auth_token=${data.token}; path=/; max-age=86400; samesite=lax`
      }

      setSuccess(true)

      // Redirect to dashboard after a brief success message
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Welcome aboard! 🎉</h2>
            <p className="mt-3 text-muted-foreground">
              Your organization <strong className="text-foreground">{formData.org_name}</strong> has been created.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your 10-day free trial has started. Redirecting to dashboard...
            </p>
            <div className="mt-6">
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Back to home */}
      <Link
        href="/"
        className="fixed top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
              <IndianRupee className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Create Your Account</h1>
          <p className="text-muted-foreground mt-2">Start your 10-day free trial — no credit card needed</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        <Card className="border-border/40 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl tracking-tight">
              {step === 1 ? 'Your Organization' : 'Your Details'}
            </CardTitle>
            <CardDescription>
              {step === 1 ? 'Step 1 of 2 — Tell us about your business' : 'Step 2 of 2 — Create your admin account'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {step === 1 ? (
              /* ─── Step 1: Organization ─── */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    Organization Name *
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. ABC Finance, Sri Ram Lending"
                    value={formData.org_name}
                    onChange={(e) => updateField('org_name', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the name of your finance company or branch.
                  </p>
                </div>

                <Button onClick={handleNextStep} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11">
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              /* ─── Step 2: Personal Details ─── */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      First Name *
                    </Label>
                    <Input
                      type="text"
                      placeholder="Rajesh"
                      value={formData.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      type="text"
                      placeholder="Kumar"
                      value={formData.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Phone Number *
                  </Label>
                  <Input
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone_number}
                    onChange={(e) => updateField('phone_number', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Email (optional)
                  </Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    Password *
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Confirm Password *</Label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={formData.confirm_password}
                    onChange={(e) => updateField('confirm_password', e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => { setStep(1); setError('') }} className="flex-1 h-11">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground h-11">
                    {loading ? 'Creating...' : 'Create Account'}
                    {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </form>
            )}

            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
