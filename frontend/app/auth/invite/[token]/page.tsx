'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { authApi } from '@/lib/api'
import { Lock, Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo / App Name */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Finance Manager</h1>
                    <p className="text-slate-400 mt-1">Set up your account</p>
                </div>

                {/* Card */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

                    {/* Loading State */}
                    {status === 'loading' && (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                            <p className="text-slate-300">Verifying your invite link...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {status === 'error' && (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                                <XCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">Link Invalid</h2>
                            <p className="text-slate-400 mb-6">{errorMessage}</p>
                            <button
                                onClick={() => router.push('/auth/login')}
                                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Go to Login
                            </button>
                        </div>
                    )}

                    {/* Success State */}
                    {status === 'success' && (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">Password Set!</h2>
                            <p className="text-slate-400 mb-2">Your account is ready.</p>
                            <p className="text-sm text-slate-500 mb-1">
                                Your username: <span className="text-white font-mono font-semibold">{username}</span>
                            </p>
                            <p className="text-sm text-slate-500 mb-6">Redirecting to login...</p>
                            <button
                                onClick={() => router.push('/auth/login')}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Login Now
                            </button>
                        </div>
                    )}

                    {/* Set Password Form */}
                    {status === 'valid' && (
                        <>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-semibold text-white">
                                    Welcome, {userName}!
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">
                                    Create a password to activate your account
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {submitError && (
                                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-red-300">{submitError}</p>
                                    </div>
                                )}

                                {/* Show username for reference */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Your Username
                                    </label>
                                    <div className="px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white font-mono text-sm">
                                        {username}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Use this to login</p>
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                                        New Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        placeholder="Min 8 characters"
                                        className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Must be at least 8 characters and not entirely numeric
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="confirm_password" className="block text-sm font-medium text-slate-300 mb-1.5">
                                        Confirm Password
                                    </label>
                                    <input
                                        id="confirm_password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        placeholder="Re-enter your password"
                                        className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || !password || !confirmPassword}
                                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Setting Password...
                                        </>
                                    ) : (
                                        'Set Password & Activate Account'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-600 mt-6">
                    This link expires after 48 hours
                </p>
            </div>
        </div>
    )
}
