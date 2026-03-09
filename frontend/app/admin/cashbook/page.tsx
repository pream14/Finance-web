'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    BookOpen, Calendar, RefreshCw,
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
        expenses: Array<{ id: number; description: string; amount: string; payment_method: string }>
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
    const [pdfLoading, setPdfLoading] = useState(false)
    const [showCustomDateRange, setShowCustomDateRange] = useState(false)

    const downloadCashBookPdf = async () => {
        try {
            setPdfLoading(true)
            await cashBookApi.downloadPdf(selectedDate)
        } catch (err: any) {
            alert(err.message || 'Failed to download PDF')
        } finally {
            setPdfLoading(false)
        }
    }

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

    // Quick date presets for cashbook
    const setToday = () => setSelectedDate(getToday())

    const setYesterday = () => {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        setSelectedDate(d.toISOString().split('T')[0])
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
                            <h1 className="text-2xl font-bold text-foreground">Daily Cash Book</h1>
                            <p className="text-sm text-muted-foreground">Iruppu & Revenue Tracker</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => fetchCashBookData(selectedDate)} variant="outline" size="icon" title="Refresh">
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

                {/* Date Picker Card */}
                <Card className="border-border/50 mb-6">
                    <CardContent className="py-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm text-muted-foreground mr-1 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" /> Quick:
                            </span>
                            <Button variant="outline" size="sm" onClick={setToday} className="h-8 text-xs">
                                Today
                            </Button>
                            <Button variant="outline" size="sm" onClick={setYesterday} className="h-8 text-xs">
                                Yesterday
                            </Button>
                            <div className="ml-auto flex items-center gap-2">
                                <label className="text-xs font-medium text-muted-foreground">Date</label>
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    max={getToday()}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="border-border/50 h-9 w-40 text-sm"
                                />
                            </div>
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
                            <Button onClick={() => fetchCashBookData(selectedDate)} variant="outline">Retry</Button>
                        </CardContent>
                    </Card>
                ) : cashBookData && (
                    <>
                        {/* Summary Stat Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                                <CardContent className="py-4 px-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs text-muted-foreground">Opening Balance</p>
                                        {!editingBalance && (
                                            <button onClick={() => setEditingBalance(true)} className="text-muted-foreground hover:text-foreground">
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    {editingBalance ? (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Input
                                                type="number"
                                                value={newOpeningBalance}
                                                onChange={(e) => setNewOpeningBalance(e.target.value)}
                                                className="w-24 h-7 text-xs border-border/50"
                                                autoFocus
                                            />
                                            <Button size="sm" onClick={saveOpeningBalance} disabled={savingBalance} className="h-7 px-2 text-xs">
                                                <Save className="w-3 h-3" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => { setEditingBalance(false); setNewOpeningBalance(cashBookData.opening_balance) }} className="h-7 px-2 text-xs">
                                                ✕
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-2xl font-bold text-foreground">₹{p(cashBookData.opening_balance).toLocaleString('en-IN')}</p>
                                    )}
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
                                    {formatDate(selectedDate)}
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
                                                    <td className="py-3 px-4 text-foreground text-muted-foreground italic">Online Expenses (not in cash)</td>
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
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base">New Loans Given</CardTitle>
                                                <CardDescription className="text-xs">
                                                    {cashBookData.details.new_loans.length} loan{cashBookData.details.new_loans.length !== 1 ? 's' : ''} today
                                                </CardDescription>
                                            </div>
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
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base">Expenses</CardTitle>
                                                <CardDescription className="text-xs">
                                                    {cashBookData.details.expenses.length} expense{cashBookData.details.expenses.length !== 1 ? 's' : ''} today
                                                </CardDescription>
                                            </div>
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
                        </div>

                        {/* Today's Revenue */}
                        <Card className="border-border/50 mb-6">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    Today&apos;s Revenue
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
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
                                                <td className="py-3 px-4 text-right font-medium text-foreground">₹{p(cashBookData.revenue.dc_deduction).toLocaleString('en-IN')}</td>
                                            </tr>
                                            <tr className="hover:bg-muted/30 transition-colors bg-muted/10">
                                                <td className="py-3 px-4 text-foreground">Monthly Interest</td>
                                                <td className="py-3 px-4 text-right font-medium text-foreground">₹{p(cashBookData.revenue.monthly_interest).toLocaleString('en-IN')}</td>
                                            </tr>
                                            <tr className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3 px-4 text-foreground">DL Interest</td>
                                                <td className="py-3 px-4 text-right font-medium text-foreground">₹{p(cashBookData.revenue.dl_interest).toLocaleString('en-IN')}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border/50">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-foreground">Total Revenue</span>
                                        <span className="font-bold text-xl text-green-600">₹{p(cashBookData.revenue.total).toLocaleString('en-IN')}</span>
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
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Revenue Report
                            </CardTitle>
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
                                <div className="overflow-x-auto rounded-lg border border-border/50">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/50">
                                                <th className="text-left py-2.5 px-4 font-semibold text-foreground text-xs">Source</th>
                                                <th className="text-right py-2.5 px-4 font-semibold text-foreground text-xs">Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            <tr className="hover:bg-muted/30 transition-colors">
                                                <td className="py-2.5 px-4 text-foreground">DC Deduction</td>
                                                <td className="py-2.5 px-4 text-right font-medium text-foreground">₹{p(revenueData.revenue.dc_deduction).toLocaleString('en-IN')}</td>
                                            </tr>
                                            <tr className="hover:bg-muted/30 transition-colors bg-muted/10">
                                                <td className="py-2.5 px-4 text-foreground">Monthly Interest</td>
                                                <td className="py-2.5 px-4 text-right font-medium text-foreground">₹{p(revenueData.revenue.monthly_interest).toLocaleString('en-IN')}</td>
                                            </tr>
                                            <tr className="hover:bg-muted/30 transition-colors">
                                                <td className="py-2.5 px-4 text-foreground">DL Interest</td>
                                                <td className="py-2.5 px-4 text-right font-medium text-foreground">₹{p(revenueData.revenue.dl_interest).toLocaleString('en-IN')}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-sm font-semibold text-foreground">Total Revenue</span>
                                    <span className="text-base font-bold text-green-600">₹{p(revenueData.revenue.total).toLocaleString('en-IN')}</span>
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
