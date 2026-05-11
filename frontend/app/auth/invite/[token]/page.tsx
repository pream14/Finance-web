'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function InvitePage() {
    const router = useRouter()
    const params = useParams()
    const token = params.token as string

    const [status, setStatus] = useState<'loading' | 'valid' | 'error' | 'success'>('loading')
    const [errorMessage, setErrorMessage] = useState('')
    const [userName, setUserName] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')

    // Validate the invite token on page load
    useEffect(() => {
        async function validateToken() {
            try {
                const data = await authApi.validateInvite(token)
                setUserName(data.user.full_name || data.user.first_name)
                setUsername(data.user.username)
                setStatus('valid')
            } catch (err: any) {
                setErrorMessage(err.message || 'Invalid invite link')
                setStatus('error')
            }
        }
        if (token) validateToken()
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitError('')

        if (password !== confirmPassword) {
            setSubmitError('Passwords do not match')
            return
        }

        if (password.length < 8) {
            setSubmitError('Password must be at least 8 characters')
            return
        }

        setSubmitting(true)
        try {
            const data = await authApi.acceptInvite(token, password)
            setUsername(data.username)
            setStatus('success')
            // Redirect to login after 3 seconds
            setTimeout(() => router.push('/auth/login'), 3000)
        } catch (err: any) {
            setSubmitError(err.message || 'Failed to set password')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary/10 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo — same as login page */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center mb-4">
                        <Image src="/logo.png" alt="Sri Sendhur Sri Lakshmi Finance" width={96} height={96} priority unoptimized className="rounded-xl object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Sri Sendhur | Sri Lakshmi</h1>
                    <p className="text-muted-foreground mt-2">Finance Collection Management</p>
                </div>

                {/* Loading State */}
                {status === 'loading' && (
                    <Card className="border-border/40 shadow-2xl backdrop-blur-xl bg-card/95">
                        <CardContent className="py-12 text-center">
                            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground">Verifying your invite link...</p>
                        </CardContent>
                    </Card>
                )}

                {/* Error State */}
                {status === 'error' && (
                    <Card className="border-border/40 shadow-2xl backdrop-blur-xl bg-card/95">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-2">
                                <XCircle className="w-12 h-12 text-destructive" />
                            </div>
                            <CardTitle className="text-xl">Link Invalid</CardTitle>
                            <CardDescription>{errorMessage}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center pb-6">
                            <Button
                                onClick={() => router.push('/auth/login')}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                            >
                                Go to Login
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Success State */}
                {status === 'success' && (
                    <Card className="border-border/40 shadow-2xl backdrop-blur-xl bg-card/95">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-2">
                                <CheckCircle className="w-12 h-12 text-green-500" />
                            </div>
                            <CardTitle className="text-xl">Password Set Successfully!</CardTitle>
                            <CardDescription>Your account is ready to use.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center space-y-4 pb-6">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-sm text-muted-foreground">Your username</p>
                                <p className="text-lg font-mono font-bold text-foreground">{username}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">Redirecting to login...</p>
                            <Button
                                onClick={() => router.push('/auth/login')}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 rounded-lg transition-all active:scale-[0.98]"
                            >
                                Login Now
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Set Password Form */}
                {status === 'valid' && (
                    <Card className="border-border/40 shadow-2xl backdrop-blur-xl bg-card/95">
                        <CardHeader className="space-y-1 text-center">
                            <CardTitle className="text-2xl tracking-tight">
                                Welcome, {userName}!
                            </CardTitle>
                            <CardDescription>
                                Create a password to activate your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {submitError && (
                                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                                        {submitError}
                                    </div>
                                )}

                                {/* Username display */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Your Username</label>
                                    <div className="flex items-center px-3 h-10 rounded-md border border-border/50 bg-muted/30">
                                        <span className="font-mono font-semibold text-foreground">{username}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Remember this — you&apos;ll use it to login</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">New Password</label>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        placeholder="Min 8 characters"
                                        className="border-border/50"
                                        disabled={submitting}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Must be at least 8 characters and not entirely numeric
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Confirm Password</label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        placeholder="Re-enter your password"
                                        className="border-border/50"
                                        disabled={submitting}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 rounded-lg transition-all active:scale-[0.98]"
                                    disabled={submitting || !password || !confirmPassword}
                                >
                                    {submitting ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                            Setting Password...
                                        </div>
                                    ) : 'Set Password & Activate Account'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Footer note */}
                <p className="text-center text-xs text-muted-foreground/50 mt-6">
                    This invite link expires after 48 hours
                </p>
            </div>
        </div>
    )
}
