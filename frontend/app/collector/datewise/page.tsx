'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Calendar, Filter, Search, RefreshCw } from 'lucide-react'
import { authApi, transactionsApi } from '@/lib/api'

const LOAN_TYPES = ['DC Loan', 'Monthly Interest Loan', 'DL Loan'] as const

interface Transaction {
  id: number
  customer_name: string
  loan_type: string
  amount: number
  description: string
  payment_method: string
  created_at: string
  time: string
  collected_by: string
}

export default function CollectorDatewiseCollectionsPage() {
  const [entries, setEntries] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ full_name?: string; role?: string } | null>(null)

  // Filtering states
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterLoanType, setFilterLoanType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await authApi.getCurrentUser()
        setCurrentUser(user)
      } catch (err) {
        console.error('Error fetching user:', err)
      }
    }
    fetchUser()
  }, [])

  // Fetch entries with filters for current collector
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
      setEntries(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch entries')
      console.error('Error fetching entries:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch entries on component mount and when date filters change
  useEffect(() => {
    fetchEntries()
  }, [startDate, endDate])

  // Apply client-side filters
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Loan type filter
      if (filterLoanType !== 'all' && entry.loan_type !== filterLoanType) {
        return false
      }
      // Search filter (customer name)
      if (searchTerm && !entry.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      return true
    })
  }, [entries, filterLoanType, searchTerm])

  // Calculate total amount
  const totalAmount = filteredEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

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
    setSearchTerm('')
  }

  const hasActiveFilters = startDate || endDate || filterLoanType !== 'all' || searchTerm

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
                <h1 className="text-2xl font-bold text-foreground">My Collections</h1>
                <p className="text-sm text-muted-foreground">
                  {currentUser?.full_name ? `${currentUser.full_name}'s entries` : 'View your collection entries'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchEntries} variant="outline" size="icon" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/change-password">Change Password</Link>
            </Button>
            <Button asChild>
              <Link href="/collector/dashboard">Add Collection</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters Card */}
        <Card className="border-border/50 mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Filters</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground">
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-2">
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
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-border/50 h-9"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-border/50 h-9"
                />
              </div>

              {/* Loan Type Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Loan Type</label>
                <Select value={filterLoanType} onValueChange={setFilterLoanType}>
                  <SelectTrigger className="border-border/50 h-9">
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

              {/* Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Search Customer</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Customer name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 border-border/50 h-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
            <CardContent className="py-4 px-4">
              <p className="text-xs text-muted-foreground mb-1">My Entries</p>
              <p className="text-2xl font-bold text-foreground">{filteredEntries.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
            <CardContent className="py-4 px-4">
              <p className="text-xs text-muted-foreground mb-1">My Total</p>
              <p className="text-2xl font-bold text-green-600">₹{totalAmount.toLocaleString('en-IN')}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
            <CardContent className="py-4 px-4">
              <p className="text-xs text-muted-foreground mb-1">Cash</p>
              <p className="text-2xl font-bold text-amber-600">
                ₹{filteredEntries
                  .filter(e => e.payment_method === 'cash')
                  .reduce((sum, e) => sum + Number(e.amount || 0), 0)
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
                  .reduce((sum, e) => sum + Number(e.amount || 0), 0)
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
              <p className="text-muted-foreground">Loading your collections...</p>
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
                    {!startDate && !endDate ? "Today's Collections" : 'My Collections'}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {filteredEntries.length} collection{filteredEntries.length !== 1 ? 's' : ''} recorded by you
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Loan Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Details</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Method</th>
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
                        <td className="py-3 px-4 font-medium text-foreground">{entry.customer_name}</td>
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
                        <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                          {entry.description || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-green-600 whitespace-nowrap">
                          ₹{Number(entry.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/20 text-secondary-foreground capitalize">
                            {entry.payment_method}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total at bottom */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">My Total ({filteredEntries.length} entries)</span>
                  <span className="font-bold text-green-600 text-xl">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
