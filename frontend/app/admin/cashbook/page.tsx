'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    BookOpen, ArrowLeft, Calendar, TrendingUp, TrendingDown,
    Wallet, RefreshCw, ArrowUpRight, ArrowDownRight, DollarSign,
    ChevronLeft, ChevronRight, Save, Pencil
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
    range: string
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

    const fetchRevenueData = async (range: string) => {
        try {
            setRevenueLoading(true)
            const data = await revenueApi.get({ range })
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
            {/* Header */}
            <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">Daily Cash Book</h1>
                            <p className="text-xs text-muted-foreground">Iruppu & Revenue Tracker</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => fetchCashBookData(selectedDate)} variant="outline" size="icon" title="Refresh">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard">Dashboard</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Date Navigation */}
                <Card className="border-border/50 mb-6">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-primary" />
                                <div className="text-center">
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        max={getToday()}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="bg-transparent text-lg font-bold text-foreground border-none outline-none cursor-pointer text-center"
                                    />
                                    <p className="text-xs text-muted-foreground">{formatDate(selectedDate)}</p>
                                </div>
                                {selectedDate !== getToday() && (
                                    <Button variant="outline" size="sm" onClick={goToToday}>
                                        Today
                                    </Button>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goToNextDay}
                                disabled={selectedDate >= getToday()}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="py-12 text-center">
                        <RefreshCw className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                        <p className="text-muted-foreground">Loading cash book...</p>
                    </div>
                ) : error ? (
                    <Card className="border-border/50">
                        <CardContent className="py-12 text-center">
                            <p className="text-red-500">{error}</p>
                            <Button onClick={() => fetchCashBookData(selectedDate)} className="mt-4">
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                ) : cashBookData && (
                    <>
                        {/* Opening Balance (Iruppu) - Auto from previous day, editable */}
                        <Card className="border-border/50 mb-6 bg-gradient-to-br from-indigo-500/5 to-indigo-500/10">
                            <CardContent className="py-5 px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                                            <Wallet className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Iruppu (Opening Balance)</p>
                                            {editingBalance ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Input
                                                        type="number"
                                                        value={newOpeningBalance}
                                                        onChange={(e) => setNewOpeningBalance(e.target.value)}
                                                        className="w-40 h-8 border-indigo-500/30"
                                                        autoFocus
                                                    />
                                                    <Button size="sm" onClick={saveOpeningBalance} disabled={savingBalance} className="h-8">
                                                        <Save className="w-3 h-3 mr-1" />
                                                        {savingBalance ? '...' : 'Save'}
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => { setEditingBalance(false); setNewOpeningBalance(cashBookData.opening_balance) }} className="h-8">
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-2xl font-bold text-indigo-600">
                                                        ₹{p(cashBookData.opening_balance).toLocaleString('en-IN')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Auto from previous day&apos;s closing balance</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {!editingBalance && (
                                        <Button variant="outline" size="sm" onClick={() => setEditingBalance(true)}>
                                            <Pencil className="w-3 h-3 mr-1" />
                                            Edit
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cash Flow Summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                            {/* Cash Collections */}
                            <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
                                <CardContent className="py-4 px-4">
                                    <div className="flex items-center gap-1 mb-1">
                                        <ArrowDownRight className="w-3 h-3 text-green-600" />
                                        <p className="text-xs text-muted-foreground">Cash Collections</p>
                                    </div>
                                    <p className="text-xl font-bold text-green-600">
                                        +₹{p(cashBookData.cash_collections).toLocaleString('en-IN')}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Cash Loans Given */}
                            <Card className="border-border/50 bg-gradient-to-br from-red-500/5 to-red-500/10">
                                <CardContent className="py-4 px-4">
                                    <div className="flex items-center gap-1 mb-1">
                                        <ArrowUpRight className="w-3 h-3 text-red-600" />
                                        <p className="text-xs text-muted-foreground">Cash Loans Given</p>
                                    </div>
                                    <p className="text-xl font-bold text-red-600">
                                        -₹{p(cashBookData.cash_loans_given).toLocaleString('en-IN')}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Expenses */}
                            <Card className="border-border/50 bg-gradient-to-br from-orange-500/5 to-orange-500/10">
                                <CardContent className="py-4 px-4">
                                    <div className="flex items-center gap-1 mb-1">
                                        <ArrowUpRight className="w-3 h-3 text-orange-600" />
                                        <p className="text-xs text-muted-foreground">Expenses</p>
                                    </div>
                                    <p className="text-xl font-bold text-orange-600">
                                        -₹{p(cashBookData.expenses).toLocaleString('en-IN')}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Closing Balance */}
                            <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-blue-500/10 ring-2 ring-blue-500/20">
                                <CardContent className="py-4 px-4">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Wallet className="w-3 h-3 text-blue-600" />
                                        <p className="text-xs text-muted-foreground font-medium">Closing Balance</p>
                                    </div>
                                    <p className={`text-xl font-bold ${p(cashBookData.closing_balance) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                        ₹{p(cashBookData.closing_balance).toLocaleString('en-IN')}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Cash Flow Calculation */}
                        <Card className="border-border/50 mb-6">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Cash Flow Calculation</CardTitle>
                                <CardDescription>How the closing balance is calculated</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                                        <span className="text-sm text-muted-foreground">Iruppu (Opening Balance)</span>
                                        <span className="font-medium text-foreground">₹{p(cashBookData.opening_balance).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                                        <span className="text-sm text-green-600">+ Cash Collections</span>
                                        <span className="font-medium text-green-600">+₹{p(cashBookData.cash_collections).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                                        <span className="text-sm text-red-600">− Cash Loans Given</span>
                                        <span className="font-medium text-red-600">-₹{p(cashBookData.cash_loans_given).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                                        <span className="text-sm text-orange-600">− Expenses</span>
                                        <span className="font-medium text-orange-600">-₹{p(cashBookData.expenses).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 bg-blue-500/10 rounded-lg px-3">
                                        <span className="text-sm font-bold text-blue-700">= Closing Cash in Hand</span>
                                        <span className={`text-lg font-bold ${p(cashBookData.closing_balance) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                                            ₹{p(cashBookData.closing_balance).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Online Transactions (Info only) */}
                        {(p(cashBookData.online_collections) > 0 || p(cashBookData.online_loans_given) > 0) && (
                            <Card className="border-border/50 mb-6">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base text-muted-foreground">Online Transactions (Info Only)</CardTitle>
                                    <CardDescription>These don't affect cash in hand</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center py-2">
                                            <p className="text-xs text-muted-foreground">Online Collections</p>
                                            <p className="text-lg font-medium text-foreground">₹{p(cashBookData.online_collections).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="text-center py-2">
                                            <p className="text-xs text-muted-foreground">Online Loans Given</p>
                                            <p className="text-lg font-medium text-foreground">₹{p(cashBookData.online_loans_given).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Today's Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* New Loans Given */}
                            {cashBookData.details.new_loans.length > 0 && (
                                <Card className="border-border/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">New Loans Given</CardTitle>
                                        <CardDescription>{cashBookData.details.new_loans.length} loans</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {cashBookData.details.new_loans.map((loan) => (
                                                <div key={loan.id} className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/30">
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{loan.customer__name}</p>
                                                        <p className="text-xs text-muted-foreground">{loan.loan_type} • {loan.payment_method}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-foreground">₹{p(loan.principal_amount).toLocaleString('en-IN')}</p>
                                                        {loan.loan_type === 'DC Loan' && p(loan.dc_deduction_amount) > 0 && (
                                                            <p className="text-xs text-orange-600">-₹{p(loan.dc_deduction_amount).toLocaleString('en-IN')} deduction</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Expenses */}
                            {cashBookData.details.expenses.length > 0 && (
                                <Card className="border-border/50">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Expenses</CardTitle>
                                        <CardDescription>{cashBookData.details.expenses.length} expenses</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {cashBookData.details.expenses.map((expense) => (
                                                <div key={expense.id} className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/30">
                                                    <p className="text-sm text-foreground">{expense.description}</p>
                                                    <p className="text-sm font-bold text-orange-600">₹{p(expense.amount).toLocaleString('en-IN')}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Today's Revenue */}
                        <Card className="border-border/50 mb-6 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-emerald-600" />
                                    <CardTitle className="text-base">Today&apos;s Revenue</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    <div className="text-center py-2">
                                        <p className="text-xs text-muted-foreground">DC Interest</p>
                                        <p className="text-lg font-bold text-emerald-600">₹{p(cashBookData.revenue.dc_deduction).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-center py-2">
                                        <p className="text-xs text-muted-foreground">Monthly Interest</p>
                                        <p className="text-lg font-bold text-emerald-600">₹{p(cashBookData.revenue.monthly_interest).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-center py-2">
                                        <p className="text-xs text-muted-foreground">DL Interest</p>
                                        <p className="text-lg font-bold text-emerald-600">₹{p(cashBookData.revenue.dl_interest).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-center py-2 bg-emerald-500/10 rounded-lg">
                                        <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
                                        <p className="text-xl font-bold text-emerald-700">₹{p(cashBookData.revenue.total).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Revenue Report Section */}
                <Card className="border-border/50 bg-gradient-to-br from-violet-500/5 to-violet-500/10">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-violet-600" />
                                <CardTitle className="text-base">Revenue Report</CardTitle>
                            </div>
                            <Select value={revenueRange} onValueChange={setRevenueRange}>
                                <SelectTrigger className="w-40 border-border/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="week">This Week</SelectItem>
                                    <SelectItem value="month">This Month</SelectItem>
                                    <SelectItem value="last_month">Last Month</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {revenueLoading ? (
                            <div className="py-6 text-center">
                                <RefreshCw className="w-5 h-5 text-primary mx-auto mb-2 animate-spin" />
                                <p className="text-sm text-muted-foreground">Loading...</p>
                            </div>
                        ) : revenueData ? (
                            <div className="space-y-4">
                                <div className="text-xs text-muted-foreground text-center">
                                    {formatDate(revenueData.start_date)} — {formatDate(revenueData.end_date)}
                                </div>

                                {/* Revenue Breakdown */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="text-center py-3 px-2 bg-background/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground">DC Deduction</p>
                                        <p className="text-lg font-bold text-violet-600">₹{p(revenueData.revenue.dc_deduction).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-center py-3 px-2 bg-background/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Monthly Interest</p>
                                        <p className="text-lg font-bold text-violet-600">₹{p(revenueData.revenue.monthly_interest).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-center py-3 px-2 bg-background/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground">DL Interest</p>
                                        <p className="text-lg font-bold text-violet-600">₹{p(revenueData.revenue.dl_interest).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-center py-3 px-2 bg-violet-500/20 rounded-lg ring-1 ring-violet-500/30">
                                        <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
                                        <p className="text-xl font-bold text-violet-700">₹{p(revenueData.revenue.total).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/30">
                                    <div className="text-center">
                                        <p className="text-xs text-muted-foreground">Total Collections</p>
                                        <p className="text-sm font-bold text-green-600">₹{p(revenueData.summary.total_collections).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-muted-foreground">Total Loans Given</p>
                                        <p className="text-sm font-bold text-red-600">₹{p(revenueData.summary.total_loans_given).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-muted-foreground">Total Expenses</p>
                                        <p className="text-sm font-bold text-orange-600">₹{p(revenueData.summary.total_expenses).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-4">No revenue data available</p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
