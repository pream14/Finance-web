'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, DollarSign, BarChart3, Calendar, AlertTriangle, Clock, CheckCircle, Activity, Bell, Wallet, IndianRupee } from 'lucide-react'
import { transactionsApi, expensesApi, authApi, dashboardApi } from '@/lib/api'

function getMonthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const start = `${ym}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${ym}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function buildMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

const MONTH_OPTIONS = buildMonthOptions()

// Types for dashboard stats
interface DashboardStats {
  monthly_interest_due: Array<{
    loan_id: number
    customer_id: number
    customer_name: string
    customer_phone: string
    principal_amount: string
    remaining_amount: string
    interest_rate: string
    interest_due: string
    is_collected: boolean
  }>
  overdue_alerts: Array<{
    loan_id: number
    customer_id: number
    customer_name: string
    loan_type: string
    days_overdue: number
    days_remaining?: number
    expected_amount: string
    remaining_amount: string
  }>
  low_balance_warnings: Array<{
    loan_id: number
    customer_id: number
    customer_name: string
    loan_type: string
    principal_amount: string
    remaining_amount: string
    percentage_remaining: number
  }>
  total_outstanding: string
  recent_activity: Array<{
    id: number
    loan_id: number
    customer_id: number
    customer_name: string
    amount: string
    asal_amount: string
    interest_amount: string
    payment_method: string
    collected_by: string
    created_at: string
    loan_type: string
  }>
  quick_stats: {
    total_active_customers: number
    total_active_loans: number
    avg_collection_per_day: string
  }
  new_loans_this_month: Array<{
    loan_id: number
    customer_id: number
    customer_name: string
    loan_type: string
    principal_amount: string
    created_at: string
  }>
}

export default function AdminDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0]?.value ?? '2024-02')
  const [transactions, setTransactions] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingCollected, setMarkingCollected] = useState<number | null>(null)
  const [expandedOverdue, setExpandedOverdue] = useState(false)
  const [expandedAlmostPaid, setExpandedAlmostPaid] = useState(false)

  const { start, end } = useMemo(() => getMonthRange(selectedMonth), [selectedMonth])

  const fetchDashboardStats = async () => {
    try {
      const stats = await dashboardApi.getStats()
      setDashboardStats(stats)
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const [txs, exp] = await Promise.all([
          transactionsApi.getAll({ start_date: start, end_date: end }),
          expensesApi.getAll({ start_date: start, end_date: end }),
        ])
        if (!cancelled) {
          setTransactions(Array.isArray(txs) ? txs : [])
          setExpenses(Array.isArray(exp) ? exp : [])
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load dashboard data')
          setTransactions([])
          setExpenses([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    fetchDashboardStats()
    return () => { cancelled = true }
  }, [start, end])

  const handleLogout = () => {
    authApi.logout()
    window.location.href = '/auth/login'
  }

  const handleMarkCollected = async (loanId: number, interestDue: string) => {
    setMarkingCollected(loanId)
    try {
      await transactionsApi.create({
        loan: loanId,
        amount: parseFloat(interestDue),
        interest_amount: parseFloat(interestDue),
        asal_amount: 0,
        payment_method: 'cash',
        description: 'Monthly interest collection',
      })
      // Refresh dashboard stats
      await fetchDashboardStats()
    } catch (err: any) {
      console.error('Failed to mark as collected:', err)
      alert('Failed to mark as collected: ' + (err.message || 'Unknown error'))
    } finally {
      setMarkingCollected(null)
    }
  }

  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayTransactions = transactions.filter(t => t.created_at?.startsWith(today))

    // Today's metrics
    const todayCollections = todayTransactions.length
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

    // Monthly metrics
    const totalCollections = transactions.length
    const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
    const netRevenue = totalRevenue - totalExpenses

    return {
      todayCollections,
      todayRevenue,
      totalCollections,
      totalRevenue,
      totalExpenses,
      netRevenue
    }
  }, [transactions, expenses])

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back, Admin</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/collections">Add Collection</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/collections/datewise">Collections</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/customers">Customers</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/expenses">Expenses</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/users/add">Add Staff</Link>
            </Button>
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

        {/* Priority Alerts Section */}
        {dashboardStats && (
          <div className="mb-8 space-y-4">
            {/* Monthly Interest Due Today */}
            {dashboardStats.monthly_interest_due.length > 0 && (
              <Card className="border-red-500/50 bg-red-500/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <Bell className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-red-600 dark:text-red-400">Monthly Interest Due Today</CardTitle>
                      <CardDescription>{dashboardStats.monthly_interest_due.length} customer(s) with interest due</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardStats.monthly_interest_due.map((item) => (
                      <div key={item.loan_id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                        <div className="flex-1">
                          <Link href={`/admin/customers/${item.customer_id}`} className="font-medium text-foreground hover:text-primary">
                            {item.customer_name}
                          </Link>
                          <div className="text-sm text-muted-foreground">
                            Principal: ₹{parseFloat(item.principal_amount).toLocaleString('en-IN')} •
                            Interest Rate: {item.interest_rate}%
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="text-lg font-bold text-red-600">₹{parseFloat(item.interest_due).toLocaleString('en-IN')}</p>
                            <p className="text-xs text-muted-foreground">Interest Due</p>
                          </div>
                          {item.is_collected ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-5 h-5" />
                              <span className="text-sm font-medium">Collected</span>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleMarkCollected(item.loan_id, item.interest_due)}
                              disabled={markingCollected === item.loan_id}
                            >
                              {markingCollected === item.loan_id ? 'Marking...' : 'Mark Collected'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Month Selector */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Today's Collections */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Today's Collections
                </CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '—' : metrics.todayCollections}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Collections today</p>
            </CardContent>
          </Card>

          {/* Today's Revenue */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Today's Revenue
                </CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '—' : `₹${metrics.todayRevenue.toLocaleString('en-IN')}`}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Collected today</p>
            </CardContent>
          </Card>

          {/* Total Outstanding */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Outstanding
                </CardTitle>
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Wallet className="w-4 h-4 text-amber-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {dashboardStats ? `₹${parseFloat(dashboardStats.total_outstanding).toLocaleString('en-IN')}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">All active loans</p>
            </CardContent>
          </Card>

          {/* Avg Collection/Day */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Collection/Day
                </CardTitle>
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <IndianRupee className="w-4 h-4 text-cyan-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {dashboardStats ? `₹${parseFloat(dashboardStats.quick_stats.avg_collection_per_day).toLocaleString('en-IN')}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Monthly Revenue */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Revenue
                </CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '—' : `₹${metrics.totalRevenue.toLocaleString('en-IN')}`}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Collections this month</p>
            </CardContent>
          </Card>

          {/* Monthly Expenses */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Expenses
                </CardTitle>
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <DollarSign className="w-4 h-4 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '—' : `₹${metrics.totalExpenses.toLocaleString('en-IN')}`}
              </p>
              <p className="text-xs text-muted-foreground mt-2">This month</p>
            </CardContent>
          </Card>

          {/* Net Revenue */}
          <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Revenue
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {loading ? '—' : `₹${metrics.netRevenue.toLocaleString('en-IN')}`}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Revenue - Expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Expandable Alert Sections */}
        {dashboardStats && (
          <div className="mb-8 space-y-4">
            {/* Overdue Alerts */}
            {dashboardStats.overdue_alerts.length > 0 && (
              <Card className="border-orange-500/50 bg-orange-500/5">
                <CardHeader
                  className="pb-2 cursor-pointer hover:bg-orange-500/10 transition-colors"
                  onClick={() => setExpandedOverdue(!expandedOverdue)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-500/20 rounded">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      </div>
                      <CardTitle className="text-sm font-semibold text-orange-600">Overdue ({dashboardStats.overdue_alerts.length})</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {expandedOverdue ? 'Click to collapse' : 'Click to expand'}
                      </span>
                      <div className={`transition-transform duration-200 ${expandedOverdue ? 'rotate-180' : ''}`}>
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {expandedOverdue && (
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {dashboardStats.overdue_alerts.slice(0, expandedOverdue ? dashboardStats.overdue_alerts.length : 3).map((item) => (
                        <Link
                          key={item.loan_id}
                          href={`/admin/customers/${item.customer_id}?loan=${item.loan_id}`}
                          className="flex items-center justify-between p-2 rounded hover:bg-orange-500/10 transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-3 h-3 text-orange-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-foreground text-sm truncate">{item.customer_name}</span>
                                <span className="px-1 py-0.5 bg-orange-500/20 text-orange-600 rounded text-xs font-medium flex-shrink-0">
                                  {item.loan_type === 'DC Loan' ? 'DC' : item.loan_type === 'Monthly Interest Loan' ? 'Monthly' : 'DL'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="text-orange-600 font-medium">{item.days_overdue}d</span>
                                <span>•</span>
                                <span>₹{parseFloat(item.remaining_amount).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-foreground">₹{parseFloat(item.expected_amount).toLocaleString('en-IN')}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Low Balance Warnings */}
            {dashboardStats.low_balance_warnings.length > 0 && (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardHeader
                  className="pb-2 cursor-pointer hover:bg-green-500/10 transition-colors"
                  onClick={() => setExpandedAlmostPaid(!expandedAlmostPaid)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-500/20 rounded">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                      <CardTitle className="text-sm font-semibold text-green-600">Almost Paid Off ({dashboardStats.low_balance_warnings.length})</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {expandedAlmostPaid ? 'Click to collapse' : 'Click to expand'}
                      </span>
                      <div className={`transition-transform duration-200 ${expandedAlmostPaid ? 'rotate-180' : ''}`}>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {expandedAlmostPaid && (
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {dashboardStats.low_balance_warnings.slice(0, expandedAlmostPaid ? dashboardStats.low_balance_warnings.length : 4).map((item) => (
                        <Link
                          key={item.loan_id}
                          href={`/admin/customers/${item.customer_id}?loan=${item.loan_id}`}
                          className="flex items-center justify-between p-2 rounded hover:bg-green-500/10 transition-colors group"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${item.loan_type === 'DC Loan' ? 'bg-blue-500/20' : 'bg-green-500/20'
                              }`}>
                              <CheckCircle className={`w-3 h-3 ${item.loan_type === 'DC Loan' ? 'text-blue-500' : 'text-green-500'
                                }`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-foreground text-sm truncate">{item.customer_name}</span>
                                <span className={`px-1 py-0.5 rounded text-xs font-medium flex-shrink-0 ${item.loan_type === 'DC Loan'
                                  ? 'bg-blue-500/20 text-blue-600'
                                  : 'bg-green-500/20 text-green-600'
                                  }`}>
                                  {item.loan_type === 'DC Loan' ? 'DC' : item.loan_type === 'Monthly Interest Loan' ? 'Monthly' : 'DL'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-medium">{100 - item.percentage_remaining}% paid</span>
                                <span>•</span>
                                <span>₹{parseFloat(item.remaining_amount).toLocaleString('en-IN')} left</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="w-12 bg-muted rounded-full h-1">
                              <div
                                className={`h-full rounded-full ${item.loan_type === 'DC Loan' ? 'bg-blue-500' : 'bg-green-500'
                                  }`}
                                style={{ width: `${100 - item.percentage_remaining}%` }}
                              />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Recent Activity Feed */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Last 10 collections</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardStats?.recent_activity.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No recent activity</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardStats?.recent_activity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/customers/${activity.customer_id}`}
                        className="font-medium text-foreground text-sm hover:text-primary truncate block"
                      >
                        {activity.customer_name}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{activity.collected_by}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(activity.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 text-sm">+₹{parseFloat(activity.amount).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">{activity.payment_method}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Loans This Month */}
        {dashboardStats?.new_loans_this_month && dashboardStats.new_loans_this_month.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>New Loans This Month</CardTitle>
              <CardDescription>Recently issued loans ({dashboardStats.new_loans_this_month.length} total)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardStats.new_loans_this_month.map((loan) => (
                  <div key={loan.loan_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <Link
                        href={`/admin/customers/${loan.customer_id}`}
                        className="font-medium text-foreground text-sm hover:text-primary"
                      >
                        {loan.customer_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{loan.loan_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">₹{parseFloat(loan.principal_amount).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(loan.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
