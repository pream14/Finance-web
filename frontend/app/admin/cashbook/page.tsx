'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    BookOpen, Calendar, RefreshCw,
    ChevronLeft, ChevronRight, Save, Pencil, Download, Filter
} from 'lucide-react'
import { cashBookApi, revenueApi } from '@/lib/api'

interface CashBookData {
    date: string
    opening_balance: string
    cash_collections: string
    online_collections: string
    total_collections: string
    cash_loans_given: string
    online_loans_given: string
    total_loans_given: string
    expenses: string
    closing_balance: string
    revenue: {
        dc_deduction: string
        monthly_interest: string
        dl_interest: string
        dc_interest: string
        total_interest_collected: string
        total: string
    }
    details: {
        expenses: Array<{ id: number; description: string; amount: string }>
        new_loans: Array<{
            id: number
            customer__name: string
            loan_type: string
            principal_amount: string
            payment_method: string
            dc_deduction_amount: string
        }>
    }
    notes: string
}

interface RevenueData {
    start_date: string
    end_date: string
    revenue: {
        dc_deduction: string
        dc_interest: string
        monthly_interest: string
        dl_interest: string
        total_interest_collected: string
        total: string
    }
    summary: {
        total_collections: string
        total_loans_given: string
        total_expenses: string
    }
}

function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })
}

function getToday() {
    const now = new Date()
    return now.toISOString().split('T')[0]
}

