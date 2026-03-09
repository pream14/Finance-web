'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authApi } from '@/lib/api'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'

export default function ChangePasswordPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    })

    // Store user info to know where to redirect
    const [userRole, setUserRole] = useState<string | null>(null)

    // Fetch user role on mount
    useEffect(() => {
        authApi.getCurrentUser().then(user => {
            if (user) setUserRole(user.role)
        }).catch(err => console.error(err))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        if (formData.new_password !== formData.confirm_password) {
            setError("New passwords do not match")
            setLoading(false)
            return
        }

        try {
            await authApi.changePassword({
                old_password: formData.old_password,
                new_password: formData.new_password,
            })
            setSuccess(true)

            // Redirect based on role
            setTimeout(() => {
                if (userRole === 'owner') {
                    router.push('/admin/dashboard')
                } else {
                    router.push('/collector/dashboard')
                }
            }, 2000)
        } catch (err: any) {
            console.error('Failed to change password:', err)

            // Better error message parsing
            let message = err.message || 'Failed to change password'

            // Check if it's the specific "wrong password" error from backend
            // The backend returns { old_password: ['Wrong password.'] } usually with 400
            // But api.ts might have flattened it or kept it as object in err.message if parsing failed? 
            // Actually api.ts throws Error(message). 
            // If the backend sends { old_password: [...] }, api.ts tries to allow `error.detail` or `error.error`.
            // Let's rely on string matching if the API doesn't already give a clean message.
            if (message.includes('Wrong password') || message.includes('old_password')) {
                message = "The current password you entered is incorrect."
            }

            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b border-border bg-card/95 backdrop-blur-sm z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
                    <h1 className="text-xl font-bold text-foreground">Change Password</h1>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-border/50">
                    <CardHeader>
                        <CardTitle>Change Your Password</CardTitle>
                        <CardDescription>
                            Enter your current password and choose a new one.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <div className="text-center py-8 space-y-4">
                                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                    <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-green-600 dark:text-green-400">Password Changed!</h3>
                                    <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-600 dark:text-red-400">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="old_password">Current Password</Label>
                                    <Input
                                        id="old_password"
                                        name="old_password"
                                        type="password"
                                        value={formData.old_password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="new_password">New Password</Label>
                                    <Input
                                        id="new_password"
                                        name="new_password"
                                        type="password"
                                        value={formData.new_password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                                    <Input
                                        id="confirm_password"
                                        name="confirm_password"
                                        type="password"
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Password'
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
