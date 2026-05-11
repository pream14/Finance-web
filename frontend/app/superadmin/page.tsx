'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Building2, Users, Plus, Pencil, Trash2, ArrowLeft,
  Shield, Phone, MapPin, ChevronDown, ChevronUp, UserPlus, X,
  MessageCircle, Mail, Copy, Link2, CheckCircle
} from 'lucide-react'
import { organizationsApi, authApi } from '@/lib/api'

interface Organization {
  id: number
  name: string
  code: string
  address: string
  phone: string
  is_active: boolean
  created_at: string
  user_count: number
}

interface UserItem {
  id: number
  username: string
  first_name: string
  last_name: string
  phone_number: string
  email: string
  role: string
  is_active: boolean
  organizations: { id: number; name: string; code: string }[]
}

export default function SuperAdminPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuperUser, setIsSuperUser] = useState(false)
  const [activeTab, setActiveTab] = useState<'organizations' | 'users'>('organizations')

  // Org dialog state
  const [orgDialogOpen, setOrgDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [orgForm, setOrgForm] = useState({ name: '', address: '', phone: '' })
  const [orgSaving, setOrgSaving] = useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null)

  // User assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assigningUser, setAssigningUser] = useState<UserItem | null>(null)
  const [selectedOrgIds, setSelectedOrgIds] = useState<number[]>([])
  const [assignSaving, setAssignSaving] = useState(false)

  // Add Owner dialog
  const [addOwnerOpen, setAddOwnerOpen] = useState(false)
  const [ownerForm, setOwnerForm] = useState({ first_name: '', last_name: '', phone_number: '', email: '', password: '', organization_id: '' })
  const [ownerSaving, setOwnerSaving] = useState(false)
  const [ownerInviteResult, setOwnerInviteResult] = useState<{
    username: string; firstName: string; phone: string; email: string; inviteToken: string;
  } | null>(null)

  // Expanded org cards
  const [expandedOrgId, setExpandedOrgId] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [user, orgList, userList] = await Promise.all([
        authApi.getCurrentUser(),
        organizationsApi.getAll(),
        authApi.getAllGlobal(),
      ])
      setIsSuperUser(user?.is_superuser || false)
      setOrgs(Array.isArray(orgList) ? orgList : [])
      setUsers(Array.isArray(userList) ? userList : [])
    } catch (err) {
      console.error('Failed to load super admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─── Organization CRUD ──────────────────────────────────────
  const openCreateOrg = () => {
    setEditingOrg(null)
    setOrgForm({ name: '', address: '', phone: '' })
    setOrgDialogOpen(true)
  }

  const openEditOrg = (org: Organization) => {
    setEditingOrg(org)
    setOrgForm({ name: org.name, address: org.address || '', phone: org.phone || '' })
    setOrgDialogOpen(true)
  }

  const handleSaveOrg = async () => {
    if (!orgForm.name.trim()) return
    setOrgSaving(true)
    try {
      if (editingOrg) {
        await organizationsApi.update(editingOrg.id, orgForm)
      } else {
        await organizationsApi.create(orgForm)
      }
      setOrgDialogOpen(false)
      await loadData()
    } catch (err: any) {
      alert('Failed: ' + (err.message || 'Unknown error'))
    } finally {
      setOrgSaving(false)
    }
  }

  const handleDeleteOrg = async () => {
    if (!deletingOrg) return
    try {
      await organizationsApi.delete(deletingOrg.id)
      setDeleteDialogOpen(false)
      setDeletingOrg(null)
      await loadData()
    } catch (err: any) {
      alert('Failed: ' + (err.message || 'Unknown error'))
    }
  }

  // ─── User Org Assignment ────────────────────────────────────
  const openAssignDialog = (user: UserItem) => {
    setAssigningUser(user)
    setSelectedOrgIds(user.organizations.map(o => o.id))
    setAssignDialogOpen(true)
  }

  const toggleOrgSelection = (orgId: number) => {
    setSelectedOrgIds(prev =>
      prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]
    )
  }

  const handleSaveAssignment = async () => {
    if (!assigningUser) return
    setAssignSaving(true)
    try {
      await authApi.update(assigningUser.id, { organization_ids: selectedOrgIds })
      setAssignDialogOpen(false)
      await loadData()
    } catch (err: any) {
      alert('Failed: ' + (err.message || 'Unknown error'))
    } finally {
      setAssignSaving(false)
    }
  }

  // ─── Add Owner ──────────────────────────────────────────────
  const openAddOwner = () => {
    setOwnerForm({ first_name: '', last_name: '', phone_number: '', password: '', organization_id: '' })
    setAddOwnerOpen(true)
  }

  const handleCreateOwner = async () => {
    if (!ownerForm.first_name.trim() || !ownerForm.phone_number.trim()) return
    setOwnerSaving(true)
    try {
      const orgIds = ownerForm.organization_id ? [parseInt(ownerForm.organization_id)] : []
      const result = await authApi.create({
        first_name: ownerForm.first_name.trim(),
        last_name: ownerForm.last_name.trim(),
        phone_number: ownerForm.phone_number.trim(),
        role: 'owner',
        organization_ids: orgIds,
      })
      setAddOwnerOpen(false)
      // Show invite share dialog
      setOwnerInviteResult({
        username: result.username,
        firstName: result.first_name || ownerForm.first_name,
        phone: ownerForm.phone_number,
        email: ownerForm.email || '',
        inviteToken: result.invite_token,
      })
      await loadData()
    } catch (err: any) {
      alert('Failed: ' + (err.message || 'Unknown error'))
    } finally {
      setOwnerSaving(false)
    }
  }

  // ─── Invite Share Helpers ──────────────────────────────────────
  const getInviteUrl = (token: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/auth/invite/${token}`
  }

  const shareViaWhatsApp = (name: string, username: string, token: string, phone: string) => {
    const url = getInviteUrl(token)
    const message = `Hi ${name},\n\nYour owner account has been created on Finance Manager.\n\n\ud83d\udc64 Username: ${username}\n\ud83d\udd17 Set your password: ${url}\n\nThis link expires in 48 hours.`
    const waUrl = phone
      ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(waUrl, '_blank')
  }

  const shareViaEmail = (name: string, username: string, token: string, email: string) => {
    const url = getInviteUrl(token)
    const subject = 'Your Finance Manager Owner Account'
    const body = `Hi ${name},\n\nYour owner account has been created.\n\nUsername: ${username}\nSet your password: ${url}\n\nThis link expires in 48 hours.`
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  const copyInviteLink = async (token: string) => {
    const url = getInviteUrl(token)
    await navigator.clipboard.writeText(url)
    alert('Invite link copied!')
  }

  // ─── Helpers ────────────────────────────────────────────────
  const getUsersForOrg = (orgId: number) =>
    users.filter(u => u.organizations.some(o => o.id === orgId))

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-amber-500/20 text-amber-600',
      admin: 'bg-blue-500/20 text-blue-600',
      employee: 'bg-green-500/20 text-green-600',
    }
    return colors[role] || 'bg-muted text-muted-foreground'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isSuperUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              Only platform super admins can access this page.
            </p>
            <Button asChild>
              <Link href="/admin/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                Super Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground">Manage organizations & user assignments</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'organizations'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('organizations')}
          >
            <Building2 className="h-4 w-4 inline mr-1.5" />
            Organizations ({orgs.length})
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('users')}
          >
            <Users className="h-4 w-4 inline mr-1.5" />
            Users ({users.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Organizations Tab ─────────────────────────────── */}
        {activeTab === 'organizations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">All Organizations</h2>
              <Button onClick={openCreateOrg} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New Organization
              </Button>
            </div>

            {orgs.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground py-12">
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No organizations yet. Create one to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {orgs.map(org => {
                  const orgUsers = getUsersForOrg(org.id)
                  const isExpanded = expandedOrgId === org.id
                  return (
                    <Card key={org.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-lg">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{org.name}</CardTitle>
                              <CardDescription className="flex items-center gap-3 mt-0.5">
                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{org.code}</span>
                                {org.phone && (
                                  <span className="flex items-center gap-1 text-xs">
                                    <Phone className="h-3 w-3" /> {org.phone}
                                  </span>
                                )}
                                {org.address && (
                                  <span className="flex items-center gap-1 text-xs">
                                    <MapPin className="h-3 w-3" /> {org.address}
                                  </span>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {org.user_count} user{org.user_count !== 1 ? 's' : ''}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditOrg(org)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                              onClick={() => { setDeletingOrg(org); setDeleteDialogOpen(true) }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setExpandedOrgId(isExpanded ? null : org.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {isExpanded ? 'Hide' : 'Show'} members
                        </button>
                        {isExpanded && (
                          <div className="mt-3 space-y-1">
                            {orgUsers.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">No users assigned to this organization.</p>
                            ) : (
                              orgUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                      {(u.first_name?.[0] || u.username[0]).toUpperCase()}
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium">{u.first_name} {u.last_name}</span>
                                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${getRoleBadge(u.role)}`}>
                                        {u.role}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{u.phone_number}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Users Tab (Owners/Admins only) ─────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Organization Owners</h2>
                <p className="text-xs text-muted-foreground">Employees are managed by their org owner via Add Staff</p>
              </div>
              <Button onClick={openAddOwner} size="sm" className="gap-1.5">
                <UserPlus className="h-4 w-4" /> Add Owner
              </Button>
            </div>

            <div className="grid gap-3">
              {users.filter(u => u.role === 'owner' || u.role === 'admin').map(user => (
                <Card key={user.id} className="border-border/50 shadow-sm">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {(user.first_name?.[0] || user.username[0]).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {user.first_name} {user.last_name}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadge(user.role)}`}>
                              {user.role}
                            </span>
                            {!user.is_active && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-600">
                                inactive
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                            <span>{user.phone_number}</span>
                            <span className="text-muted-foreground/50">@{user.username}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-wrap gap-1">
                          {user.organizations.length === 0 ? (
                            <span className="text-xs text-red-500 italic">No org</span>
                          ) : (
                            user.organizations.map(o => (
                              <span key={o.id} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                {o.name}
                              </span>
                            ))
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => openAssignDialog(user)}>
                          <Building2 className="h-3 w-3" /> Assign Orgs
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Create/Edit Org Dialog ──────────────────────────── */}
      <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Edit Organization' : 'Create Organization'}</DialogTitle>
            <DialogDescription>
              {editingOrg ? 'Update organization details.' : 'Add a new organization to the platform.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Organization Name *</label>
              <Input
                placeholder="e.g. Senthoor Finance"
                value={orgForm.name}
                onChange={e => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input
                placeholder="Phone number"
                value={orgForm.phone}
                onChange={e => setOrgForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Input
                placeholder="Office address"
                value={orgForm.address}
                onChange={e => setOrgForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOrg} disabled={orgSaving || !orgForm.name.trim()}>
              {orgSaving ? 'Saving...' : editingOrg ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Org Confirmation ─────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingOrg?.name}</strong>?
              This will not delete the data, but the organization will be deactivated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteOrg}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Orgs Dialog ──────────────────────────────── */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Organizations</DialogTitle>
            <DialogDescription>
              Select which organizations <strong>{assigningUser?.first_name} {assigningUser?.last_name}</strong> should have access to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {orgs.map(org => {
              const isSelected = selectedOrgIds.includes(org.id)
              return (
                <button
                  key={org.id}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                  onClick={() => toggleOrgSelection(org.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                    }`}>
                      {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                    <span className="font-medium text-sm">{org.name}</span>
                    <span className="text-xs text-muted-foreground">({org.code})</span>
                  </div>
                </button>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAssignment} disabled={assignSaving || selectedOrgIds.length === 0}>
              {assignSaving ? 'Saving...' : `Assign to ${selectedOrgIds.length} org${selectedOrgIds.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Owner Dialog ────────────────────────────────── */}
      <Dialog open={addOwnerOpen} onOpenChange={setAddOwnerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Organization Owner</DialogTitle>
            <DialogDescription>
              Create a new owner account and assign to an organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">First Name *</label>
                <Input
                  placeholder="First name"
                  value={ownerForm.first_name}
                  onChange={e => setOwnerForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Last Name</label>
                <Input
                  placeholder="Last name"
                  value={ownerForm.last_name}
                  onChange={e => setOwnerForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone Number *</label>
              <Input
                placeholder="Phone number"
                value={ownerForm.phone_number}
                onChange={e => setOwnerForm(prev => ({ ...prev, phone_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email (Optional)</label>
              <Input
                placeholder="Email address"
                type="email"
                value={ownerForm.email}
                onChange={e => setOwnerForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Assign to Organization</label>
              <Select
                value={ownerForm.organization_id}
                onValueChange={val => setOwnerForm(prev => ({ ...prev, organization_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map(org => (
                    <SelectItem key={org.id} value={String(org.id)}>
                      {org.name} ({org.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <div className="flex items-start gap-2">
                <Link2 className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-xs">An invite link will be generated for the owner to set their own password.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOwnerOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateOwner}
              disabled={ownerSaving || !ownerForm.first_name.trim() || !ownerForm.phone_number.trim()}
            >
              {ownerSaving ? 'Creating...' : 'Create Owner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Owner Invite Share Dialog ─────────────────────────── */}
      <Dialog open={!!ownerInviteResult} onOpenChange={(open) => { if (!open) setOwnerInviteResult(null) }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Owner Created!
            </DialogTitle>
            <DialogDescription>
              Share the invite link so {ownerInviteResult?.firstName} can set their password.
            </DialogDescription>
          </DialogHeader>

          {ownerInviteResult && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                <p><strong>Username:</strong> <span className="font-mono">{ownerInviteResult.username}</span></p>
                <p><strong>Invite Link:</strong></p>
                <code className="block p-2 bg-background rounded border text-xs break-all">
                  {getInviteUrl(ownerInviteResult.inviteToken)}
                </code>
                <p className="text-xs text-muted-foreground">⏰ Expires in 48 hours</p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {ownerInviteResult.phone && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => shareViaWhatsApp(ownerInviteResult.firstName, ownerInviteResult.username, ownerInviteResult.inviteToken, ownerInviteResult.phone)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Share via WhatsApp
                  </Button>
                )}

                {ownerInviteResult.email && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => shareViaEmail(ownerInviteResult.firstName, ownerInviteResult.username, ownerInviteResult.inviteToken, ownerInviteResult.email)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Share via Email
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyInviteLink(ownerInviteResult.inviteToken)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Invite Link
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOwnerInviteResult(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
