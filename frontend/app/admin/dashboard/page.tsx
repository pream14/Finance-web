'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TrendingUp, DollarSign, BarChart3, Calendar, AlertTriangle, Clock, CheckCircle, Activity, Bell, Wallet, IndianRupee, Settings, LogOut, UserPlus, Key, Menu } from 'lucide-react'
import { transactionsApi, expensesApi, incomeApi, authApi, dashboardApi } from '@/lib/api'

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
  outstanding_breakdown?: {
    dc_loan: string
    monthly_interest_loan: string
    dl_loan: string
  }
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
  interest_calendar: Array<{
    cycle_day: number
    count: number
    total_interest: string
    customers: Array<{
      loan_id: number
      customer_id: number
      customer_name: string
      customer_phone: string
      remaining_amount: string
      interest_rate: string
      interest_amount: string
    }>
  }>
}

export default function AdminDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0]?.value ?? '2024-02')
  const [transactions, setTransactions] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [otherIncome, setOtherIncome] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingCollected, setMarkingCollected] = useState<number | null>(null)
  const [expandedInterestDue, setExpandedInterestDue] = useState(true)
  const [expandedOverdue, setExpandedOverdue] = useState(false)
  const [expandedAlmostPaid, setExpandedAlmostPaid] = useState(false)

  // Collection dialog state
  const [collectDialogOpen, setCollectDialogOpen] = useState(false)
  const [collectDialogData, setCollectDialogData] = useState<{
    loanId: number; customerName: string; interestDue: string; remainingAmount: string;
  } | null>(null)
  const [collectPaymentMethod, setCollectPaymentMethod] = useState('cash')
  const [collectInterestAmount, setCollectInterestAmount] = useState('')
  const [collectAsalAmount, setCollectAsalAmount] = useState('')

  // Interest Calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null)

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
        const [txs, exp, inc] = await Promise.all([
          transactionsApi.getAll({ start_date: start, end_date: end }),
          expensesApi.getAll({ start_date: start, end_date: end }),
          incomeApi.getAll({ start_date: start, end_date: end }),
        ])
        if (!cancelled) {
          setTransactions(Array.isArray(txs) ? txs : [])
          setExpenses(Array.isArray(exp) ? exp : [])
          setOtherIncome(Array.isArray(inc) ? inc : [])
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load dashboard data')
          setTransactions([])
          setExpenses([])
          setOtherIncome([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    fetchDashboardStats()
    return () => { cancelled = true }
  }, [start, end])

  const handleLogout = async () => {
    await authApi.logout()
    window.location.href = '/auth/login'
  }

  const openCollectDialog = (loanId: number, interestDue: string, customerName: string, remainingAmount: string) => {
    setCollectDialogData({ loanId, customerName, interestDue, remainingAmount })
    setCollectPaymentMethod('cash')
    setCollectInterestAmount(parseFloat(interestDue).toString())
    setCollectAsalAmount('')
    setCollectDialogOpen(true)
  }

  const getCollectTotal = () => {
    return (parseFloat(collectInterestAmount) || 0) + (parseFloat(collectAsalAmount) || 0)
  }

  const handleSubmitCollection = async () => {
    if (!collectDialogData) return
    const { loanId } = collectDialogData
    const interest = parseFloat(collectInterestAmount) || 0
    const asal = parseFloat(collectAsalAmount) || 0
    const total = interest + asal
    if (total <= 0) { alert('Please enter a valid amount'); return }

    const remaining = parseFloat(collectDialogData.remainingAmount) || 0
    if (asal > remaining) {
      alert(`Asal amount (₹${asal.toLocaleString('en-IN')}) cannot exceed remaining balance (₹${remaining.toLocaleString('en-IN')})`)
      return
    }

    setMarkingCollected(loanId)
    try {
      await transactionsApi.create({
        loan: loanId,
        payment_method: collectPaymentMethod,
        amount: total,
        interest_amount: interest,
        asal_amount: asal,
        description: asal > 0
          ? `Interest: ₹${interest.toLocaleString('en-IN')} + Asal: ₹${asal.toLocaleString('en-IN')}`
          : 'Monthly interest collection',
      })
      setCollectDialogOpen(false)
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
    const totalOtherIncome = otherIncome.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0)
    const netRevenue = totalRevenue + totalOtherIncome - totalExpenses

    return {
      todayCollections,
      todayRevenue,
      totalCollections,
      totalRevenue,
      totalExpenses,
      totalOtherIncome,
      netRevenue
    }
  }, [transactions, expenses, otherIncome])

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

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfWeek = (year: number, month: number) => new Date(year, month, 1).getDay()

  const calendarMap = useMemo(() => {
    const map: Record<number, { count: number; total_interest: string; customers: any[] }> = {}
    if (dashboardStats?.interest_calendar) {
      for (const entry of dashboardStats.interest_calendar) {
        // Handle cycle days > last day of month (e.g. day 31 in a 30-day month)
        const daysInMonth = getDaysInMonth(calendarMonth.year, calendarMonth.month)
        const effectiveDay = Math.min(entry.cycle_day, daysInMonth)
        if (map[effectiveDay]) {
          map[effectiveDay].count += entry.count
          map[effectiveDay].customers.push(...entry.customers)
          const existing = parseFloat(map[effectiveDay].total_interest)
          const added = parseFloat(entry.total_interest)
          map[effectiveDay].total_interest = (existing + added).toFixed(2)
        } else {
          map[effectiveDay] = {
            count: entry.count,
            total_interest: entry.total_interest,
            customers: [...entry.customers],
          }
        }
      }
    }
    return map
  }, [dashboardStats?.interest_calendar, calendarMonth])

  const calendarMonthLabel = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInCalendarMonth = getDaysInMonth(calendarMonth.year, calendarMonth.month)
  const firstDayOfWeek = getFirstDayOfWeek(calendarMonth.year, calendarMonth.month)
  const todayDate = new Date()
  const isCurrentMonth = calendarMonth.year === todayDate.getFullYear() && calendarMonth.month === todayDate.getMonth()

  const navigateCalendarMonth = (delta: number) => {
    setSelectedCalendarDay(null)
    setCalendarMonth(prev => {
      let newMonth = prev.month + delta
      let newYear = prev.year
      if (newMonth < 0) { newMonth = 11; newYear-- }
      if (newMonth > 11) { newMonth = 0; newYear++ }
      return { year: newYear, month: newMonth }
    })
  }

  const selectedDayData = selectedCalendarDay ? calendarMap[selectedCalendarDay] : null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate max-w-[200px] sm:max-w-none">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back, Admin</p>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="mb-6">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4">
                  <SheetClose asChild>
                    <Button asChild className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Link href="/collections">Add Collection</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link href="/collections/datewise">Collections</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link href="/admin/customers">Customers</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="outline" asChild className="w-full justify-start">
                      <Link href="/admin/expenses">Money Manager</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="outline" asChild className="w-full justify-start border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10">
                      <Link href="/admin/cashbook">Cash Book</Link>
                    </Button>
                  </SheetClose>

                  <div className="h-px bg-border my-2" />

                  <SheetClose asChild>
                    <Button variant="ghost" asChild className="w-full justify-start">
                      <Link href="/admin/users/add" className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" /> Add Staff
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="ghost" asChild className="w-full justify-start">
                      <Link href="/auth/change-password" className="flex items-center gap-2">
                        <Key className="h-4 w-4" /> Change Password
                      </Link>
                    </Button>
                  </SheetClose>
                  <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50">
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-2 flex-wrap">
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
              <Link href="/admin/expenses">Money Manager</Link>
            </Button>
            <Button variant="outline" asChild className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10">
              <Link href="/admin/cashbook">Cash Book</Link>
            </Button>

            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/admin/users/add" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Staff
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/auth/change-password" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Change Password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Priority Alerts Section */}
        {dashboardStats && (
          <div className="mb-8 space-y-3">
            {/* Today's Interest Collection */}
            {dashboardStats.monthly_interest_due.length > 0 && (
              <Card className="border-red-500/50 bg-red-500/5">
                <CardHeader
                  className="pb-2 cursor-pointer hover:bg-red-500/10 transition-colors"
                  onClick={() => setExpandedInterestDue(!expandedInterestDue)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-500/20 rounded">
                        <Bell className="w-4 h-4 text-red-500" />
                      </div>
                      <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Today&apos;s Interest ({dashboardStats.monthly_interest_due.filter(i => !i.is_collected).length})
                      </CardTitle>
                      {dashboardStats.monthly_interest_due.some(i => i.is_collected) && (
                        <span className="px-1.5 py-0.5 bg-green-500/20 text-green-600 rounded text-xs font-medium">
                          {dashboardStats.monthly_interest_due.filter(i => i.is_collected).length} collected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-600">
                        ₹{dashboardStats.monthly_interest_due
                          .filter(i => !i.is_collected)
                          .reduce((sum, i) => sum + parseFloat(i.interest_due), 0)
                          .toLocaleString('en-IN')}
                      </span>
                      <div className={`transition-transform duration-200 ${expandedInterestDue ? 'rotate-180' : ''}`}>
                        <Bell className="w-4 h-4 text-red-500" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {expandedInterestDue && (
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {dashboardStats.monthly_interest_due.map((item) => (
                        <div
                          key={item.loan_id}
                          className={`flex items-center justify-between p-2 rounded transition-colors ${item.is_collected
                            ? 'bg-green-500/5 opacity-60'
                            : 'hover:bg-red-500/10'
                            }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${item.is_collected ? 'bg-green-500/20' : 'bg-red-500/20'
                              }`}>
                              {item.is_collected
                                ? <CheckCircle className="w-3 h-3 text-green-500" />
                                : <IndianRupee className="w-3 h-3 text-red-500" />
                              }
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/admin/customers/${item.customer_id}`}
                                  className="font-medium text-foreground text-sm truncate hover:text-primary"
                                >
                                  {item.customer_name}
                                </Link>
                                <span className="px-1 py-0.5 bg-muted text-muted-foreground rounded text-xs font-medium flex-shrink-0">
                                  {item.interest_rate}%
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Balance: ₹{parseFloat(item.remaining_amount).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-sm font-bold ${item.is_collected ? 'text-green-600 line-through' : 'text-red-600'}`}>
                              ₹{parseFloat(item.interest_due).toLocaleString('en-IN')}
                            </span>
                            {item.is_collected ? (
                              <span className="text-xs text-green-600 font-medium">✓</span>
                            ) : (
                              <button
                                className="px-2 py-1 text-xs font-medium rounded bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openCollectDialog(item.loan_id, item.interest_due, item.customer_name, item.remaining_amount)
                                }}
                                disabled={markingCollected === item.loan_id}
                              >
                                {markingCollected === item.loan_id ? '...' : 'Collect'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Overdue Interest Payments */}
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
                      <CardTitle className="text-sm font-semibold text-orange-600">
                        Overdue Interest ({dashboardStats.overdue_alerts.length})
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-orange-600">
                        ₹{dashboardStats.overdue_alerts
                          .reduce((sum, i) => sum + parseFloat(i.expected_amount), 0)
                          .toLocaleString('en-IN')}
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
                      {dashboardStats.overdue_alerts.map((item) => (
                        <Link
                          key={item.loan_id}
                          href={`/admin/customers/${item.customer_id}`}
                          className="flex items-center justify-between p-2 rounded hover:bg-orange-500/10 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-3 h-3 text-orange-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-foreground text-sm truncate">{item.customer_name}</span>
                                <span className="px-1 py-0.5 bg-orange-500/20 text-orange-600 rounded text-xs font-medium flex-shrink-0">
                                  {item.days_overdue}d late
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Balance: ₹{parseFloat(item.remaining_amount).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-sm font-bold text-orange-600">
                              ₹{parseFloat(item.expected_amount).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Almost Paid Off */}
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
                      <CardTitle className="text-sm font-semibold text-green-600">
                        Almost Paid Off ({dashboardStats.low_balance_warnings.length})
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {expandedAlmostPaid ? 'Collapse' : 'Expand'}
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
                      {dashboardStats.low_balance_warnings.map((item) => (
                        <Link
                          key={item.loan_id}
                          href={`/admin/customers/${item.customer_id}`}
                          className="flex items-center justify-between p-2 rounded hover:bg-green-500/10 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${item.loan_type === 'DC Loan' ? 'bg-blue-500/20' : item.loan_type === 'Monthly Interest Loan' ? 'bg-green-500/20' : 'bg-purple-500/20'
                              }`}>
                              <CheckCircle className={`w-3 h-3 ${item.loan_type === 'DC Loan' ? 'text-blue-500' : item.loan_type === 'Monthly Interest Loan' ? 'text-green-500' : 'text-purple-500'
                                }`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-foreground text-sm truncate">{item.customer_name}</span>
                                <span className={`px-1 py-0.5 rounded text-xs font-medium flex-shrink-0 ${item.loan_type === 'DC Loan' ? 'bg-blue-500/20 text-blue-600'
                                  : item.loan_type === 'Monthly Interest Loan' ? 'bg-green-500/20 text-green-600'
                                    : 'bg-purple-500/20 text-purple-600'
                                  }`}>
                                  {item.loan_type === 'DC Loan' ? 'DC' : item.loan_type === 'Monthly Interest Loan' ? 'ML' : 'DL'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-medium text-green-600">{100 - item.percentage_remaining}% paid</span>
                                <span>•</span>
                                <span>₹{parseFloat(item.remaining_amount).toLocaleString('en-IN')} left</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="w-16 bg-muted rounded-full h-1.5">
                              <div
                                className={`h-full rounded-full ${item.loan_type === 'DC Loan' ? 'bg-blue-500' : item.loan_type === 'Monthly Interest Loan' ? 'bg-green-500' : 'bg-purple-500'
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
              {dashboardStats?.outstanding_breakdown && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">DC Loan</span>
                    </span>
                    <span className="font-semibold text-blue-600">₹{parseFloat(dashboardStats.outstanding_breakdown.dc_loan).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Monthly Interest</span>
                    </span>
                    <span className="font-semibold text-green-600">₹{parseFloat(dashboardStats.outstanding_breakdown.monthly_interest_loan).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-muted-foreground">DL Loan</span>
                    </span>
                    <span className="font-semibold text-purple-600">₹{parseFloat(dashboardStats.outstanding_breakdown.dl_loan).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

          {/* Monthly Other Income */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Other Income
                </CardTitle>
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">
                {loading ? '—' : `₹${metrics.totalOtherIncome.toLocaleString('en-IN')}`}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Rent & other sources</p>
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
              <p className="text-xs text-muted-foreground mt-2">Collections + Income - Expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Interest Calendar */}
        {dashboardStats && (
          <Card className="border-border/50 mb-8">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-violet-500/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Interest Calendar</CardTitle>
                    <CardDescription>Monthly interest collection schedule</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigateCalendarMonth(-1)}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-lg font-bold"
                  >
                    ‹
                  </button>
                  <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{calendarMonthLabel}</span>
                  <button
                    onClick={() => navigateCalendarMonth(1)}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-lg font-bold"
                  >
                    ›
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Desktop: side-by-side | Mobile: stacked */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Calendar Grid — compact on desktop */}
                <div className="w-full lg:w-auto lg:min-w-[320px] lg:max-w-[360px]">
                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                    ))}
                  </div>
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for offset */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-10 lg:h-9" />
                    ))}
                    {/* Day cells */}
                    {Array.from({ length: daysInCalendarMonth }).map((_, i) => {
                      const day = i + 1
                      const data = calendarMap[day]
                      const isToday = isCurrentMonth && day === todayDate.getDate()
                      const isSelected = selectedCalendarDay === day
                      const hasLoans = data && data.count > 0
                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedCalendarDay(isSelected ? null : day)}
                          className={`relative h-10 lg:h-9 rounded-lg flex items-center justify-center transition-all text-sm
                            ${isSelected
                              ? 'bg-violet-600 text-white ring-2 ring-violet-400 shadow-lg'
                              : isToday
                                ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/30'
                                : hasLoans
                                  ? 'bg-violet-500/10 hover:bg-violet-500/20 text-foreground cursor-pointer'
                                  : 'text-muted-foreground hover:bg-muted/50'
                            }
                          `}
                        >
                          <span className={`text-xs sm:text-sm ${isToday && !isSelected ? 'font-bold' : ''}`}>{day}</span>
                          {hasLoans && (
                            <span className={`absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-0.5
                              ${isSelected
                                ? 'bg-white text-violet-700'
                                : data.count >= 5
                                  ? 'bg-red-500 text-white'
                                  : data.count >= 3
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-violet-500 text-white'
                              }
                            `}>
                              {data.count}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                      <span className="text-xs text-muted-foreground">1-2</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span className="text-xs text-muted-foreground">3-4</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-xs text-muted-foreground">5+</span>
                    </div>
                  </div>
                </div>

                {/* Detail Panel — right side on desktop, below on mobile */}
                <div className="flex-1 min-w-0 lg:border-l lg:border-border/50 lg:pl-6">
                  {selectedCalendarDay && selectedDayData ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-foreground">
                          {selectedCalendarDay}{selectedCalendarDay === 1 ? 'st' : selectedCalendarDay === 2 ? 'nd' : selectedCalendarDay === 3 ? 'rd' : 'th'} of every month — {selectedDayData.count} customer{selectedDayData.count > 1 ? 's' : ''}
                        </h4>
                        <span className="text-sm font-bold text-violet-600">
                          ₹{parseFloat(selectedDayData.total_interest).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {selectedDayData.customers.map((c: any) => (
                          <Link
                            key={c.loan_id}
                            href={`/admin/customers/${c.customer_id}`}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-violet-500/10 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-foreground text-sm truncate block">{c.customer_name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Balance: ₹{parseFloat(c.remaining_amount).toLocaleString('en-IN')}</span>
                                <span>•</span>
                                <span>{c.interest_rate}%</span>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-violet-600 flex-shrink-0">
                              ₹{parseFloat(c.interest_amount).toLocaleString('en-IN')}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : selectedCalendarDay && !selectedDayData ? (
                    <div className="flex items-center justify-center h-full py-8">
                      <p className="text-sm text-muted-foreground">No interest collections due on day {selectedCalendarDay}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full py-8">
                      <p className="text-sm text-muted-foreground">Click a day to see customers with interest due</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Recent Activity Feed */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  <span className="hidden sm:inline">Last 10 collections</span>
                  <span className="sm:hidden">Last 5 collections</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardStats?.recent_activity.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No recent activity</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardStats?.recent_activity.map((activity, index) => (
                  <div key={activity.id} className={`flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors ${index >= 5 ? 'hidden sm:flex' : ''}`}>
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

      {/* Interest Collection Dialog */}
      <Dialog open={collectDialogOpen} onOpenChange={setCollectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Interest</DialogTitle>
            <DialogDescription>
              {collectDialogData?.customerName} — Balance: ₹{parseFloat(collectDialogData?.remainingAmount || '0').toLocaleString('en-IN')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCollectPaymentMethod('cash')}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    collectPaymentMethod === 'cash'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setCollectPaymentMethod('online')}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    collectPaymentMethod === 'online'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-400'
                      : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  <IndianRupee className="w-4 h-4" />
                  Online
                </button>
              </div>
            </div>

            {/* Collection Type */}
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Interest Amount</label>
                <Input
                  type="number"
                  value={collectInterestAmount}
                  onChange={(e) => setCollectInterestAmount(e.target.value)}
                  placeholder="Interest amount"
                  className="text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Asal (Principal) Amount</label>
                <Input
                  type="number"
                  value={collectAsalAmount}
                  onChange={(e) => setCollectAsalAmount(e.target.value)}
                  placeholder="Enter asal amount (optional)"
                />
                <p className="text-xs text-muted-foreground">
                  Max: ₹{parseFloat(collectDialogData?.remainingAmount || '0').toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-sm font-medium text-muted-foreground">Total to Collect</span>
              <span className="text-lg font-bold text-foreground">
                ₹{getCollectTotal().toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCollectDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitCollection}
              disabled={markingCollected !== null || getCollectTotal() <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {markingCollected !== null ? 'Collecting...' : `Collect ₹${getCollectTotal().toLocaleString('en-IN')}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
