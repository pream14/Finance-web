'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import {
    BookOpen, Calendar, RefreshCw, Filter,
    Save, Pencil, Download, TrendingUp, TrendingDown, Wallet, Banknote, Menu
} from 'lucide-react'
import { cashBookApi, revenueApi } from '@/lib/api'

interface CashBookData {
    is_range: boolean
    date?: string
    start_date?: string
    end_date?: string
    opening_balance?: string
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
    cash_dc_deduction?: string
    closing_balance?: string
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
        expenses: Array<{ id: number; description: string; amount: string; payment_method: string; created_at?: string }>
        new_loans: Array<{
            id: number
            customer__name: string
            loan_type: string
            principal_amount: string
            payment_method: string
            dc_deduction_amount: string
            created_at?: string
        }>
        incomes: Array<{ id: number; description: string; source: string; amount: string; payment_method: string; created_at?: string }>
    }
    notes?: string
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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Opening balance edit
    const [editingBalance, setEditingBalance] = useState(false)
    const [newOpeningBalance, setNewOpeningBalance] = useState('')
    const [savingBalance, setSavingBalance] = useState(false)

    // PDF
    const [pdfLoading, setPdfLoading] = useState(false)

    const isSingleDay = startDate === endDate

    // Fetch cashbook data (single day or range)
    const fetchCashBookData = async (start: string, end: string) => {
        try {
            setLoading(true)
            setError(null)
            const data = await cashBookApi.get({ start_date: start, end_date: end })
            setCashBookData(data)
            if (!data.is_range && data.opening_balance) {
                setNewOpeningBalance(data.opening_balance)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load cash book data')
        } finally {
            setLoading(false)
        }
    }

    const saveOpeningBalance = async () => {
        try {
            setSavingBalance(true)
            await cashBookApi.saveOpeningBalance({
                date: endDate,
                opening_balance: parseFloat(newOpeningBalance) || 0,
            })
            setEditingBalance(false)
            await fetchCashBookData(startDate, endDate)
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
        fetchCashBookData(start, end)
    }

    const applyCustomRange = () => {
        if (startDate && endDate) {
            setActivePreset('custom')
            fetchCashBookData(startDate, endDate)
        }
    }

    // Initial load
    useEffect(() => {
        fetchCashBookData(today, today)
    }, [])

    const p = (val: string) => parseFloat(val) || 0

    const dateLabel = isSingleDay
        ? formatDate(endDate)
        : `${formatDate(startDate)} — ${formatDate(endDate)}`

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
                        <Button onClick={() => fetchCashBookData(startDate, endDate)} variant="outline" size="icon" title="Refresh">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        {isSingleDay && (
                            <Button
                                onClick={downloadCashBookPdf}
                                disabled={pdfLoading}
                                variant="outline"
                                size="icon"
                                title="Download Cash Book PDF"
                            >
                                <Download className={`w-4 h-4 ${pdfLoading ? 'animate-spin' : ''}`} />
                            </Button>
                        )}
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
                            <Button onClick={() => fetchCashBookData(startDate, endDate)} variant="outline">Retry</Button>
                        </CardContent>
                    </Card>
                ) : cashBookData && (
                    <>
                        {/* ========== SINGLE DAY VIEW ========== */}
                        {!cashBookData.is_range ? (
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
                                                        <Button size="sm" variant="ghost" onClick={() => { setEditingBalance(false); setNewOpeningBalance(cashBookData.opening_balance || '') }} className="h-7 px-2 text-xs">
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xl sm:text-2xl font-bold text-foreground truncate" title={`₹${p(cashBookData.opening_balance || '0').toLocaleString('en-IN')}`}>₹{p(cashBookData.opening_balance || '0').toLocaleString('en-IN')}</p>
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
                                            <p className="text-xl sm:text-2xl font-bold text-green-600 truncate" title={`₹${p(cashBookData.total_collections).toLocaleString('en-IN')}`}>₹{p(cashBookData.total_collections).toLocaleString('en-IN')}</p>
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
                                            <p className="text-xl sm:text-2xl font-bold text-red-600 truncate" title={`₹${p(cashBookData.total_loans_given).toLocaleString('en-IN')}`}>₹{p(cashBookData.total_loans_given).toLocaleString('en-IN')}</p>
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
                                            <p className={`text-xl sm:text-2xl font-bold truncate ${p(cashBookData.closing_balance || '0') >= 0 ? 'text-foreground' : 'text-red-600'}`} title={`₹${p(cashBookData.closing_balance || '0').toLocaleString('en-IN')}`}>
                                                ₹{p(cashBookData.closing_balance || '0').toLocaleString('en-IN')}
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
                                        <CardDescription className="text-xs">{formatDate(endDate)}</CardDescription>
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
                                                        <td className="py-3 px-4 text-right font-medium text-foreground">₹{p(cashBookData.opening_balance || '0').toLocaleString('en-IN')}</td>
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
                                                    {p(cashBookData.cash_dc_deduction || '0') > 0 && (
                                                        <tr className="hover:bg-muted/30 transition-colors bg-muted/10">
                                                            <td className="py-3 px-4 text-foreground">+ DC Deduction (in cash)</td>
                                                            <td className="py-3 px-4 text-right font-medium text-green-600">+₹{p(cashBookData.cash_dc_deduction || '0').toLocaleString('en-IN')}</td>
                                                        </tr>
                                                    )}
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
                                                <span className={`font-bold text-xl ${p(cashBookData.closing_balance || '0') >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                                                    ₹{p(cashBookData.closing_balance || '0').toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            /* ========== DATE RANGE VIEW ========== */
                            <>
                                {/* Range Summary Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
                                        <CardContent className="py-4 px-4">
                                            <div className="flex items-center gap-1 mb-1">
                                                <TrendingUp className="w-3 h-3 text-green-600" />
                                                <p className="text-xs text-muted-foreground">Total Collections</p>
                                            </div>
                                            <p className="text-xl sm:text-2xl font-bold text-green-600 truncate">₹{p(cashBookData.total_collections).toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Cash: ₹{p(cashBookData.cash_collections).toLocaleString('en-IN')} · Online: ₹{p(cashBookData.online_collections).toLocaleString('en-IN')}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-border/50 bg-gradient-to-br from-red-500/5 to-red-500/10">
                                        <CardContent className="py-4 px-4">
                                            <div className="flex items-center gap-1 mb-1">
                                                <TrendingDown className="w-3 h-3 text-red-600" />
                                                <p className="text-xs text-muted-foreground">Total Loans Given</p>
                                            </div>
                                            <p className="text-xl sm:text-2xl font-bold text-red-600 truncate">₹{p(cashBookData.total_loans_given).toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Cash: ₹{p(cashBookData.cash_loans_given).toLocaleString('en-IN')} · Online: ₹{p(cashBookData.online_loans_given).toLocaleString('en-IN')}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
                                        <CardContent className="py-4 px-4">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Banknote className="w-3 h-3 text-amber-600" />
                                                <p className="text-xs text-muted-foreground">Total Expenses</p>
                                            </div>
                                            <p className="text-xl sm:text-2xl font-bold text-amber-600 truncate">₹{p(cashBookData.expenses).toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Cash: ₹{p(cashBookData.cash_expenses).toLocaleString('en-IN')} · Online: ₹{p(cashBookData.online_expenses).toLocaleString('en-IN')}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-purple-500/10">
                                        <CardContent className="py-4 px-4">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Wallet className="w-3 h-3 text-purple-600" />
                                                <p className="text-xs text-muted-foreground">Other Income</p>
                                            </div>
                                            <p className="text-xl sm:text-2xl font-bold text-purple-600 truncate">₹{p(cashBookData.other_income).toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                Cash: ₹{p(cashBookData.cash_income).toLocaleString('en-IN')} · Online: ₹{p(cashBookData.online_income).toLocaleString('en-IN')}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Date range label */}
                                <div className="mb-4">
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {dateLabel}
                                    </p>
                                </div>
                            </>
                        )}

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
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs sticky left-0 z-20 bg-muted/50" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>Customer</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Type</th>
                                                        <th className="text-right py-2.5 px-3 font-semibold text-foreground text-xs">Amount</th>
                                                        <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Method</th>
                                                        {cashBookData.is_range && <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Date</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/30">
                                                    {cashBookData.details.new_loans.map((loan, i) => (
                                                        <tr key={loan.id} className={`hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                                                            <td className="py-2.5 px-3 font-medium text-foreground sticky left-0 z-10 bg-card" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>{loan.customer__name}</td>
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
                                                            {cashBookData.is_range && loan.created_at && (
                                                                <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                                                                    {formatDate(loan.created_at.split('T')[0])}
                                                                </td>
                                                            )}
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
                                                        {cashBookData.is_range && <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Date</th>}
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
                                                            {cashBookData.is_range && expense.created_at && (
                                                                <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                                                                    {formatDate(expense.created_at.split('T')[0])}
                                                                </td>
                                                            )}
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
                                                        {cashBookData.is_range && <th className="text-left py-2.5 px-3 font-semibold text-foreground text-xs">Date</th>}
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
                                                            {cashBookData.is_range && inc.created_at && (
                                                                <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                                                                    {formatDate(inc.created_at.split('T')[0])}
                                                                </td>
                                                            )}
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

                        {/* Revenue Section */}
                        <Card className="border-border/50 mb-6">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    Revenue
                                </CardTitle>
                                <CardDescription className="text-xs">{dateLabel}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
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
                                                {p(cashBookData.revenue.other_income) > 0 && (
                                                    <tr className="hover:bg-muted/30 transition-colors bg-muted/10">
                                                        <td className="py-3 px-4 text-foreground">Other Income</td>
                                                        <td className="py-3 px-4 text-right font-medium text-green-600">₹{p(cashBookData.revenue.other_income).toLocaleString('en-IN')}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-sm font-semibold text-foreground">Total Revenue</span>
                                        <span className="text-base font-bold text-green-600">₹{p(cashBookData.revenue.total).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </main>
        </div>
    )
}
