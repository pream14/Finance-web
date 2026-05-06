'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { ArrowLeft, User, Phone, MapPin, Wallet, Calendar, RefreshCw, Download, Menu, AlertTriangle, XCircle, Edit2, Trash2, X, Check } from 'lucide-react'
import { customersApi, loansApi, transactionsApi, customerReportApi, authApi } from '@/lib/api'

interface Loan {
    id: number
    loan_type: 'DC Loan' | 'Monthly Interest Loan' | 'DL Loan'
    principal_amount: number
    remaining_amount: number
    start_date: string
    status: 'active' | 'settled' | 'closed'
    payment_method: 'cash' | 'online'
    monthly_interest_rate?: number
    daily_interest_rate?: number
    daily_collection_amount?: number
    expected_total_days?: number
    interest_cycle_day?: number
    pending_interest?: number
    total_pending_interest?: number
    expected_interest?: number
    closed_at?: string
    closure_note?: string
}

interface Customer {
    id: number
    name: string
    email?: string
    phone: string
    alternate_phone?: string
    city: string
    address: string
    loans: Loan[]
    created_at: string
}

interface Transaction {
    id: number
    loan: number
    loan_type: string
    customer_id: number
    customer_name: string
    amount: number
    asal_amount: number
    interest_amount: number
    payment_method: string
    description: string
    collected_by_name: string
    created_at: string
    updated_at?: string
    last_edited_by_name?: string
}

