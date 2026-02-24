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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authApi } from '@/lib/api'
import { ArrowLeft, Loader2, Plus, Pencil, Ban, CheckCircle, Search } from 'lucide-react'

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

    // Form Data
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
        email: '',
        role: 'employee',
        password: '', // Optional for edit, auto-generated (phone) for create
    })

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
    }, [])

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            phone_number: '',
            email: '',
            role: 'employee',
            password: '',
        })
        setEditingUser(null)
        setFormError(null)
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
            } else {
                // Create
                const createData: any = { ...formData }
                if (!createData.password) delete createData.password
                await authApi.register(createData)
            }

            setIsDialogOpen(false)
            fetchUsers() // Refresh list
        } catch (err: any) {
            console.error('Failed to save user:', err)
            setFormError(err.message || 'Failed to save user')
        } finally {
            setFormLoading(false)
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
                            <Label htmlFor="phone">Phone Number (Login Password) *</Label>
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

                        {!editingUser && (
                            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                                <p><strong>Note:</strong> The <strong>First Name</strong> will be used as the login Username, and the <strong>Phone Number</strong> will be the initial Password.</p>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={formLoading}>
                                {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {editingUser ? 'Save Changes' : 'Create Employer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
