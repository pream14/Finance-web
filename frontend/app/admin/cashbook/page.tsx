'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    BookOpen, Calendar, RefreshCw, Filter,
    Save, Pencil, Download, TrendingUp, TrendingDown, Wallet, Banknote
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
    cash_expenses: string
    online_expenses: string
    other_income: string
    cash_income: string
    online_income: string
    closing_balance: string
    revenue: {
        dc_deduction: string
        monthly_interest: string
        dl_interest: string
        dc_interest: string
        total_interest_collected: string
        other_income: string
        total: string
    }
    details: {
        expenses: Array<{ id: number; description: string; amount: string; payment_method: string }>
        new_loans: Array<{
            id: number
            customer__name: string
            loan_type: string
            principal_amount: string
            payment_method: string
            dc_deduction_amount: string
        }>
        incomes: Array<{ id: number; description: string; source: string; amount: string; payment_method: string }>
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
        other_income: string
        total: string
    }
    summary: {
        total_collections: string
        total_loans_given: string
        total_expenses: string
        other_income: string
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
    const today = getToday()

    // Unified filter state
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState(today)
    const [activePreset, setActivePreset] = useState('today')

    // Data
    const [cashBookData, setCashBookData] = useState<CashBookData | null>(null)
    const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
    const [loading, setLoading] = useState(true)
    const [revenueLoading, setRevenueLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Opening balance edit
    const [editingBalance, setEditingBalance] = useState(false)
    const [newOpeningBalance, setNewOpeningBalance] = useState('')
    const [savingBalance, setSavingBalance] = useState(false)

    // PDF
    const [pdfLoading, setPdfLoading] = useState(false)

    const isSingleDay = startDate === endDate

    // Fetch cashbook for the end date (latest day in range)
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

    // Fetch revenue for the date range
    const fetchRevenueData = async (start: string, end: string) => {
        try {
            setRevenueLoading(true)
            const data = await revenueApi.get({ start_date: start, end_date: end })
            setRevenueData(data)
        } catch (err: any) {
            console.error('Failed to load revenue data:', err)
        } finally {
            setRevenueLoading(false)
        }
    }

    // Fetch all data for current filter
    const fetchAll = (start: string, end: string) => {
        fetchCashBookData(end) // cashbook always shows the end date
        fetchRevenueData(start, end)
    }

    const saveOpeningBalance = async () => {
        try {
            setSavingBalance(true)
            await cashBookApi.saveOpeningBalance({
                date: endDate,
                opening_balance: parseFloat(newOpeningBalance) || 0,
            })
            setEditingBalance(false)
            await fetchCashBookData(endDate)
        } catch (err: any) {
            alert(err.message || 'Failed to save opening balance')
        } finally {
            setSavingBalance(false)
        }
    }

    const downloadCashBookPdf = async () => {
        try {
            setPdfLoading(true)
            await cashBookApi.downloadPdf(endDate)
        } catch (err: any) {
            alert(err.message || 'Failed to download PDF')
        } finally {
            setPdfLoading(false)
        }
    }

    // Quick presets
    const applyPreset = (preset: string) => {
        const now = new Date()
        let start = '', end = ''

        switch (preset) {
            case 'today':
                start = end = today
                break
            case 'yesterday': {
                const d = new Date(now)
                d.setDate(d.getDate() - 1)
                start = end = d.toISOString().split('T')[0]
                break
            }
            case 'week': {
                const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
                start = weekStart.toISOString().split('T')[0]
                end = today
                break
            }
            case 'month': {
                start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
                end = today
                break
            }
            case 'last_month': {
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
                start = lastMonth.toISOString().split('T')[0]
                end = lastMonthEnd.toISOString().split('T')[0]
                break
            }
        }

        setStartDate(start)
        setEndDate(end)
        setActivePreset(preset)
        fetchAll(start, end)
    }

    const applyCustomRange = () => {
        if (startDate && endDate) {
            setActivePreset('custom')
            fetchAll(startDate, endDate)
        }
    }

    // Initial load
    useEffect(() => {
        fetchAll(today, today)
    }, [])

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
                            <h1 className="text-2xl font-bold text-foreground">Daily Cash Book</h1>
                            <p className="text-sm text-muted-foreground">Cash & Revenue Tracker</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => fetchAll(startDate, endDate)} variant="outline" size="icon" title="Refresh">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            onClick={downloadCashBookPdf}
                            disabled={pdfLoading}
                            variant="outline"
                            size="icon"
                            title="Download Cash Book PDF"
                        >
                            <Download className={`w-4 h-4 ${pdfLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Unified Filter Card */}
                <Card className="border-border/50 mb-6">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-primary" />
                            <CardTitle className="text-base">Filters</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Quick Presets */}
                        <div className="flex flex-wrap gap-2">
                            <span className="text-sm text-muted-foreground mr-1 flex items-center">Quick:</span>
                            {[
                                { key: 'today', label: 'Today' },
                                { key: 'yesterday', label: 'Yesterday' },
                                { key: 'week', label: 'This Week' },
                                { key: 'month', label: 'This Month' },
                                { key: 'last_month', label: 'Last Month' },
                            ].map(({ key, label }) => (
                                <Button
                                    key={key}
                                    variant={activePreset === key ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => applyPreset(key)}
                                    className="h-8 text-xs"
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>

                        {/* Date Range Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    max={today}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border-border/50 h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">End Date</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    max={today}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border-border/50 h-9"
                                />
                            </div>
                            <Button onClick={applyCustomRange} disabled={!startDate || !endDate} className="h-9">
                                Apply
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <Card className="border-border/50">
                        <CardContent className="py-12 text-center">
                            <RefreshCw className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                            <p className="text-muted-foreground">Loading cash book...</p>
                        </CardContent>
                    </Card>
                ) : error ? (
                    <Card className="border-border/50">
                        <CardContent className="py-12 text-center">
                            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground mb-4">{error}</p>
                            <Button onClick={() => fetchAll(startDate, endDate)} variant="outline">Retry</Button>
                        </CardContent>
                    </Card>
                ) : cashBookData && (
                    <>
                        {/* Summary Stat Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {/* Opening Balance with edit */}
                            <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                                <CardContent className="py-4 px-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs text-muted-foreground">Opening Balance</p>
                                        {!editingBalance && (
                                            <button onClick={() => setEditingBalance(true)} className="text-muted-foreground hover:text-foreground transition-colors" title="Edit opening balance">
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    {editingBalance ? (
                                        <div className="space-y-2 mt-1">
                                            <Input
                                                type="number"
                                                value={newOpeningBalance}
                                                onChange={(e) => setNewOpeningBalance(e.target.value)}
                                                className="w-full h-8 text-sm border-border/50"
                                                autoFocus
                                            />
                                            <div className="flex gap-1">
                                                <Button size="sm" onClick={saveOpeningBalance} disabled={savingBalance} className="h-7 px-2 text-xs flex-1">
                                                    <Save className="w-3 h-3 mr-1" />
                                                    {savingBalance ? '...' : 'Save'}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => { setEditingBalance(false); setNewOpeningBalance(cashBookData.opening_balance) }} className="h-7 px-2 text-xs">
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-2xl font-bold text-foreground">₹{p(cashBookData.opening_balance).toLocaleString('en-IN')}</p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(endDate)}</p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
                                <CardContent className="py-4 px-4">
                                    <div className="flex items-center gap-1 mb-1">
                                        <TrendingUp className="w-3 h-3 text-green-600" />
                                        <p className="text-xs text-muted-foreground">Collections</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-600">₹{p(cashBookData.total_collections).toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Cash: ₹{p(cashBookData.cash_collections).toLocaleString('en-IN')} · Online: ₹{p(cashBookData.online_collections).toLocaleString('en-IN')}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-red-500/5 to-red-500/10">
                                <CardContent className="py-4 px-4">
                                    <div className="flex items-center gap-1 mb-1">
                                        <TrendingDown className="w-3 h-3 text-red-600" />
                                        <p className="text-xs text-muted-foreground">Loans Given</p>
                                    </div>
                                    <p className="text-2xl font-bold text-red-600">₹{p(cashBookData.total_loans_given).toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Cash: ₹{p(cashBookData.cash_loans_given).toLocaleString('en-IN')} · Online: ₹{p(cashBookData.online_loans_given).toLocaleString('en-IN')}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
                                <CardContent className="py-4 px-4">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Wallet className="w-3 h-3 text-amber-600" />
                                        <p className="text-xs text-muted-foreground">Closing Balance</p>
                                    </div>
                                    <p className={`text-2xl font-bold ${p(cashBookData.closing_balance) >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                                        ₹{p(cashBookData.closing_balance).toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Cash Exp: ₹{p(cashBookData.cash_expenses).toLocaleString('en-IN')}
                                        {p(cashBookData.online_expenses) > 0 && ` · Online Exp: ₹${p(cashBookData.online_expenses).toLocaleString('en-IN')}`}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Cash Flow Table */}
                        <Card className="border-border/50 mb-6">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-primary" />
                                    Cash Flow
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {formatDate(endDate)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto rounded-lg border border-border/50">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/50">
                                                <th className="text-left py-3 px-4 font-semibold text-foreground">Item</th>
                                                <th className="text-right py-3 px-4 font-semibold text-foreground">Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            <tr className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4 text-foreground">Opening Balance</td>
                                                <td className="py-3 px-4 text-right font-medium text-foreground">₹{p(cashBookData.opening_balance).toLocaleString('en-IN')}</td>
                                            </tr>
                                            <tr className="hover:bg-muted/30 transition-colors bg-muted/10">
                                                <td className="py-3 px-4 text-foreground">+ Cash Collections</td>
                                                <td className="py-3 px-4 text-right font-medium text-green-600">+₹{p(cashBookData.cash_collections).toLocaleString('en-IN')}</td>
                                            </tr>
                                            {p(cashBookData.cash_income) > 0 && (
                                                <tr className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-3 px-4 text-foreground">+ Cash Income (Other)</td>
                                                    <td className="py-3 px-4 text-right font-medium text-green-600">+₹{p(cashBookData.cash_income).toLocaleString('en-IN')}</td>
                                                </tr>
                                            )}
                                            <tr className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4 text-foreground">− Cash Loans Given</td>
                                                <td className="py-3 px-4 text-right font-medium text-red-600">-₹{p(cashBookData.cash_loans_given).toLocaleString('en-IN')}</td>
                                            </tr>
                                            <tr className="hover:bg-muted/30 transition-colors bg-muted/10">
                                                <td className="py-3 px-4 text-foreground">− Cash Expenses</td>
                                                <td className="py-3 px-4 text-right font-medium text-red-600">-₹{p(cashBookData.cash_expenses).toLocaleString('en-IN')}</td>
                                            </tr>
                                            {p(cashBookData.online_expenses) > 0 && (
                                                <tr className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-3 px-4 text-muted-foreground italic">Online Expenses (not in cash)</td>
                                                    <td className="py-3 px-4 text-right font-medium text-muted-foreground">₹{p(cashBookData.online_expenses).toLocaleString('en-IN')}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border/50">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-foreground">= Closing Cash in Hand</span>
                                        <span className={`font-bold text-xl ${p(cashBookData.closing_balance) >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                                            ₹{p(cashBookData.closing_balance).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Details: Loans & Expenses side by side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* New Loans Given */}
                            {cashBookData.details.new_loans.length > 0 && (
                                <Card className="border-border/50">
                                    <CardHeader className="pb-3">
                                        <div>
                                            <CardTitle className="text-base">New Loans Given</CardTitle>
                                            <CardDescription className="text-xs">
                                                {cashBookData.details.new_loans.length} loan{cashBookData.details.new_loans.length !== 1 ? 's' : ''}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto rounded-lg border border-border/50">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-muted/50">
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Customer</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Type</th>
                                                        <th className="text-right py-2.5 px-3 font-semibold text-foreground text-xs">Amount</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Method</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/30">
                                                    {cashBookData.details.new_loans.map((loan, i) => (
                                                        <tr key={loan.id} className={`hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                                                            <td className="py-2.5 px-3 font-medium text-foreground">{loan.customer__name}</td>
                                                            <td className="py-2.5 px-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${loan.loan_type === 'DC Loan'
                                                                    ? 'bg-blue-500/20 text-blue-600'
                                                                    : loan.loan_type === 'Monthly Interest Loan'
                                                                        ? 'bg-green-500/20 text-green-600'
                                                                        : 'bg-purple-500/20 text-purple-600'
                                                                    }`}>
                                                                    {loan.loan_type}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-bold text-foreground whitespace-nowrap">
                                                                ₹{p(loan.principal_amount).toLocaleString('en-IN')}
                                                                {loan.loan_type === 'DC Loan' && p(loan.dc_deduction_amount) > 0 && (
                                                                    <span className="block text-[10px] text-muted-foreground font-normal">-₹{p(loan.dc_deduction_amount).toLocaleString('en-IN')} ded.</span>
                                                                )}
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/20 text-secondary-foreground capitalize">
                                                                    {loan.payment_method}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Expenses */}
                            {cashBookData.details.expenses.length > 0 && (
                                <Card className="border-border/50">
                                    <CardHeader className="pb-3">
                                        <div>
                                            <CardTitle className="text-base">Expenses</CardTitle>
                                            <CardDescription className="text-xs">
                                                {cashBookData.details.expenses.length} expense{cashBookData.details.expenses.length !== 1 ? 's' : ''}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto rounded-lg border border-border/50">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-muted/50">
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Description</th>
                                                        <th className="text-right py-2.5 px-3 font-semibold text-foreground text-xs">Amount</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Method</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/30">
                                                    {cashBookData.details.expenses.map((expense, i) => (
                                                        <tr key={expense.id} className={`hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                                                            <td className="py-2.5 px-3 text-foreground">{expense.description}</td>
                                                            <td className="py-2.5 px-3 text-right font-bold text-red-600 whitespace-nowrap">₹{p(expense.amount).toLocaleString('en-IN')}</td>
                                                            <td className="py-2.5 px-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${expense.payment_method === 'cash' ? 'bg-amber-500/20 text-amber-600' : 'bg-purple-500/20 text-purple-600'
                                                                    }`}>
                                                                    {expense.payment_method}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                                            <span className="text-sm font-semibold text-foreground">Total</span>
                                            <span className="text-sm font-bold text-red-600">₹{p(cashBookData.expenses).toLocaleString('en-IN')}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Other Income */}
                            {cashBookData.details.incomes && cashBookData.details.incomes.length > 0 && (
                                <Card className="border-border/50">
                                    <CardHeader className="pb-3">
                                        <div>
                                            <CardTitle className="text-base">Other Income</CardTitle>
                                            <CardDescription className="text-xs">
                                                {cashBookData.details.incomes.length} entr{cashBookData.details.incomes.length !== 1 ? 'ies' : 'y'}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto rounded-lg border border-border/50">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-muted/50">
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Source</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Description</th>
                                                        <th className="text-right py-2.5 px-3 font-semibold text-foreground text-xs">Amount</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Method</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/30">
                                                    {cashBookData.details.incomes.map((inc, i) => (
                                                        <tr key={inc.id} className={`hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                                                            <td className="py-2.5 px-3 font-medium text-foreground">{inc.source}</td>
                                                            <td className="py-2.5 px-3 text-foreground">{inc.description || '—'}</td>
                                                            <td className="py-2.5 px-3 text-right font-bold text-green-600 whitespace-nowrap">+₹{p(inc.amount).toLocaleString('en-IN')}</td>
                                                            <td className="py-2.5 px-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${inc.payment_method === 'cash' ? 'bg-amber-500/20 text-amber-600' : 'bg-purple-500/20 text-purple-600'}`}>
                                                                    {inc.payment_method}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
                                            <span className="text-sm font-semibold text-foreground">Total</span>
                                            <span className="text-sm font-bold text-green-600">+₹{p(cashBookData.other_income).toLocaleString('en-IN')}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Revenue Section — uses same filter range */}
                        <Card className="border-border/50 mb-6">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    Revenue
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {isSingleDay ? formatDate(endDate) : `${formatDate(startDate)} — ${formatDate(endDate)}`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {revenueLoading ? (
                                    <div className="py-8 text-center">
                                        <RefreshCw className="w-5 h-5 text-muted-foreground mx-auto mb-2 animate-spin" />
                                        <p className="text-xs text-muted-foreground">Loading...</p>
                                    </div>
                                ) : revenueData ? (
                                    <div className="space-y-4">
                                        {/* Revenue Breakdown Table */}
                                        <div className="overflow-x-auto rounded-lg border border-border/50">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-muted/50">
                                                        <th className="text-left py-3 px-4 font-semibold text-foreground">Source</th>
                                                        <th className="text-right py-3 px-4 font-semibold text-foreground">Amount (₹)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/30">
                                                    <tr className="hover:bg-muted/30 transition-colors">
                                                        <td className="py-3 px-4 text-foreground">DC Deduction</td>
                                                        <td className="py-3 px-4 text-right font-medium text-foreground">₹{p(revenueData.revenue.dc_deduction).toLocaleString('en-IN')}</td>
                                                    </tr>
                                                    <tr className="hover:bg-muted/30 transition-colors bg-muted/10">
                                                        <td className="py-3 px-4 text-foreground">Monthly Interest</td>
                                                        <td className="py-3 px-4 text-right font-medium text-foreground">₹{p(revenueData.revenue.monthly_interest).toLocaleString('en-IN')}</td>
                                                    </tr>
                                                    <tr className="hover:bg-muted/30 transition-colors">
                                                        <td className="py-3 px-4 text-foreground">DL Interest</td>
                                                        <td className="py-3 px-4 text-right font-medium text-foreground">₹{p(revenueData.revenue.dl_interest).toLocaleString('en-IN')}</td>
                                                    </tr>
                                                    {p(revenueData.revenue.other_income) > 0 && (
                                                        <tr className="hover:bg-muted/30 transition-colors bg-muted/10">
                                                            <td className="py-3 px-4 text-foreground">Other Income</td>
                                                            <td className="py-3 px-4 text-right font-medium text-green-600">₹{p(revenueData.revenue.other_income).toLocaleString('en-IN')}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="text-sm font-semibold text-foreground">Total Revenue</span>
                                            <span className="text-base font-bold text-green-600">₹{p(revenueData.revenue.total).toLocaleString('en-IN')}</span>
                                        </div>

                                        {/* Period Summary */}
                                        <div className="pt-3 border-t border-border">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Other Income</p>
                                                    <p className="text-sm font-semibold text-green-600">₹{p(revenueData.summary.other_income).toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">No revenue data available</p>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </main>
        </div>
    )
}
