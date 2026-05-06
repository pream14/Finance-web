'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { ArrowLeft, Calendar, Filter, Search, RefreshCw, Download, User, Menu, Edit2, Trash2, X, Check } from 'lucide-react'
import { transactionsApi, loansApi, reportsApi, customersApi, authApi } from '@/lib/api'

const LOAN_TYPES = ['DC Loan', 'Monthly Interest Loan', 'DL Loan'] as const

interface Transaction {
  id: number
  customer_name: string
  customer_id?: number
  loan_type: string
  amount: string
  interest_amount: string
  description: string
  payment_method: string
  created_at: string
  time: string
  loan_id?: number
  remaining_amount?: string
  collected_by_name?: string
  asal_amount?: string
  loan?: number
  updated_at?: string
  last_edited_by_name?: string
}

export default function DatewiseCollectionsPage() {
  const [entries, setEntries] = useState<Transaction[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Admin edit/delete state
  const [editingEntry, setEditingEntry] = useState<Transaction | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editAsalAmount, setEditAsalAmount] = useState('')
  const [editInterestAmount, setEditInterestAmount] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash')
  const [editLoading, setEditLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtering states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterLoanType, setFilterLoanType] = useState('all')
  const [filterCollectedBy, setFilterCollectedBy] = useState('all')
  const [filterArea, setFilterArea] = useState('All Areas')
  const [searchTerm, setSearchTerm] = useState('')

  // Interest summary state
  const [interestSummary, setInterestSummary] = useState({
    monthlyInterestCollected: 0,
    dlInterestCollected: 0,
    totalInterestCollected: 0
  })

  // Report loading state
  const [reportLoading, setReportLoading] = useState(false)

  // Get unique collectors from entries
  const collectors = useMemo(() => {
    const uniqueCollectors = new Set<string>()
    entries.forEach(entry => {
      if (entry.collected_by_name) {
        uniqueCollectors.add(entry.collected_by_name)
      }
    })
    return Array.from(uniqueCollectors).sort()
  }, [entries])

  // Get unique areas from customers data
  const areas = useMemo(() => {
    const uniqueAreas = new Set<string>()
    customers.forEach(customer => {
      if (customer.area) uniqueAreas.add(customer.area)
    })
    return ['All Areas', ...Array.from(uniqueAreas).sort()]
  }, [customers])

  // Apply client-side filters
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Loan type filter
      if (filterLoanType !== 'all' && entry.loan_type !== filterLoanType) {
        return false
      }
      // Area filter - match customer area
      if (filterArea !== 'All Areas') {
        const customer = customers.find(c => c.name === entry.customer_name)
        if (!customer || customer.area !== filterArea) {
          return false
        }
      }
      // Collected by filter
      if (filterCollectedBy !== 'all' && entry.collected_by_name !== filterCollectedBy) {
        return false
      }
      // Search filter (customer name)
      if (searchTerm && !entry.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      return true
    })
  }, [entries, filterLoanType, filterArea, filterCollectedBy, searchTerm])

  // Calculate total amount
  const totalAmount = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || '0'), 0)
  }, [filteredEntries])

  // Calculate total interest
  const totalInterest = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => {
      if (entry.loan_type === 'Monthly Interest Loan' || entry.loan_type === 'DL Loan') {
        return sum + parseFloat(entry.interest_amount || '0')
      }
      return sum
    }, 0)
  }, [filteredEntries])

  // Calculate interest summary from filtered entries
  const calculateInterestSummary = useMemo(() => {
    let monthlyInterest = 0
    let dlInterest = 0

    filteredEntries.forEach((entry: Transaction) => {
      if (entry.loan_type === 'Monthly Interest Loan') {
        monthlyInterest += parseFloat(entry.interest_amount || '0')
      } else if (entry.loan_type === 'DL Loan') {
        dlInterest += parseFloat(entry.interest_amount || '0')
      }
    })

    const totalInterest = monthlyInterest + dlInterest

    return {
      monthlyInterestCollected: monthlyInterest,
      dlInterestCollected: dlInterest,
      totalInterestCollected: totalInterest
    }
  }, [filteredEntries])

  // Update interest summary when filtered entries change
  useEffect(() => {
    setInterestSummary(calculateInterestSummary)
  }, [filteredEntries])

  // Fetch customers data
  const fetchCustomers = async () => {
    try {
      const data = await customersApi.getAll()
      setCustomers(data)
    } catch (err: any) {
      console.error('Error fetching customers:', err)
    }
  }

  // Fetch entries with filters
  const fetchEntries = async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}

      // Use date filters if provided, otherwise default to today
      if (startDate) {
        params.start_date = startDate
      } else {
        params.start_date = new Date().toISOString().split('T')[0]
      }

      if (endDate) {
        params.end_date = endDate
      } else if (!startDate) {
        // If no start date, set end date to today for default behavior
        params.end_date = new Date().toISOString().split('T')[0]
      }

      const data = await transactionsApi.getAll(params)

      // Fetch loan data to get balance information
      const entriesWithBalance = await Promise.all(
        data.map(async (entry: any) => {
          let remainingAmount = ''
          if (entry.loan) {
            try {
              const loanData = await loansApi.getById(entry.loan)
              remainingAmount = loanData.remaining_amount || '0'
            } catch (err) {
              console.warn('Failed to fetch loan balance for transaction:', entry.id)
            }
          }
          return {
            ...entry,
            remaining_amount: remainingAmount
          }
        })
      )

      setEntries(entriesWithBalance)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch entries')
      console.error('Error fetching entries:', err)
    } finally {
      setLoading(false)
    }
  }

  // Download collection report as PDF
  const downloadCollectionReport = async () => {
    try {
      setReportLoading(true)
      const start = startDate || new Date().toISOString().split('T')[0]
      const end = endDate || new Date().toISOString().split('T')[0]

      await reportsApi.download({
        start_date: start,
        end_date: end,
        report_type: 'transactions',
        file_format: 'pdf',
        ...(filterArea !== 'All Areas' && { area: filterArea }),
        ...(filterLoanType !== 'all' && { loan_type: filterLoanType }),
        ...(filterCollectedBy !== 'all' && { collected_by: filterCollectedBy }),
        ...(searchTerm && { search: searchTerm })
      })
    } catch (err: any) {
      alert(err.message || 'Failed to download report')
    } finally {
      setReportLoading(false)
    }
  }

  // Fetch entries and customers on component mount and when date filters change
  useEffect(() => {
    fetchEntries()
    fetchCustomers()
    authApi.getCurrentUser().then(user => setCurrentUser(user))
  }, [startDate, endDate])

  // Quick date presets
  const setToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }

  const setYesterday = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().split('T')[0]
    setStartDate(dateStr)
    setEndDate(dateStr)
  }

  const setThisWeek = () => {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    setStartDate(weekStart.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }

  const setThisMonth = () => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(monthStart.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }

  const clearAllFilters = () => {
    setStartDate('')
    setEndDate('')
    setFilterLoanType('all')
    setFilterCollectedBy('all')
    setFilterArea('All Areas')
    setSearchTerm('')
  }

  const hasActiveFilters = startDate || endDate || filterLoanType !== 'all' || filterCollectedBy !== 'all' || filterArea !== 'All Areas' || searchTerm

  const isOwner = currentUser?.role === 'owner' || currentUser?.role === 'admin'

  // Handle edit entry
  const handleEditEntry = (entry: Transaction) => {
    setEditingEntry(entry)
    setEditAmount(entry.amount)
    setEditAsalAmount(entry.asal_amount || '0')
    setEditInterestAmount(entry.interest_amount || '0')
    setEditPaymentMethod(entry.payment_method || 'cash')
  }

  // Auto-compute total when editing asal/interest for Monthly/DL loans
  const handleEditAsalChange = (value: string) => {
    setEditAsalAmount(value)
    if (editingEntry && editingEntry.loan_type !== 'DC Loan') {
      const asal = parseFloat(value) || 0
      const interest = parseFloat(editInterestAmount) || 0
      setEditAmount(String(asal + interest))
    }
  }

  const handleEditInterestChange = (value: string) => {
    setEditInterestAmount(value)
    if (editingEntry && editingEntry.loan_type !== 'DC Loan') {
      const asal = parseFloat(editAsalAmount) || 0
      const interest = parseFloat(value) || 0
      setEditAmount(String(asal + interest))
    }
  }

  const handleSaveEdit = async () => {
    if (!editingEntry) return
    try {
      setEditLoading(true)
      const loanType = editingEntry.loan_type
      let updateData: any = { payment_method: editPaymentMethod }

      if (loanType === 'DC Loan') {
        const amt = parseFloat(editAmount)
        if (isNaN(amt) || amt <= 0) { alert('Enter a valid amount'); setEditLoading(false); return }
        updateData.amount = amt
        updateData.asal_amount = amt
        updateData.interest_amount = 0
      } else {
        // Monthly or DL - separate asal and interest
        const asal = parseFloat(editAsalAmount) || 0
        const interest = parseFloat(editInterestAmount) || 0
        if (asal + interest <= 0) { alert('Enter a valid amount'); setEditLoading(false); return }
        updateData.asal_amount = asal
        updateData.interest_amount = interest
        updateData.amount = asal + interest
      }

      await transactionsApi.update(editingEntry.id, updateData)
      setEditingEntry(null)
      await fetchEntries()
    } catch (err: any) {
      alert(err.message || 'Failed to update entry')
    } finally {
      setEditLoading(false)
    }
  }

  // Handle delete entry
  const handleDeleteEntry = async (id: number) => {
    try {
      setDeleteLoading(true)
      await transactionsApi.delete(id)
      setDeleteConfirmId(null)
      await fetchEntries()
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Collections</h1>
                <p className="text-sm text-muted-foreground">View and filter collection entries</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={fetchEntries} variant="outline" size="sm" title="Refresh" className="w-9 h-9 p-0 md:w-auto md:px-3">
              <RefreshCw className={`w-4 h-4 md:mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <Button
              onClick={downloadCollectionReport}
              disabled={reportLoading}
              variant="outline"
              size="sm"
              title="Download Report"
              className="w-9 h-9 p-0 md:w-auto md:px-3"
            >
              <Download className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">{reportLoading ? '...' : 'Download'}</span>
            </Button>

            {/* Mobile Navigation */}
            <div className="flex md:hidden">
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
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters Card */}
        <Card className="border-border/50 mb-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Filters</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground self-start sm:self-auto">
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2 flex items-center">Quick:</span>
              <Button variant="outline" size="sm" onClick={setToday} className="h-8 text-xs">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={setYesterday} className="h-8 text-xs">
                Yesterday
              </Button>
              <Button variant="outline" size="sm" onClick={setThisWeek} className="h-8 text-xs">
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={setThisMonth} className="h-8 text-xs">
                This Month
              </Button>
              <div className="ml-auto w-full sm:w-auto flex items-center gap-2">
                <label className="text-sm text-muted-foreground shrink-0">Search:</label>
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 border-border/50 w-full h-8"
                  />
                </div>
              </div>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Start Date */}
              <div className="space-y-1.5 w-full">
                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-border/50 h-9 w-full"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5 w-full">
                <label className="text-xs font-medium text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-border/50 h-9 w-full"
                />
              </div>

              {/* Loan Type Filter */}
              <div className="space-y-1.5 w-full">
                <label className="text-xs font-medium text-muted-foreground">Loan Type</label>
                <Select value={filterLoanType} onValueChange={setFilterLoanType}>
                  <SelectTrigger className="border-border/50 h-9 w-full">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {LOAN_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Collected By Filter */}
              <div className="space-y-1.5 w-full">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Collected By
                </label>
                <Select value={filterCollectedBy} onValueChange={setFilterCollectedBy}>
                  <SelectTrigger className="border-border/50 h-9 w-full">
                    <SelectValue placeholder="All Collectors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Collectors</SelectItem>
                    {collectors.map((collector) => (
                      <SelectItem key={collector} value={collector}>
                        {collector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area Filter */}
              <div className="space-y-1.5 w-full">
                <label className="text-xs font-medium text-muted-foreground">Area</label>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="border-border/50 h-9 w-full">
                    <SelectValue placeholder="All Areas" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
            <CardContent className="py-4 px-4">
              <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
              <p className="text-2xl font-bold text-foreground">{filteredEntries.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
            <CardContent className="py-4 px-4">
              <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">₹{totalAmount.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
            <CardContent className="py-4 px-4">
              <p className="text-xs text-muted-foreground mb-1">Cash</p>
              <p className="text-2xl font-bold text-amber-600">
                ₹{filteredEntries
                  .filter(e => e.payment_method === 'cash')
                  .reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0)
                  .toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-purple-500/10">
            <CardContent className="py-4 px-4">
              <p className="text-xs text-muted-foreground mb-1">Online</p>
              <p className="text-2xl font-bold text-purple-600">
                ₹{filteredEntries
                  .filter(e => e.payment_method === 'online' || e.payment_method === 'gpay' || e.payment_method === 'transfer' || e.payment_method === 'card')
                  .reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0)
                  .toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Entries Table */}
        {loading ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <RefreshCw className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-muted-foreground">Loading collections...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={fetchEntries} className="mt-4">Retry</Button>
            </CardContent>
          </Card>
        ) : filteredEntries.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No collections found for the selected filters</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearAllFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {!startDate && !endDate ? "Today's Collections" : 'Filtered Collections'}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {filteredEntries.length} collection{filteredEntries.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap sticky left-0 z-20 bg-muted/50" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Loan Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Interest</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground whitespace-nowrap">Amount</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground whitespace-nowrap">Balance</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Method</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground whitespace-nowrap">Collected By</th>
                      {isOwner && <th className="text-center py-3 px-4 font-semibold text-foreground whitespace-nowrap">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredEntries.map((entry, index) => (
                      <tr key={entry.id} className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground sticky left-0 z-10 bg-card" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                          {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && entry.customer_id ? (
                            <Link href={`/admin/customers/${entry.customer_id}`} className="hover:text-primary hover:underline transition-colors">
                              {entry.customer_name}
                            </Link>
                          ) : entry.customer_name}
                        </td>
                        <td className="py-3 px-4 text-foreground text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${entry.loan_type === 'DC Loan'
                            ? 'bg-blue-500/20 text-blue-600'
                            : entry.loan_type === 'Monthly Interest Loan'
                              ? 'bg-green-500/20 text-green-600'
                              : 'bg-purple-500/20 text-purple-600'
                            }`}>
                            {entry.loan_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-blue-600 whitespace-nowrap">
                          ₹{(entry.loan_type === 'Monthly Interest Loan' || entry.loan_type === 'DL Loan') ? (parseFloat(entry.interest_amount || '0')).toLocaleString('en-IN') : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-green-600 whitespace-nowrap">
                          ₹{parseFloat(entry.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-foreground whitespace-nowrap">
                          {entry.remaining_amount ? `₹${parseFloat(entry.remaining_amount).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/20 text-secondary-foreground capitalize">
                            {entry.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              <User className="w-3 h-3" />
                              {entry.collected_by_name || 'Unknown'}
                            </span>
                            {entry.last_edited_by_name && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700" title={`Edited by ${entry.last_edited_by_name}${entry.updated_at ? ' on ' + new Date(entry.updated_at).toLocaleString('en-IN') : ''}`}>
                                ✏️ Edited by {entry.last_edited_by_name.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </td>
                        {isOwner && (
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditEntry(entry)}
                                className="p-1.5 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 transition-colors"
                                title="Edit Entry"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(entry.id)}
                                className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors"
                                title="Delete Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total at bottom */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total ({filteredEntries.length} entries)</span>
                  <div className="text-right space-x-4">
                    <span className="text-sm text-muted-foreground">Interest: ₹{totalInterest.toLocaleString('en-IN')}</span>
                    <span className="font-bold text-green-600 text-lg">Total: ₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Edit Entry Modal (Owner only) */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setEditingEntry(null)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Edit Entry</h3>
                  <p className="text-sm text-muted-foreground">{editingEntry.customer_name} — {editingEntry.loan_type}</p>
                </div>
                <button onClick={() => setEditingEntry(null)} className="p-1.5 rounded-md hover:bg-muted/50">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {editingEntry.loan_type === 'DC Loan' ? (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Principal (Asal) (₹)</label>
                    <input
                      type="number"
                      value={editAsalAmount}
                      onChange={(e) => handleEditAsalChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Interest (₹)</label>
                    <input
                      type="number"
                      value={editInterestAmount}
                      onChange={(e) => handleEditInterestChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Amount</span>
                      <span className="text-lg font-bold text-green-600">₹{(parseFloat(editAmount) || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Payment Method</label>
                <div className="flex gap-2">
                  {['cash', 'online'].map(method => (
                    <button
                      key={method}
                      onClick={() => setEditPaymentMethod(method)}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors capitalize ${
                        editPaymentMethod === method
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-3">
              <button
                onClick={() => setEditingEntry(null)}
                disabled={editLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading || !editAmount}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {editLoading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog (Owner only) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Delete Entry</h3>
              <p className="text-sm text-muted-foreground">Are you sure? This will reverse the payment and update the loan balance. This action cannot be undone.</p>
            </div>
            <div className="p-5 border-t border-border flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEntry(deleteConfirmId)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
