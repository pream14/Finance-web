'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { reportsApi } from '@/lib/api'
import {
    FileText, Download, FileSpreadsheet, Filter, Calendar,
    IndianRupee, TrendingUp, TrendingDown, ArrowLeft, Loader2,
    MapPin, CreditCard, Receipt, Building2
} from 'lucide-react'

interface ReportSummary {
    period: { start_date: string; end_date: string }
    total_disbursed: string
    total_loans_count: number
    total_collected: string
    total_principal_collected: string
    total_interest_collected: string
    total_transactions: number
    total_expenses: string
    net_income: string
}

interface AreaBreakdown {
    area: string
    customers: number
    loans: number
    total_collected: string
    principal_collected: string
    interest_collected: string
    transactions: number
}

interface LoanBreakdown {
    loan_type: string
    loans: number
    total_collected: string
    principal_collected: string
    interest_collected: string
    transactions: number
}

interface ReportData {
    report_type: string
    filters: {
        start_date: string
        end_date: string
        area: string | null
        loan_type: string | null
    }
    summary: ReportSummary
    breakdown: AreaBreakdown[] | LoanBreakdown[]
    available_areas: string[]
}

const REPORT_TABS = [
    { id: 'summary', label: 'Income Tax Summary', icon: Receipt, description: 'Interest income, expenses & net income' },
    { id: 'area_wise', label: 'Area-wise Report', icon: MapPin, description: 'Collections grouped by customer area' },
    { id: 'loan_wise', label: 'Loan Type Report', icon: CreditCard, description: 'Collections grouped by loan type' },
]

function getFinancialYearRange() {
    const now = new Date()
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    return {
        start: `${year}-04-01`,
        end: `${year + 1}-03-31`,
        label: `FY ${year}-${year + 1}`,
    }
}

