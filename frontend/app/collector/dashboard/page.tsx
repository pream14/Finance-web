'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { Wallet, TrendingUp, Clock, User } from 'lucide-react'
import { authApi, customersApi, loansApi, transactionsApi } from '@/lib/api'

interface CollectionEntry {
  id: number
  customer_id: number
  customer_name: string
  amount: number
  method: string
  loan_type: string
  time: string
  date: string
  collected_by: string
}

interface CustomerOption {
  id: number
  name: string
  city: string
  loans: string[]
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  transfer: 'Bank Transfer',
  check: 'Check',
}

export default function CollectorDashboard() {
  const [currentUser, setCurrentUser] = useState<{ full_name?: string; role?: string } | null>(null)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [collections, setCollections] = useState<CollectionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  useEffect(() => {
    let cancelled = false
    async function loadUser() {
      const user = await authApi.getCurrentUser()
      if (!cancelled && user) setCurrentUser(user)
    }
    loadUser()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      setLoading(true)
      setError('')
      try {
        const [customersRes, loansRes, transactionsRes] = await Promise.all([
          customersApi.getAll({ all: true }),
          loansApi.getAll({ status: 'active' }),
          transactionsApi.getAll({ start_date: todayStr, end_date: todayStr }),
        ])
        if (cancelled) return
        const custList = Array.isArray(customersRes) ? customersRes : []
        const loanList = Array.isArray(loansRes) ? loansRes : []
        const txList = Array.isArray(transactionsRes) ? transactionsRes : []
        const loanTypesByCustomer: Record<number, string[]> = {}
        for (const loan of loanList) {
          const cid = loan.customer?.id ?? loan.customer
          if (!cid) continue
          const lt = loan.loan_type
          if (!loanTypesByCustomer[cid]) loanTypesByCustomer[cid] = []
          if (!loanTypesByCustomer[cid].includes(lt)) loanTypesByCustomer[cid].push(lt)
        }
        setCustomers(custList.map((c: any) => ({
          id: c.id,
          name: c.name || '—',
          city: c.area || c.address || '—',
          loans: loanTypesByCustomer[c.id] || [],
        })))
        setCollections(txList.map((t: any) => ({
          id: t.id,
          customer_id: t.customer_id,
          customer_name: t.customer_name || '—',
          amount: parseFloat(t.amount || 0),
          method: t.payment_method || 'cash',
          loan_type: t.loan_type || '—',
          time: t.created_at ? new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—',
          date: t.created_at ? t.created_at.split('T')[0] : todayStr,
          collected_by: t.collected_by_name || '—',
        })))
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load data')
          setCustomers([])
          setCollections([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [todayStr])

  const todayCollections = collections
  const todayTotal = todayCollections.reduce((sum, entry) => sum + entry.amount, 0)
  const todayCount = todayCollections.length
  const avgAmount = todayCount > 0 ? todayTotal / todayCount : 0


  const handleLogout = () => {
    authApi.logout()
    window.location.href = '/auth/login'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Collector Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome, {currentUser?.full_name || 'Collector'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/collections">Add Collection</Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/collector/datewise">My Collections</Link>
            </Button>
            {currentUser?.role === 'owner' && (
              <Button variant="outline" asChild>
                <Link href="/admin/dashboard">Admin Dashboard</Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/auth/change-password">Change Password</Link>
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Collections Today
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{todayCount}</p>
              <p className="text-xs text-muted-foreground mt-2">Collections today</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Amount
                </CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">₹{todayTotal.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-2">Collected today</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Amount
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">₹{avgAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground mt-2">Per collection</p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Summary - Loan Type Breakdown */}
        {todayCollections.length > 0 && (
          <Card className="border-border/50 mb-6">
            <CardHeader>
              <CardTitle>Daily Summary</CardTitle>
              <CardDescription>Loan type breakdown for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['DC Loan', 'Monthly Interest Loan', 'DL Loan'].map((loanType) => {
                  const typeTotal = todayCollections
                    .filter((c) => c.loan_type === loanType)
                    .reduce((sum, c) => sum + c.amount, 0)
                  const typeCount = todayCollections.filter((c) => c.loan_type === loanType).length

                  return (
                    <div key={loanType} className={`p-4 rounded-lg border border-border/30 ${loanType === 'DC Loan'
                      ? 'bg-blue-500/10'
                      : loanType === 'Monthly Interest Loan'
                        ? 'bg-green-500/10'
                        : 'bg-purple-500/10'
                      }`}>
                      <p className={`text-xs font-medium mb-2 ${loanType === 'DC Loan'
                        ? 'text-blue-600'
                        : loanType === 'Monthly Interest Loan'
                          ? 'text-green-600'
                          : 'text-purple-600'
                        }`}>{loanType}</p>
                      <p className="text-xl font-bold text-foreground">₹{typeTotal.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{typeCount} collection{typeCount !== 1 ? 's' : ''}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collections List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Today's Collections</CardTitle>
            <CardDescription>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : todayCollections.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No collections recorded yet</p>
              ) : (
                todayCollections.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-foreground">{entry.customer_name}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${entry.loan_type === 'DC Loan'
                          ? 'bg-blue-500/20 text-blue-600'
                          : entry.loan_type === 'Monthly Interest Loan'
                            ? 'bg-green-500/20 text-green-600'
                            : 'bg-purple-500/20 text-purple-600'
                          }`}>
                          {entry.loan_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{entry.time}</span>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-lg font-bold text-green-600">₹{entry.amount.toLocaleString('en-IN')}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/20 text-secondary-foreground mt-1 capitalize">
                        {entry.method}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
