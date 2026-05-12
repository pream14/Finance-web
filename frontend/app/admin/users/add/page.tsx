'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { authApi } from '@/lib/api'
import { ArrowLeft, Loader2, Plus, Pencil, Ban, CheckCircle, Search, Building2, MessageCircle, Mail, Copy, RefreshCw, Link2 } from 'lucide-react'

interface Organization {
    id: number
    name: string
    code: string
}

interface User {
    id: number
    username: string
    first_name: string
    last_name: string
    phone_number: string
    email: string
    role: string
    is_active: boolean
}

export default function EmployerManagementPage() {
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [formLoading, setFormLoading] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    // Invite success state
    const [inviteResult, setInviteResult] = useState<{
        username: string
        firstName: string
        phone: string
        email: string
        inviteToken: string
    } | null>(null)

    // Form Data
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
        email: '',
        role: 'employee',
        password: '',
    })

    // Selected org IDs for multi-org assignment
    const [selectedOrgIds, setSelectedOrgIds] = useState<number[]>([])

    // Owner's organizations
    const [ownerOrgs, setOwnerOrgs] = useState<Organization[]>([])

    const fetchUsers = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await authApi.getAll()
            setUsers(Array.isArray(data) ? data : [])
        } catch (err: any) {
            console.error('Failed to fetch users:', err)
            setError(err.message || 'Failed to load employees')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
        fetchOwnerOrgs()
    }, [])

    async function fetchOwnerOrgs() {
        try {
            const user = await authApi.getCurrentUser()
            if (user?.organizations) {
                setOwnerOrgs(user.organizations)
            }
        } catch (err) {
            console.error('Failed to fetch orgs:', err)
        }
    }

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            phone_number: '',
            email: '',
            role: 'employee',
            password: '',
        })
        // Auto-select all orgs if owner has only 1, otherwise clear
        setSelectedOrgIds(ownerOrgs.length === 1 ? [ownerOrgs[0].id] : [])
        setEditingUser(null)
        setFormError(null)
        setInviteResult(null)
    }

    const handleOpenAdd = () => {
        resetForm()
        setIsDialogOpen(true)
    }

    const handleOpenEdit = (user: User) => {
        setEditingUser(user)
        setFormData({
            first_name: user.first_name,
            last_name: user.last_name,
            phone_number: user.phone_number || '',
            email: user.email || '',
            role: user.role,
            password: '',
        })
        setSelectedOrgIds([])
        setFormError(null)
        setIsDialogOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormLoading(true)
        setFormError(null)

        try {
            if (editingUser) {
                // Update
                const updateData: any = { ...formData }
                if (!updateData.password) delete updateData.password // Don't send empty password

                await authApi.update(editingUser.id, updateData)
                setIsDialogOpen(false)
                fetchUsers()
            } else {
                // Create — no password needed, invite link will be generated
                const createData: any = { ...formData }
                delete createData.password
                // Pass selected org IDs
                if (selectedOrgIds.length > 0) {
                    createData.organization_ids = selectedOrgIds
                }
                const result = await authApi.register(createData)

                // Show invite share dialog
                setInviteResult({
                    username: result.username,
                    firstName: result.first_name || formData.first_name,
                    phone: formData.phone_number,
                    email: formData.email,
                    inviteToken: result.invite_token,
                })
                fetchUsers()
            }
        } catch (err: any) {
            console.error('Failed to save user:', err)
            setFormError(err.message || 'Failed to save user')
        } finally {
            setFormLoading(false)
        }
    }

    // ─── Share Helpers ──────────────────────────────────────────────────
    const getInviteUrl = (token: string) => {
        const base = typeof window !== 'undefined' ? window.location.origin : ''
        return `${base}/auth/invite/${token}`
    }

    const shareViaWhatsApp = (name: string, username: string, token: string) => {
        const url = getInviteUrl(token)
        const message = `Hi ${name},\n\nYour account has been created on Finance Manager.\n\n👤 Username: ${username}\n🔗 Set your password: ${url}\n\nThis link expires in 48 hours.`
        const phone = inviteResult?.phone || ''
        const waUrl = phone
            ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`
        window.open(waUrl, '_blank')
    }

    const shareViaEmail = (name: string, username: string, token: string, email: string) => {
        const url = getInviteUrl(token)
        const subject = 'Your Finance Manager Account'
        const body = `Hi ${name},\n\nYour account has been created.\n\nUsername: ${username}\nSet your password: ${url}\n\nThis link expires in 48 hours.`
        window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    }

    const copyInviteLink = async (token: string) => {
        const url = getInviteUrl(token)
        await navigator.clipboard.writeText(url)
        alert('Invite link copied!')
    }

    const handleResendInvite = async (userId: number) => {
        try {
            const result = await authApi.resendInvite(userId)
            const url = getInviteUrl(result.invite_token)
            await navigator.clipboard.writeText(url)
            alert(`New invite link generated and copied!\n\nExpires: ${new Date(result.expires_at).toLocaleString()}`)
        } catch (err: any) {
            alert('Failed to resend invite: ' + (err.message || 'Unknown error'))
        }
    }

    const handleToggleStatus = async (user: User) => {
        if (!confirm(`Are you sure you want to ${user.is_active ? 'block' : 'unblock'} ${user.first_name}?`)) return

        setLoading(true)
        try {
            if (user.is_active) {
                // Block (Soft Delete)
                await authApi.delete(user.id)
            } else {
                // Unblock
                await authApi.update(user.id, { is_active: true })
            }
            fetchUsers()
        } catch (err: any) {
            console.error('Failed to update status:', err)
            setError(err.message || 'Failed to update status')
            setLoading(false)
        }
    }

    const filteredUsers = users.filter(user =>
        (user.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.phone_number || '').includes(searchTerm) ||
        (user.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Employer Management</h1>
                            <p className="text-sm text-muted-foreground">Manage your staff and collectors</p>
                        </div>
                    </div>
                    <Button onClick={handleOpenAdd}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Employer
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or phone..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="border-border/50">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {error ? error : "No employers found."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id} className={!user.is_active ? 'bg-muted/50' : ''}>
                                            <TableCell className="font-medium">
                                                {user.first_name} {user.last_name}
                                            </TableCell>
                                            <TableCell>{user.username}</TableCell>
                                            <TableCell>{user.phone_number || '—'}</TableCell>
                                            <TableCell className="capitalize">{user.role}</TableCell>
                                            <TableCell>
                                                {user.is_active ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        <Ban className="w-3 h-3 mr-1" />
                                                        Blocked
                                                    </span>
                                                )}
                                            </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Resend Invite"
                                                    onClick={() => handleResendInvite(user.id)}
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    <span className="sr-only">Resend Invite</span>
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)}>
                                                    <Pencil className="w-4 h-4" />
                                                    <span className="sr-only">Edit</span>
                                                </Button>
                                                <Button
                                                    variant={user.is_active ? "destructive" : "outline"}
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(user)}
                                                    className={!user.is_active ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20" : ""}
                                                >
                                                    {user.is_active ? (
                                                        <Ban className="w-4 h-4" />
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4" />
                                                    )}
                                                    <span className="sr-only">{user.is_active ? 'Block' : 'Unblock'}</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit Employer' : 'Add New Employer'}</DialogTitle>
                        <DialogDescription>
                            {editingUser
                                ? 'Update the details for this employer.'
                                : 'Create a new account for a staff member or collector.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4">
                        {formError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-sm text-red-600 dark:text-red-400">
                                {formError}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name (Username) *</Label>
                                <Input
                                    id="first_name"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    required
                                    placeholder="e.g. John"
                                    disabled={!!editingUser}
                                />
                                {editingUser && <p className="text-xs text-muted-foreground">Username cannot be changed.</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    placeholder="e.g. Doe"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Whatsapp Number *</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                required
                                placeholder="e.g. 1234567890"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email (Optional)</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="e.g. john@example.com"
                            />
                        </div>


                        {/* Role is always employee, hidden from UI */}

                        {/* Org Selector — shown only for owners with 2+ orgs, on create only */}
                        {!editingUser && ownerOrgs.length > 1 && (
                            <div className="space-y-2">
                                <Label>Assign to Organization(s) *</Label>
                                <div className="border border-border/50 rounded-lg p-3 space-y-2">
                                    {ownerOrgs.map(org => (
                                        <label
                                            key={org.id}
                                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                                        >
                                            <Checkbox
                                                checked={selectedOrgIds.includes(org.id)}
                                                onCheckedChange={(checked) => {
                                                    setSelectedOrgIds(prev =>
                                                        checked
                                                            ? [...prev, org.id]
                                                            : prev.filter(id => id !== org.id)
                                                    )
                                                }}
                                            />
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm font-medium">{org.name}</span>
                                                <span className="text-xs text-muted-foreground">({org.code})</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {selectedOrgIds.length === 0 && (
                                    <p className="text-xs text-destructive">Select at least one organization</p>
                                )}
                            </div>
                        )}

                        {!editingUser && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                                <div className="flex items-start gap-2">
                                    <Link2 className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium">Invite Link will be generated</p>
                                        <p className="text-xs mt-1 opacity-80">
                                            The employee will receive a link to set their own password.
                                            No password needed here. Username is auto-generated from the first name.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={formLoading || (!editingUser && ownerOrgs.length > 1 && selectedOrgIds.length === 0)}>
                                {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {editingUser ? 'Save Changes' : 'Create Employer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ─── Invite Share Dialog ─────────────────────────────────── */}
            <Dialog open={!!inviteResult} onOpenChange={(open) => { if (!open) setInviteResult(null) }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            Employee Created!
                        </DialogTitle>
                        <DialogDescription>
                            Share the invite link so {inviteResult?.firstName} can set their password.
                        </DialogDescription>
                    </DialogHeader>

                    {inviteResult && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                                <p><strong>Username:</strong> <span className="font-mono">{inviteResult.username}</span></p>
                                <p><strong>Invite Link:</strong></p>
                                <code className="block p-2 bg-background rounded border text-xs break-all">
                                    {getInviteUrl(inviteResult.inviteToken)}
                                </code>
                                <p className="text-xs text-muted-foreground">⏰ Expires in 48 hours</p>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {/* WhatsApp */}
                                {inviteResult.phone && (
                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => shareViaWhatsApp(inviteResult.firstName, inviteResult.username, inviteResult.inviteToken)}
                                    >
                                        <MessageCircle className="w-4 h-4 mr-2" />
                                        Share via WhatsApp
                                    </Button>
                                )}

                                {/* Email */}
                                {inviteResult.email && (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => shareViaEmail(inviteResult.firstName, inviteResult.username, inviteResult.inviteToken, inviteResult.email)}
                                    >
                                        <Mail className="w-4 h-4 mr-2" />
                                        Share via Email
                                    </Button>
                                )}

                                {/* Copy Link */}
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => copyInviteLink(inviteResult.inviteToken)}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Invite Link
                                </Button>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteResult(null)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