export default function CashBookPage() {
    const [selectedDate, setSelectedDate] = useState(getToday())
    const [cashBookData, setCashBookData] = useState<CashBookData | null>(null)
    const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
    const [loading, setLoading] = useState(true)
    const [revenueLoading, setRevenueLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [editingBalance, setEditingBalance] = useState(false)
    const [newOpeningBalance, setNewOpeningBalance] = useState('')
    const [savingBalance, setSavingBalance] = useState(false)
    const [revenueRange, setRevenueRange] = useState('today')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [showCustomDateRange, setShowCustomDateRange] = useState(false)

    const fetchCashBookData = async (date: string) => {
        try {
            setLoading(true)
            setError(null)
            const data = await cashBookApi.get(date)
            setCashBookData(data)
            setNewOpeningBalance(data.opening_balance)
        } catch (err: any) {
            setError(err.message || 'Failed to load cash book data')
        } finally {
            setLoading(false)
        }
    }

    const fetchRevenueData = async (range?: string, start?: string, end?: string) => {
        try {
            setRevenueLoading(true)
            let params: any = {}

            if (start && end) {
                params.start_date = start
                params.end_date = end
            } else {
                params.range = range || revenueRange
            }

            const data = await revenueApi.get(params)
            setRevenueData(data)
        } catch (err: any) {
            console.error('Failed to load revenue data:', err)
        } finally {
            setRevenueLoading(false)
        }
    }

    const saveOpeningBalance = async () => {
        try {
            setSavingBalance(true)
            await cashBookApi.saveOpeningBalance({
                date: selectedDate,
                opening_balance: parseFloat(newOpeningBalance) || 0,
            })
            setEditingBalance(false)
            await fetchCashBookData(selectedDate)
        } catch (err: any) {
            alert(err.message || 'Failed to save opening balance')
        } finally {
            setSavingBalance(false)
        }
    }

    const setQuickRevenueRange = (type: string) => {
        const now = new Date()
        let start = '', end = ''

        switch (type) {
            case 'today':
                start = end = getToday()
                break
            case 'week':
                const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekStart.getDate() + 6)
                start = weekStart.toISOString().split('T')[0]
                end = weekEnd.toISOString().split('T')[0]
                break
            case 'month':
                start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
                end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`
                break
            case 'last_month':
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                start = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`
                end = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate()}`
                break
        }

        setStartDate(start)
        setEndDate(end)
        setShowCustomDateRange(false)
        setRevenueRange(type)
        fetchRevenueData(type, start, end)
    }

    const applyCustomDateRange = () => {
        if (startDate && endDate) {
            setShowCustomDateRange(false)
            setRevenueRange('custom')
            fetchRevenueData('custom', startDate, endDate)
        }
    }

    const goToPreviousDay = () => {
        const d = new Date(selectedDate + 'T00:00:00')
        d.setDate(d.getDate() - 1)
        const newDate = d.toISOString().split('T')[0]
        setSelectedDate(newDate)
    }

    const goToNextDay = () => {
        const d = new Date(selectedDate + 'T00:00:00')
        d.setDate(d.getDate() + 1)
        const today = getToday()
        const newDate = d.toISOString().split('T')[0]
        if (newDate <= today) {
            setSelectedDate(newDate)
        }
    }

    const goToToday = () => {
        setSelectedDate(getToday())
    }

    useEffect(() => {
        fetchCashBookData(selectedDate)
    }, [selectedDate])

    useEffect(() => {
        fetchRevenueData(revenueRange)
    }, [revenueRange])

    const p = (val: string) => parseFloat(val) || 0

    return (
        <div className="min-h-screen bg-background">
            {/* Header with Date Navigation */}
            <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">Daily Cash Book</h1>
                                <p className="text-sm text-muted-foreground mt-1">Iruppu & Revenue Tracker</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => fetchCashBookData(selectedDate)} variant="outline" size="icon" title="Refresh">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button variant="outline" onClick={() => {
                                const data = cashBookData ? {
                                    date: selectedDate,
                                    opening_balance: cashBookData.opening_balance,
                                    cash_collections: cashBookData.cash_collections,
                                    online_collections: cashBookData.online_collections,
                                    total_collections: cashBookData.total_collections,
                                    cash_loans_given: cashBookData.cash_loans_given,
                                    online_loans_given: cashBookData.online_loans_given,
                                    total_loans_given: cashBookData.total_loans_given,
                                    expenses: cashBookData.expenses,
                                    closing_balance: cashBookData.closing_balance,
                                    revenue: cashBookData.revenue,
                                    details: cashBookData.details
                                } : null
                                if (data) {
                                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                                    const url = window.URL.createObjectURL(blob)
                                    const link = document.createElement('a')
                                    link.href = url
                                    link.download = `cashbook_${selectedDate}.json`
                                    document.body.appendChild(link)
                                    link.click()
                                    document.body.removeChild(link)
                                    window.URL.revokeObjectURL(url)
                                }
                            }} title="Export Cash Book Data" size="icon">
                                <Download className="w-4 h-4" />
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/admin/dashboard">Dashboard</Link>
                            </Button>
                        </div>
                    </div>
                    
                    {/* Date Navigation */}
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={selectedDate}
                                max={getToday()}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-sm font-medium text-foreground border-none outline-none cursor-pointer"
                            />
                        </div>
                        {selectedDate !== getToday() && (
                            <Button variant="outline" size="sm" onClick={goToToday} className="text-xs h-7">
                                Today
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToNextDay}
                            disabled={selectedDate >= getToday()}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {loading ? (
                    <div className="py-16 text-center">
                        <RefreshCw className="w-6 h-6 text-muted-foreground mx-auto mb-3 animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading cash book...</p>
                    </div>
                ) : error ? (
                    <Card className="border-border/50">
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground mb-4">{error}</p>
                            <Button onClick={() => fetchCashBookData(selectedDate)} variant="outline">Retry</Button>
                        </CardContent>
                    </Card>
                ) : cashBookData && (
                    <>
                        {/* Opening Balance */}
                        <Card className="border-border/50">
                            <CardContent className="py-4 px-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Iruppu (Opening Balance)</p>
                                        {editingBalance ? (
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <Input
                                                    type="number"
                                                    value={newOpeningBalance}
                                                    onChange={(e) => setNewOpeningBalance(e.target.value)}
                                                    className="w-36 h-8 border-border/50"
                                                    autoFocus
                                                />
                                                <Button size="sm" onClick={saveOpeningBalance} disabled={savingBalance} className="h-8">
                                                    <Save className="w-3 h-3 mr-1" />
                                                    {savingBalance ? '...' : 'Save'}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setEditingBalance(false); setNewOpeningBalance(cashBookData.opening_balance) }} className="h-8">
                                                    Cancel
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-2xl font-bold text-foreground mt-0.5">
                                                ₹{p(cashBookData.opening_balance).toLocaleString('en-IN')}
                                            </p>
                                        )}
                                    </div>
                                    {!editingBalance && (
                                        <Button variant="ghost" size="sm" onClick={() => setEditingBalance(true)} className="text-muted-foreground">
                                            <Pencil className="w-3 h-3 mr-1" />
                                            Edit
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cash Flow Calculation — single clean table */}
                        <Card className="border-border/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cash Flow</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="divide-y divide-border">
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm text-foreground">Opening Balance</span>
                                        <span className="text-sm font-medium text-foreground">₹{p(cashBookData.opening_balance).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm text-foreground">+ Cash Collections</span>
                                        <span className="text-sm font-medium text-green-600">+₹{p(cashBookData.cash_collections).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm text-foreground">− Cash Loans Given</span>
                                        <span className="text-sm font-medium text-red-600">-₹{p(cashBookData.cash_loans_given).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm text-foreground">− Expenses</span>
                                        <span className="text-sm font-medium text-red-600">-₹{p(cashBookData.expenses).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm font-bold text-foreground">= Closing Cash in Hand</span>
                                        <span className={`text-lg font-bold ${p(cashBookData.closing_balance) >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                                            ₹{p(cashBookData.closing_balance).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Online Transactions (if any) */}
                        {(p(cashBookData.online_collections) > 0 || p(cashBookData.online_loans_given) > 0) && (
                            <Card className="border-border/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Online Transactions</CardTitle>
                                    <CardDescription className="text-xs">These don&apos;t affect cash in hand</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="divide-y divide-border">
                                        <div className="flex justify-between items-center py-3">
                                            <span className="text-sm text-foreground">Online Collections</span>
                                            <span className="text-sm font-medium text-foreground">₹{p(cashBookData.online_collections).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3">
                                            <span className="text-sm text-foreground">Online Loans Given</span>
                                            <span className="text-sm font-medium text-foreground">₹{p(cashBookData.online_loans_given).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Details: Loans & Expenses side by side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {cashBookData.details.new_loans.length > 0 && (
                                <Card className="border-border/50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">New Loans Given</CardTitle>
                                        <CardDescription className="text-xs">{cashBookData.details.new_loans.length} loan{cashBookData.details.new_loans.length !== 1 ? 's' : ''}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="divide-y divide-border">
                                            {cashBookData.details.new_loans.map((loan) => (
                                                <div key={loan.id} className="flex justify-between items-center py-2.5">
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{loan.customer__name}</p>
                                                        <p className="text-xs text-muted-foreground">{loan.loan_type} • {loan.payment_method}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold text-foreground">₹{p(loan.principal_amount).toLocaleString('en-IN')}</p>
                                                        {loan.loan_type === 'DC Loan' && p(loan.dc_deduction_amount) > 0 && (
                                                            <p className="text-xs text-muted-foreground">-₹{p(loan.dc_deduction_amount).toLocaleString('en-IN')} deduction</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {cashBookData.details.expenses.length > 0 && (
                                <Card className="border-border/50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Expenses</CardTitle>
                                        <CardDescription className="text-xs">{cashBookData.details.expenses.length} expense{cashBookData.details.expenses.length !== 1 ? 's' : ''}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="divide-y divide-border">
                                            {cashBookData.details.expenses.map((expense) => (
                                                <div key={expense.id} className="flex justify-between items-center py-2.5">
                                                    <p className="text-sm text-foreground">{expense.description}</p>
                                                    <p className="text-sm font-semibold text-foreground">₹{p(expense.amount).toLocaleString('en-IN')}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Today's Revenue */}
                        <Card className="border-border/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today&apos;s Revenue</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="divide-y divide-border">
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm text-foreground">DC Deduction</span>
                                        <span className="text-sm font-medium text-foreground">₹{p(cashBookData.revenue.dc_deduction).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm text-foreground">Monthly Interest</span>
                                        <span className="text-sm font-medium text-foreground">₹{p(cashBookData.revenue.monthly_interest).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm text-foreground">DL Interest</span>
                                        <span className="text-sm font-medium text-foreground">₹{p(cashBookData.revenue.dl_interest).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm font-bold text-foreground">Total Revenue</span>
                                        <span className="text-lg font-bold text-green-600">₹{p(cashBookData.revenue.total).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Revenue Report Section */}
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Revenue Report</CardTitle>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-muted-foreground">Period</label>
                                <Select value={revenueRange} onValueChange={(value) => {
                                    if (value !== 'custom') {
                                        setQuickRevenueRange(value)
                                    } else {
                                        setShowCustomDateRange(true)
                                    }
                                }}>
                                    <SelectTrigger className="w-32 border-border/50 h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="week">This Week</SelectItem>
                                        <SelectItem value="month">This Month</SelectItem>
                                        <SelectItem value="last_month">Last Month</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Custom Date Range */}
                    {showCustomDateRange && (
                        <div className="px-6 pb-4 border-b border-border">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="h-9 w-36 text-xs border-border/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">End Date</label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="h-9 w-36 text-xs border-border/50"
                                    />
                                </div>
                                <Button size="sm" onClick={applyCustomDateRange} disabled={!startDate || !endDate || revenueLoading} className="h-9">
                                    Apply
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setShowCustomDateRange(false)} className="h-9">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    <CardContent>
                        {revenueLoading ? (
                            <div className="py-8 text-center">
                                <RefreshCw className="w-5 h-5 text-muted-foreground mx-auto mb-2 animate-spin" />
                                <p className="text-xs text-muted-foreground">Loading...</p>
                            </div>
                        ) : revenueData ? (
                            <div className="space-y-4">
                                <p className="text-xs text-muted-foreground text-center">
                                    {formatDate(revenueData.start_date)} — {formatDate(revenueData.end_date)}
                                    {revenueRange === 'custom' && <span className="ml-1">(Custom)</span>}
                                </p>

                                {/* Revenue Breakdown */}
                                <div className="divide-y divide-border">
                                    <div className="flex justify-between items-center py-2.5">
                                        <span className="text-sm text-foreground">DC Deduction</span>
                                        <span className="text-sm font-medium text-foreground">₹{p(revenueData.revenue.dc_deduction).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2.5">
                                        <span className="text-sm text-foreground">Monthly Interest</span>
                                        <span className="text-sm font-medium text-foreground">₹{p(revenueData.revenue.monthly_interest).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2.5">
                                        <span className="text-sm text-foreground">DL Interest</span>
                                        <span className="text-sm font-medium text-foreground">₹{p(revenueData.revenue.dl_interest).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm font-bold text-foreground">Total Revenue</span>
                                        <span className="text-base font-bold text-green-600">₹{p(revenueData.revenue.total).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                {/* Period Summary */}
                                <div className="pt-3 border-t border-border">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Collections</p>
                                            <p className="text-sm font-semibold text-green-600">₹{p(revenueData.summary.total_collections).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Loans Given</p>
                                            <p className="text-sm font-semibold text-red-600">₹{p(revenueData.summary.total_loans_given).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Expenses</p>
                                            <p className="text-sm font-semibold text-red-600">₹{p(revenueData.summary.total_expenses).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Select a date range to view revenue</p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