export default function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const customerId = parseInt(resolvedParams.id)

    const [customer, setCustomer] = useState<Customer | null>(null)
    const [loans, setLoans] = useState<Loan[]>([])
    const [entries, setEntries] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [entriesLoading, setEntriesLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null)
    const [loanStatusFilter, setLoanStatusFilter] = useState<'active' | 'settled' | 'closed' | 'all'>('active')

    // Close loan state
    const [showCloseDialog, setShowCloseDialog] = useState(false)
    const [closingLoanId, setClosingLoanId] = useState<number | null>(null)
    const [closeFinalAmount, setCloseFinalAmount] = useState('')
    const [closePaymentMethod, setClosePaymentMethod] = useState('cash')
    const [closeNote, setCloseNote] = useState('')
    const [closeLoading, setCloseLoading] = useState(false)

    // Current user for owner check
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Admin edit entry state
    const [editingEntry, setEditingEntry] = useState<Transaction | null>(null)
    const [editAmount, setEditAmount] = useState('')
    const [editAsalAmount, setEditAsalAmount] = useState('')
    const [editInterestAmount, setEditInterestAmount] = useState('')
    const [editPaymentMethod, setEditPaymentMethod] = useState('cash')
    const [editLoading, setEditLoading] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Admin edit loan state
    const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
    const [editLoanPrincipal, setEditLoanPrincipal] = useState('')
    const [editLoanRate, setEditLoanRate] = useState('')
    const [editLoanCycleDay, setEditLoanCycleDay] = useState('')
    const [editLoanDailyAmount, setEditLoanDailyAmount] = useState('')
    const [editLoanStartDate, setEditLoanStartDate] = useState('')
    const [editLoanLoading, setEditLoanLoading] = useState(false)
    const [deleteLoanConfirmId, setDeleteLoanConfirmId] = useState<number | null>(null)
    const [deleteLoanLoading, setDeleteLoanLoading] = useState(false)

    // Fetch customer data
    const fetchCustomerData = async () => {
        try {
            setLoading(true)
            setError(null)

            // Fetch customer details
            const customerData = await customersApi.getById(customerId)
            setCustomer({
                id: customerData.id,
                name: customerData.name,
                email: customerData.email || '',
                phone: customerData.phone_number || customerData.phone || '',
                alternate_phone: customerData.alternate_phone || '',
                city: customerData.area || customerData.city || '',
                address: customerData.address || '',
                loans: [],
                created_at: customerData.created_at || '',
            })

            // Fetch customer's loans
            const loansData = await loansApi.getAll({ customer_id: customerId })
            const parsedLoans = Array.isArray(loansData) ? loansData.map((loan: any) => ({
                id: loan.id,
                loan_type: loan.loan_type,
                principal_amount: parseFloat(loan.principal_amount || 0),
                remaining_amount: parseFloat(loan.remaining_amount || 0),
                start_date: loan.start_date || '',
                status: loan.status || 'active',
                payment_method: loan.payment_method || 'cash',
                monthly_interest_rate: loan.monthly_interest_rate ? parseFloat(loan.monthly_interest_rate) : undefined,
                daily_interest_rate: loan.daily_interest_rate ? parseFloat(loan.daily_interest_rate) : undefined,
                daily_collection_amount: loan.daily_collection_amount ? parseFloat(loan.daily_collection_amount) : undefined,
                expected_total_days: loan.expected_total_days ? parseInt(loan.expected_total_days) : undefined,
                interest_cycle_day: loan.interest_cycle_day ? parseInt(loan.interest_cycle_day) : undefined,
                pending_interest: loan.pending_interest ? parseFloat(loan.pending_interest) : 0,
                total_pending_interest: loan.total_pending_interest ? parseFloat(loan.total_pending_interest) : 0,
                expected_interest: loan.expected_interest ? parseFloat(loan.expected_interest) : 0,
            })) : []
            setLoans(parsedLoans)

            // Auto-select first loan and fetch its entries
            if (parsedLoans.length > 0) {
                setSelectedLoanId(parsedLoans[0].id)
                await fetchEntries(parsedLoans[0].id)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load customer data')
        } finally {
            setLoading(false)
        }
    }

    // Fetch entries (transactions) for this customer
    const fetchEntries = async (loanId?: number) => {
        try {
            setEntriesLoading(true)
            const params: { customer_id: number; loan_id?: number } = { customer_id: customerId }
            if (loanId) {
                params.loan_id = loanId
            }
            const data = await transactionsApi.getAll(params)
            setEntries(Array.isArray(data) ? data : [])
        } catch (err: any) {
            console.error('Failed to fetch entries:', err)
            setEntries([])
        } finally {
            setEntriesLoading(false)
        }
    }

    useEffect(() => {
        if (customerId) {
            fetchCustomerData()
        }
        authApi.getCurrentUser().then(user => setCurrentUser(user))
    }, [customerId])

    const isOwner = currentUser?.role === 'owner' || currentUser?.role === 'admin'

    // Handle loan card click - switch to selected loan
    const handleLoanClick = (loanId: number) => {
        if (selectedLoanId !== loanId) {
            setSelectedLoanId(loanId)
            fetchEntries(loanId)
        }
    }

    // Handle close loan
    const handleOpenCloseDialog = (loanId: number) => {
        setClosingLoanId(loanId)
        setCloseFinalAmount('')
        setClosePaymentMethod('cash')
        setCloseNote('')
        setShowCloseDialog(true)
    }

    const handleCloseLoan = async () => {
        if (!closingLoanId) return
        try {
            setCloseLoading(true)
            const data: any = {}
            if (closeNote.trim()) data.closure_note = closeNote.trim()
            if (closeFinalAmount && parseFloat(closeFinalAmount) > 0) {
                data.final_amount = parseFloat(closeFinalAmount)
                data.payment_method = closePaymentMethod
            }
            await loansApi.closeLoan(closingLoanId, data)
            setShowCloseDialog(false)
            setClosingLoanId(null)
            await fetchCustomerData()
        } catch (err: any) {
            alert(err.message || 'Failed to close loan')
        } finally {
            setCloseLoading(false)
        }
    }

    // Get selected loan details for display
    const selectedLoan = selectedLoanId ? loans.find(l => l.id === selectedLoanId) : null
    const closingLoan = closingLoanId ? loans.find(l => l.id === closingLoanId) : null

    // Calculate totals
    const totalAmount = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const totalPrincipal = entries.reduce((sum, e) => sum + Number(e.asal_amount || 0), 0)
    const totalInterest = entries.reduce((sum, e) => sum + Number(e.interest_amount || 0), 0)
    const totalLoanAmount = loans.reduce((sum, l) => sum + l.principal_amount, 0)
    const totalBalance = loans.reduce((sum, l) => sum + l.remaining_amount, 0)
    const activeLoansCount = loans.filter(l => l.status === 'active').length

    // Refresh only loan data (remaining_amount, status, etc.) without resetting selection
    const refreshLoans = async () => {
        try {
            const loansData = await loansApi.getAll({ customer_id: customerId })
            const parsedLoans = Array.isArray(loansData) ? loansData.map((loan: any) => ({
                id: loan.id,
                loan_type: loan.loan_type,
                principal_amount: parseFloat(loan.principal_amount || 0),
                remaining_amount: parseFloat(loan.remaining_amount || 0),
                start_date: loan.start_date || '',
                status: loan.status || 'active',
                payment_method: loan.payment_method || 'cash',
                monthly_interest_rate: loan.monthly_interest_rate ? parseFloat(loan.monthly_interest_rate) : undefined,
                daily_interest_rate: loan.daily_interest_rate ? parseFloat(loan.daily_interest_rate) : undefined,
                daily_collection_amount: loan.daily_collection_amount ? parseFloat(loan.daily_collection_amount) : undefined,
                expected_total_days: loan.expected_total_days ? parseInt(loan.expected_total_days) : undefined,
                interest_cycle_day: loan.interest_cycle_day ? parseInt(loan.interest_cycle_day) : undefined,
                pending_interest: loan.pending_interest ? parseFloat(loan.pending_interest) : 0,
                total_pending_interest: loan.total_pending_interest ? parseFloat(loan.total_pending_interest) : 0,
                expected_interest: loan.expected_interest ? parseFloat(loan.expected_interest) : 0,
            })) : []
            setLoans(parsedLoans)
        } catch (err) {
            console.error('Failed to refresh loans:', err)
        }
    }

    // --- Admin handlers for entry edit/delete ---
    const handleEditEntry = (entry: Transaction) => {
        setEditingEntry(entry)
        setEditAmount(String(entry.amount || 0))
        setEditAsalAmount(String(entry.asal_amount || 0))
        setEditInterestAmount(String(entry.interest_amount || 0))
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
            // Refresh entries and loans sequentially to show updated balance
            if (selectedLoanId) await fetchEntries(selectedLoanId)
            await refreshLoans()
        } catch (err: any) {
            alert(err.message || 'Failed to update entry')
        } finally {
            setEditLoading(false)
        }
    }

    const handleDeleteEntry = async (id: number) => {
        try {
            setDeleteLoading(true)
            await transactionsApi.delete(id)
            setDeleteConfirmId(null)
            // Refresh entries and loans sequentially to show updated balance
            if (selectedLoanId) await fetchEntries(selectedLoanId)
            await refreshLoans()
        } catch (err: any) {
            alert(err.message || 'Failed to delete entry')
        } finally {
            setDeleteLoading(false)
        }
    }

    // --- Admin handlers for loan edit/delete ---
    const handleEditLoan = (loan: Loan) => {
        setEditingLoan(loan)
        setEditLoanPrincipal(String(loan.principal_amount))
        setEditLoanRate(String(loan.monthly_interest_rate || loan.daily_interest_rate || ''))
        setEditLoanCycleDay(String(loan.interest_cycle_day || ''))
        setEditLoanDailyAmount(String(loan.daily_collection_amount || ''))
        setEditLoanStartDate(loan.start_date || '')
    }

    const handleSaveLoanEdit = async () => {
        if (!editingLoan) return
        try {
            setEditLoanLoading(true)
            const data: any = {
                principal_amount: parseFloat(editLoanPrincipal),
            }
            if (editLoanStartDate) data.start_date = editLoanStartDate
            if (editingLoan.loan_type === 'Monthly Interest Loan') {
                if (editLoanRate) data.monthly_interest_rate = parseFloat(editLoanRate)
                if (editLoanCycleDay) data.interest_cycle_day = parseInt(editLoanCycleDay)
            } else if (editingLoan.loan_type === 'DC Loan') {
                if (editLoanDailyAmount) data.daily_collection_amount = parseFloat(editLoanDailyAmount)
            } else if (editingLoan.loan_type === 'DL Loan') {
                if (editLoanRate) data.daily_interest_rate = parseFloat(editLoanRate)
            }
            await loansApi.update(editingLoan.id, data)
            setEditingLoan(null)
            fetchCustomerData()
        } catch (err: any) {
            alert(err.message || 'Failed to update loan')
        } finally {
            setEditLoanLoading(false)
        }
    }

    const handleDeleteLoan = async (id: number) => {
        try {
            setDeleteLoanLoading(true)
            await loansApi.delete(id)
            setDeleteLoanConfirmId(null)
            fetchCustomerData()
        } catch (err: any) {
            alert(err.message || 'Failed to delete loan')
        } finally {
            setDeleteLoanLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                    <p className="text-muted-foreground">Loading customer details...</p>
                </div>
            </div>
        )
    }

    if (error || !customer) {
        return (
            <div className="min-h-screen bg-background">
                <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
                        <h1 className="text-lg font-semibold text-foreground">Customer Not Found</h1>
                    </div>
                </header>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Card className="border-border/50">
                        <CardContent className="py-12 text-center">
                            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-muted-foreground">{error || 'Customer not found'}</p>
                            <Button asChild className="mt-4">
                                <Link href="/admin/customers">Back to Customers</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <User className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
                                <p className="text-sm text-muted-foreground">{customer.city}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => fetchCustomerData()} variant="outline" size="icon" title="Refresh">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            onClick={() => customerReportApi.download(customer.id, customer.name, selectedLoan?.id)}
                            variant="outline"
                            size="sm"
                            title="Download Customer Report"
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                        <div className="hidden md:block">
                            <Button asChild>
                                <Link href="/collections">Add Collection</Link>
                            </Button>
                        </div>
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
                {/* Customer Info Card */}
                <Card className="border-border/50 mb-6">
                    <CardContent className="py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Phone</p>
                                    <p className="text-sm font-medium text-foreground">{customer.phone || 'N/A'}</p>
                                    {customer.alternate_phone && (
                                        <p className="text-xs text-muted-foreground mt-0.5">Alt: {customer.alternate_phone}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Address</p>
                                    <p className="text-sm font-medium text-foreground">{customer.address || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Active Loans</p>
                                    <p className="text-sm font-medium text-foreground">{activeLoansCount}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Created</p>
                                    <p className="text-sm font-medium text-foreground">
                                        {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-IN') : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <Card className="border-border/50 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                        <CardContent className="py-4 px-4">
                            <p className="text-xs text-muted-foreground mb-1">Total Loan</p>
                            <p className="text-xl font-bold text-foreground">₹{totalLoanAmount.toLocaleString('en-IN')}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-gradient-to-br from-orange-500/5 to-orange-500/10">
                        <CardContent className="py-4 px-4">
                            <p className="text-xs text-muted-foreground mb-1">Balance</p>
                            <p className="text-xl font-bold text-orange-600">₹{totalBalance.toLocaleString('en-IN')}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
                        <CardContent className="py-4 px-4">
                            <p className="text-xs text-muted-foreground mb-1">Total Collected</p>
                            <p className="text-xl font-bold text-green-600">₹{totalAmount.toLocaleString('en-IN')}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 bg-gradient-to-br from-purple-500/5 to-purple-500/10">
                        <CardContent className="py-4 px-4">
                            <p className="text-xs text-muted-foreground mb-1">Entries</p>
                            <p className="text-xl font-bold text-foreground">{entries.length}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Loans Section - Clickable to filter entries */}
                {loans.length > 0 && (
                    <Card className="border-border/50 mb-6">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">Loans</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1">Click a loan to filter entries</p>
                                </div>
                                <div className="flex gap-1">
                                    {(['active', 'settled', 'closed'] as const).map(st => (
                                        <button
                                            key={st}
                                            onClick={() => setLoanStatusFilter(st)}
                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${loanStatusFilter === st
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                }`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {loans.filter(loan => loanStatusFilter === 'all' || loan.status === loanStatusFilter).map(loan => (
                                    <div
                                        key={loan.id}
                                        onClick={() => handleLoanClick(loan.id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedLoanId === loan.id
                                            ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                                            : loan.status === 'active'
                                                ? 'border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-primary/5'
                                                : 'border-border/30 bg-muted/10 hover:border-primary/50 hover:bg-primary/5'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${loan.loan_type === 'DC Loan'
                                                ? 'bg-blue-500/20 text-blue-600'
                                                : loan.loan_type === 'Monthly Interest Loan'
                                                    ? 'bg-green-500/20 text-green-600'
                                                    : 'bg-purple-500/20 text-purple-600'
                                                }`}>
                                                {loan.loan_type}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${loan.status === 'active' ? 'bg-green-500/20 text-green-600' :
                                                loan.status === 'settled' ? 'bg-gray-500/20 text-gray-600' :
                                                loan.status === 'closed' ? 'bg-red-500/20 text-red-600' :
                                                    'bg-orange-500/20 text-orange-600'
                                                }`}>
                                                {loan.status === 'closed' ? '✕ Closed' : loan.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Principal</span>
                                                <span className="font-medium text-foreground">₹{loan.principal_amount.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Payment Method</span>
                                                <span className={`font-medium ${loan.payment_method === 'cash' ? 'text-green-600' : 'text-blue-600'}`}>
                                                    {loan.payment_method === 'cash' ? 'Cash' : 'Online'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Balance</span>
                                                <span className="font-medium text-primary">₹{loan.remaining_amount.toLocaleString('en-IN')}</span>
                                            </div>
                                            {loan.loan_type === 'Monthly Interest Loan' && loan.monthly_interest_rate && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Interest Rate</span>
                                                    <span className="text-green-600 font-medium">{loan.monthly_interest_rate}% / month</span>
                                                </div>
                                            )}
                                            {loan.loan_type === 'Monthly Interest Loan' && loan.interest_cycle_day && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Cycle Day</span>
                                                    <span className="text-blue-600 font-medium">{loan.interest_cycle_day}{loan.interest_cycle_day === 1 ? 'st' : loan.interest_cycle_day === 2 ? 'nd' : loan.interest_cycle_day === 3 ? 'rd' : 'th'} of every month</span>
                                                </div>
                                            )}
                                            {loan.loan_type === 'Monthly Interest Loan' && loan.status === 'active' && (
                                                <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                                                    {(loan.total_pending_interest || 0) === 0 && (loan.pending_interest || 0) >= 0 ? (
                                                        <div className="flex justify-between text-xs font-bold">
                                                            <span className="text-green-600">Interest Paid ✓</span>
                                                            <span className="text-green-600">₹0</span>
                                                        </div>
                                                    ) : (loan.total_pending_interest || 0) === 0 && (loan.pending_interest || 0) < 0 ? (
                                                        // Advance credit: pending_interest is negative, total shows 0 (clamped)
                                                        <div className="flex justify-between text-xs font-bold">
                                                            <span className="text-green-600">Interest Paid ✓</span>
                                                            <span className="text-blue-600">₹{Math.abs(loan.pending_interest || 0).toLocaleString('en-IN')} advance</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {(loan.expected_interest || 0) > 0 && (
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-muted-foreground">Current Month Interest</span>
                                                                    <span className="text-foreground font-medium">₹{(loan.expected_interest || 0).toLocaleString('en-IN')}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between text-xs font-bold">
                                                                <span className="text-red-600">Total Interest Due</span>
                                                                <span className="text-red-600">₹{(loan.total_pending_interest || 0).toLocaleString('en-IN')}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            {loan.loan_type === 'DL Loan' && loan.daily_interest_rate && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Interest Rate</span>
                                                    <span className="text-purple-600 font-medium">{loan.daily_interest_rate}% / day</span>
                                                </div>
                                            )}
                                            {loan.loan_type === 'DC Loan' && loan.start_date && loan.expected_total_days && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">End Date</span>
                                                    <span className="text-blue-600 font-medium">
                                                        {new Date(new Date(loan.start_date).getTime() + loan.expected_total_days * 86400000).toLocaleDateString('en-IN')}
                                                    </span>
                                                </div>
                                            )}
                                            {loan.loan_type === 'DC Loan' && (loan as any).dc_deduction_amount > 0 && (
                                                <>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">Deduction</span>
                                                        <span className="text-orange-600 font-medium">₹{Number((loan as any).dc_deduction_amount || 0).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">Given to Customer</span>
                                                        <span className="text-green-600 font-medium">₹{Number((loan as any).amount_given_to_customer || loan.principal_amount).toLocaleString('en-IN')}</span>
                                                    </div>
                                                </>
                                            )}
                                            {loan.start_date && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Started</span>
                                                    <span className="text-muted-foreground">{new Date(loan.start_date).toLocaleDateString('en-IN')}</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Closure metadata for closed loans */}
                                        {loan.status === 'closed' && (
                                            <div className="mt-2 pt-2 border-t border-red-500/30 space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Closed On</span>
                                                    <span className="text-red-600 font-medium">
                                                        {loan.closed_at ? new Date(loan.closed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                                    </span>
                                                </div>
                                                {loan.remaining_amount > 0 && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">Written Off</span>
                                                        <span className="text-red-600 font-medium">₹{loan.remaining_amount.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                                {loan.closure_note && (
                                                    <p className="text-xs text-muted-foreground italic mt-1">Note: {loan.closure_note}</p>
                                                )}
                                            </div>
                                        )}
                                        {/* Close Loan button for selected active loans */}
                                        {selectedLoanId === loan.id && loan.status === 'active' && (
                                            <div className="mt-2 pt-2 border-t border-primary/30 text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenCloseDialog(loan.id) }}
                                                    className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Close Loan
                                                </button>
                                            </div>
                                        )}
                                        {/* Admin Edit/Delete Loan buttons */}
                                        {isOwner && selectedLoanId === loan.id && (
                                            <div className="mt-2 pt-2 border-t border-border/30 flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditLoan(loan) }}
                                                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/30 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Edit2 className="w-3 h-3" /> Edit Loan
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteLoanConfirmId(loan.id) }}
                                                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Trash2 className="w-3 h-3" /> Delete Loan
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Collection Entries */}
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <div>
                            <CardTitle className="text-base">
                                {selectedLoan ? `${selectedLoan.loan_type} Entries` : 'Collection Entries'}
                            </CardTitle>
                            <CardDescription>
                                {entries.length} entries
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {entriesLoading ? (
                            <div className="py-12 text-center">
                                <RefreshCw className="w-6 h-6 text-primary mx-auto mb-2 animate-spin" />
                                <p className="text-muted-foreground">Loading entries...</p>
                            </div>
                        ) : entries.length === 0 ? (
                            <div className="py-12 text-center">
                                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                <p className="text-muted-foreground">
                                    {selectedLoan ? `No entries found for ${selectedLoan.loan_type}` : 'No collection entries found'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border/50">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50">
                                            <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                                            <th className="text-right py-3 px-4 font-semibold text-foreground">Amount</th>
                                            {selectedLoan?.loan_type !== 'DC Loan' && (
                                                <>
                                                    <th className="text-right py-3 px-4 font-semibold text-foreground">Principal</th>
                                                    <th className="text-right py-3 px-4 font-semibold text-foreground">Interest</th>
                                                </>
                                            )}
                                            <th className="text-left py-3 px-4 font-semibold text-foreground">Method</th>
                                            <th className="text-left py-3 px-4 font-semibold text-foreground">Collected By</th>
                                            {isOwner && <th className="text-center py-3 px-4 font-semibold text-foreground">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {entries.map((entry, index) => {
                                            // Calculate running balance: start from principal and subtract previous entries' principal payments
                                            const previousEntries = entries.slice(0, index)
                                            const totalPrincipalPaidBefore = previousEntries.reduce((sum, e) => {
                                                return sum + Number(e.asal_amount ?? e.amount ?? 0)
                                            }, 0)
                                            const loanPrincipal = selectedLoan?.principal_amount || 0
                                            const balanceBefore = Math.max(0, loanPrincipal - totalPrincipalPaidBefore)

                                            return (
                                                <tr key={entry.id} className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? '' : 'bg-muted/10'}`}>
                                                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                                                        {new Date(entry.created_at).toLocaleDateString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-green-600 whitespace-nowrap">
                                                        ₹{Number(entry.amount || 0).toLocaleString('en-IN')}
                                                    </td>
                                                    {selectedLoan?.loan_type !== 'DC Loan' && (
                                                        <>
                                                            <td className="py-3 px-4 text-right text-foreground whitespace-nowrap">
                                                                ₹{Number(entry.asal_amount || 0).toLocaleString('en-IN')}
                                                            </td>
                                                            <td className="py-3 px-4 text-right text-muted-foreground whitespace-nowrap">
                                                                ₹{Number(entry.interest_amount || 0).toLocaleString('en-IN')}
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="py-3 px-4">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/20 text-secondary-foreground capitalize">
                                                            {entry.payment_method || 'cash'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
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
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Totals */}
                        {entries.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-foreground">Total ({entries.length} entries)</span>
                                    <div className="text-right space-x-4">
                                        {selectedLoan?.loan_type !== 'DC Loan' && (
                                            <>
                                                <span className="text-sm text-muted-foreground">Principal: ₹{totalPrincipal.toLocaleString('en-IN')}</span>
                                                <span className="text-sm text-muted-foreground">Interest: ₹{totalInterest.toLocaleString('en-IN')}</span>
                                            </>
                                        )}
                                        <span className="font-bold text-green-600 text-lg">Total: ₹{totalAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Close Loan Confirmation Dialog */}
            {showCloseDialog && closingLoan && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowCloseDialog(false)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-5 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">Close Loan</h3>
                                    <p className="text-sm text-muted-foreground">{closingLoan.loan_type} — {customer.name}</p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            {/* Loan Summary */}
                            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Principal Amount</span>
                                    <span className="font-medium text-foreground">₹{closingLoan.principal_amount.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Remaining Balance</span>
                                    <span className="font-bold text-orange-600">₹{closingLoan.remaining_amount.toLocaleString('en-IN')}</span>
                                </div>
                                {(closingLoan.total_pending_interest || 0) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Pending Interest (waived)</span>
                                        <span className="font-medium text-red-500 line-through">₹{(closingLoan.total_pending_interest || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Final Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Final Amount Received (optional)</label>
                                <input
                                    type="number"
                                    value={closeFinalAmount}
                                    onChange={(e) => setCloseFinalAmount(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    max={closingLoan.remaining_amount}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                                <p className="text-xs text-muted-foreground mt-1">Amount customer paid at the time of closure</p>
                            </div>

                            {/* Payment Method (only if final amount) */}
                            {closeFinalAmount && parseFloat(closeFinalAmount) > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Payment Method</label>
                                    <div className="flex gap-2">
                                        {['cash', 'online'].map(method => (
                                            <button
                                                key={method}
                                                onClick={() => setClosePaymentMethod(method)}
                                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors capitalize ${
                                                    closePaymentMethod === method
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                                                }`}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Closure Note */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Closure Note (optional)</label>
                                <textarea
                                    value={closeNote}
                                    onChange={(e) => setCloseNote(e.target.value)}
                                    placeholder="Reason for closing this loan..."
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                />
                            </div>

                            {/* Write-off summary */}
                            {closingLoan.remaining_amount > 0 && (
                                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                    <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Write-off amount: ₹{(
                                            closingLoan.remaining_amount - (parseFloat(closeFinalAmount) || 0)
                                        ).toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">This amount will remain in the balance as a loss. This action cannot be undone.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-border flex gap-3">
                            <button
                                onClick={() => setShowCloseDialog(false)}
                                disabled={closeLoading}
                                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCloseLoan}
                                disabled={closeLoading}
                                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {closeLoading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                {closeLoading ? 'Closing...' : 'Close Loan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Edit Entry Modal */}
            {editingEntry && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setEditingEntry(null)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">Edit Entry</h3>
                                    <p className="text-sm text-muted-foreground">{new Date(editingEntry.created_at).toLocaleDateString('en-IN')}</p>
                                </div>
                                <button onClick={() => setEditingEntry(null)} className="p-1.5 rounded-md hover:bg-muted/50"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {editingEntry.loan_type === 'DC Loan' ? (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Amount (₹)</label>
                                    <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">Principal (Asal) (₹)</label>
                                        <input type="number" value={editAsalAmount} onChange={(e) => handleEditAsalChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">Interest (₹)</label>
                                        <input type="number" value={editInterestAmount} onChange={(e) => handleEditInterestChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
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
                                        <button key={method} onClick={() => setEditPaymentMethod(method)} className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors capitalize ${editPaymentMethod === method ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'}`}>{method}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-border flex gap-3">
                            <button onClick={() => setEditingEntry(null)} disabled={editLoading} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors">Cancel</button>
                            <button onClick={handleSaveEdit} disabled={editLoading || !editAmount} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                                {editLoading ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>) : (<><Check className="w-4 h-4" /> Save</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Delete Entry Confirmation */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setDeleteConfirmId(null)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="p-5 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3"><Trash2 className="w-6 h-6 text-red-500" /></div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">Delete Entry</h3>
                            <p className="text-sm text-muted-foreground">This will reverse the payment and update the loan balance.</p>
                        </div>
                        <div className="p-5 border-t border-border flex gap-3">
                            <button onClick={() => setDeleteConfirmId(null)} disabled={deleteLoading} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors">Cancel</button>
                            <button onClick={() => handleDeleteEntry(deleteConfirmId)} disabled={deleteLoading} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                                {deleteLoading ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Deleting...</>) : (<><Trash2 className="w-4 h-4" /> Delete</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Edit Loan Modal */}
            {editingLoan && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setEditingLoan(null)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">Edit Loan</h3>
                                    <p className="text-sm text-muted-foreground">{editingLoan.loan_type} — {customer.name}</p>
                                </div>
                                <button onClick={() => setEditingLoan(null)} className="p-1.5 rounded-md hover:bg-muted/50"><X className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Principal Amount (₹)</label>
                                <input type="number" value={editLoanPrincipal} onChange={(e) => setEditLoanPrincipal(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                <p className="text-xs text-muted-foreground mt-1">Remaining balance will be recalculated automatically</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">Start Date</label>
                                <input type="date" value={editLoanStartDate} onChange={(e) => setEditLoanStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            </div>
                            {editingLoan.loan_type === 'Monthly Interest Loan' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">Monthly Interest Rate (%)</label>
                                        <input type="number" step="0.1" value={editLoanRate} onChange={(e) => setEditLoanRate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">Interest Cycle Day</label>
                                        <input type="number" min="1" max="31" value={editLoanCycleDay} onChange={(e) => setEditLoanCycleDay(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                    </div>
                                </>
                            )}
                            {editingLoan.loan_type === 'DC Loan' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Daily Collection Amount (₹)</label>
                                    <input type="number" value={editLoanDailyAmount} onChange={(e) => setEditLoanDailyAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>
                            )}
                            {editingLoan.loan_type === 'DL Loan' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1.5">Daily Interest Rate (%)</label>
                                    <input type="number" step="0.01" value={editLoanRate} onChange={(e) => setEditLoanRate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-border flex gap-3">
                            <button onClick={() => setEditingLoan(null)} disabled={editLoanLoading} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors">Cancel</button>
                            <button onClick={handleSaveLoanEdit} disabled={editLoanLoading || !editLoanPrincipal} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                                {editLoanLoading ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>) : (<><Check className="w-4 h-4" /> Save</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Delete Loan Confirmation */}
            {deleteLoanConfirmId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setDeleteLoanConfirmId(null)}>
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="p-5 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">Delete Loan</h3>
                            <p className="text-sm text-muted-foreground">This will permanently delete the loan and ALL its transactions. This action cannot be undone.</p>
                        </div>
                        <div className="p-5 border-t border-border flex gap-3">
                            <button onClick={() => setDeleteLoanConfirmId(null)} disabled={deleteLoanLoading} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors">Cancel</button>
                            <button onClick={() => handleDeleteLoan(deleteLoanConfirmId)} disabled={deleteLoanLoading} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                                {deleteLoanLoading ? (<><RefreshCw className="w-4 h-4 animate-spin" /> Deleting...</>) : (<><Trash2 className="w-4 h-4" /> Delete</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