export default function ReportsPage() {
    const fy = getFinancialYearRange()
    const [reportType, setReportType] = useState('summary')
    const [startDate, setStartDate] = useState(fy.start)
    const [endDate, setEndDate] = useState(fy.end)
    const [area, setArea] = useState('')
    const [loanType, setLoanType] = useState('')
    const [reportData, setReportData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(false)
    const [downloading, setDownloading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const fetchReport = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await reportsApi.getData({
                start_date: startDate,
                end_date: endDate,
                report_type: reportType,
                ...(area && area !== '_all' ? { area } : {}),
                ...(loanType && loanType !== '_all' ? { loan_type: loanType } : {}),
            })
            setReportData(data)
        } catch (err: any) {
            setError(err.message || 'Failed to load report')
            setReportData(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReport()
    }, [reportType, startDate, endDate, area, loanType])

    const handleDownload = async (format: 'csv' | 'pdf') => {
        setDownloading(format)
        try {
            await reportsApi.download({
                start_date: startDate,
                end_date: endDate,
                report_type: reportType,
                format,
                ...(area && area !== '_all' ? { area } : {}),
                ...(loanType && loanType !== '_all' ? { loan_type: loanType } : {}),
            })
        } catch (err: any) {
            alert('Download failed: ' + (err.message || 'Unknown error'))
        } finally {
            setDownloading(null)
        }
    }

    const setQuickRange = (type: string) => {
        const now = new Date()
        if (type === 'fy') {
            setStartDate(fy.start)
            setEndDate(fy.end)
        } else if (type === 'this_month') {
            const s = new Date(now.getFullYear(), now.getMonth(), 1)
            setStartDate(s.toISOString().split('T')[0])
            setEndDate(now.toISOString().split('T')[0])
        } else if (type === 'last_month') {
            const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const e = new Date(now.getFullYear(), now.getMonth(), 0)
            setStartDate(s.toISOString().split('T')[0])
            setEndDate(e.toISOString().split('T')[0])
        } else if (type === 'last_quarter') {
            const q = Math.floor(now.getMonth() / 3)
            const s = new Date(now.getFullYear(), (q - 1) * 3, 1)
            const e = new Date(now.getFullYear(), q * 3, 0)
            setStartDate(s.toISOString().split('T')[0])
            setEndDate(e.toISOString().split('T')[0])
        } else if (type === 'last_6_months') {
            const s = new Date(now.getFullYear(), now.getMonth() - 6, 1)
            setStartDate(s.toISOString().split('T')[0])
            setEndDate(now.toISOString().split('T')[0])
        }
    }

    const fmt = (val: string | number) => {
        const n = typeof val === 'string' ? parseFloat(val) : val
        if (isNaN(n)) return '₹0'
        return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }

    const s = reportData?.summary

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/admin/dashboard">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <FileText className="w-6 h-6 text-primary" />
                                Reports & Tax Filing
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5">Generate income tax summaries & download reports</p>
                        </div>
                    </div>

                    {/* Download Buttons */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handleDownload('csv')}
                            disabled={!!downloading || !reportData}
                            className="gap-2"
                        >
                            {downloading === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                            CSV
                        </Button>
                        <Button
                            onClick={() => handleDownload('pdf')}
                            disabled={!!downloading || !reportData}
                            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                        >
                            {downloading === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            PDF
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Report Type Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {REPORT_TABS.map((tab) => {
                        const Icon = tab.icon
                        const active = reportType === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setReportType(tab.id)}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${active
                                        ? 'border-primary bg-primary/5 shadow-sm'
                                        : 'border-border/50 hover:border-border bg-card hover:bg-muted/30'
                                    }`}
                            >
                                <div className={`p-2.5 rounded-lg ${active ? 'bg-primary/10' : 'bg-muted'}`}>
                                    <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${active ? 'text-primary' : 'text-foreground'}`}>{tab.label}</p>
                                    <p className="text-xs text-muted-foreground">{tab.description}</p>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Filters */}
                <Card className="mb-6 border-border/50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <CardTitle className="text-base">Filters</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Quick Range Buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 px-3 py-1.5" onClick={() => setQuickRange('fy')}>
                                Financial Year
                            </Badge>
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 px-3 py-1.5" onClick={() => setQuickRange('this_month')}>
                                This Month
                            </Badge>
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 px-3 py-1.5" onClick={() => setQuickRange('last_month')}>
                                Last Month
                            </Badge>
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 px-3 py-1.5" onClick={() => setQuickRange('last_quarter')}>
                                Last Quarter
                            </Badge>
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 px-3 py-1.5" onClick={() => setQuickRange('last_6_months')}>
                                Last 6 Months
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Start Date */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">End Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>
                            </div>

                            {/* Area Filter */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Area</label>
                                <Select value={area || '_all'} onValueChange={(v) => setArea(v === '_all' ? '' : v)}>
                                    <SelectTrigger className="border-border/50">
                                        <SelectValue placeholder="All Areas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_all">All Areas</SelectItem>
                                        {reportData?.available_areas?.map((a) => (
                                            <SelectItem key={a} value={a}>{a}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Loan Type Filter */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Loan Type</label>
                                <Select value={loanType || '_all'} onValueChange={(v) => setLoanType(v === '_all' ? '' : v)}>
                                    <SelectTrigger className="border-border/50">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_all">All Types</SelectItem>
                                        <SelectItem value="DC Loan">DC Loan</SelectItem>
                                        <SelectItem value="Monthly Interest Loan">Monthly Interest Loan</SelectItem>
                                        <SelectItem value="DL Loan">DL Loan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Loading / Error */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="ml-3 text-muted-foreground">Generating report...</span>
                    </div>
                )}

                {error && (
                    <Card className="border-red-500/50 bg-red-500/5 mb-6">
                        <CardContent className="py-6 text-center text-red-600">
                            {error}
                        </CardContent>
                    </Card>
                )}

                {/* Report Data */}
                {!loading && !error && s && (
                    <>
                        {/* Income Tax Summary Cards */}
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" />
                                Income Tax Summary
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                    {s.period.start_date} to {s.period.end_date}
                                </span>
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                {/* Total Disbursed */}
                                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Disbursed</CardTitle>
                                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                                <TrendingDown className="w-4 h-4 text-blue-600" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-xl font-bold text-foreground">{fmt(s.total_disbursed)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{s.total_loans_count} loans</p>
                                    </CardContent>
                                </Card>

                                {/* Total Collected */}
                                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collected</CardTitle>
                                            <div className="p-1.5 bg-green-500/10 rounded-lg">
                                                <TrendingUp className="w-4 h-4 text-green-600" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-xl font-bold text-green-600">{fmt(s.total_collected)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{s.total_transactions} transactions</p>
                                    </CardContent>
                                </Card>

                                {/* Interest Earned */}
                                <Card className="border-amber-500/30 bg-amber-500/5 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">Interest Income</CardTitle>
                                            <div className="p-1.5 bg-amber-500/10 rounded-lg">
                                                <IndianRupee className="w-4 h-4 text-amber-600" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{fmt(s.total_interest_collected)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Taxable income</p>
                                    </CardContent>
                                </Card>

                                {/* Expenses */}
                                <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expenses</CardTitle>
                                            <div className="p-1.5 bg-red-500/10 rounded-lg">
                                                <TrendingDown className="w-4 h-4 text-red-600" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-xl font-bold text-red-600">{fmt(s.total_expenses)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Deductible</p>
                                    </CardContent>
                                </Card>

                                {/* Net Income */}
                                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-xs font-medium text-primary uppercase tracking-wide">Net Income</CardTitle>
                                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                                <TrendingUp className="w-4 h-4 text-primary" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <p className="text-xl font-bold text-primary">{fmt(s.net_income)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Interest − Expenses</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Principal Summary Row */}
                        <Card className="mb-6 border-border/50">
                            <CardContent className="py-4">
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Principal Collected</p>
                                        <p className="text-lg font-bold text-foreground">{fmt(s.total_principal_collected)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Interest Collected</p>
                                        <p className="text-lg font-bold text-foreground">{fmt(s.total_interest_collected)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Breakdown Table */}
                        {reportData && reportData.breakdown.length > 0 && (
                            <Card className="border-border/50">
                                <CardHeader>
                                    <CardTitle className="text-base">
                                        {reportType === 'area_wise' ? 'Area-Wise Breakdown' : 'Loan Type Breakdown'}
                                    </CardTitle>
                                    <CardDescription>
                                        {reportType === 'area_wise'
                                            ? 'Collections grouped by customer area'
                                            : 'Collections grouped by loan type'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="text-left py-3 px-3 font-semibold text-muted-foreground">
                                                        {reportType === 'area_wise' ? 'Area' : 'Loan Type'}
                                                    </th>
                                                    {reportType === 'area_wise' && (
                                                        <th className="text-right py-3 px-3 font-semibold text-muted-foreground">Customers</th>
                                                    )}
                                                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground">Loans</th>
                                                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground">Total Collected</th>
                                                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground">Principal</th>
                                                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground">Interest</th>
                                                    <th className="text-right py-3 px-3 font-semibold text-muted-foreground">Txns</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportType === 'area_wise' &&
                                                    (reportData.breakdown as AreaBreakdown[]).map((row, i) => (
                                                        <tr key={row.area} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>
                                                            <td className="py-3 px-3 font-medium text-foreground">
                                                                <div className="flex items-center gap-2">
                                                                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                                                    {row.area}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3 text-right text-foreground">{row.customers}</td>
                                                            <td className="py-3 px-3 text-right text-foreground">{row.loans}</td>
                                                            <td className="py-3 px-3 text-right font-semibold text-green-600">{fmt(row.total_collected)}</td>
                                                            <td className="py-3 px-3 text-right text-foreground">{fmt(row.principal_collected)}</td>
                                                            <td className="py-3 px-3 text-right text-amber-600 font-medium">{fmt(row.interest_collected)}</td>
                                                            <td className="py-3 px-3 text-right text-muted-foreground">{row.transactions}</td>
                                                        </tr>
                                                    ))}
                                                {reportType === 'loan_wise' &&
                                                    (reportData.breakdown as LoanBreakdown[]).map((row, i) => (
                                                        <tr key={row.loan_type} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>
                                                            <td className="py-3 px-3 font-medium text-foreground">
                                                                <div className="flex items-center gap-2">
                                                                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                                                                    {row.loan_type}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-3 text-right text-foreground">{row.loans}</td>
                                                            <td className="py-3 px-3 text-right font-semibold text-green-600">{fmt(row.total_collected)}</td>
                                                            <td className="py-3 px-3 text-right text-foreground">{fmt(row.principal_collected)}</td>
                                                            <td className="py-3 px-3 text-right text-amber-600 font-medium">{fmt(row.interest_collected)}</td>
                                                            <td className="py-3 px-3 text-right text-muted-foreground">{row.transactions}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* No breakdown data */}
                        {reportData && reportType !== 'summary' && reportData.breakdown.length === 0 && (
                            <Card className="border-border/50">
                                <CardContent className="py-12 text-center">
                                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-muted-foreground">No data found for the selected period and filters</p>
                                    <p className="text-xs text-muted-foreground mt-1">Try adjusting the date range or filters</p>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}
