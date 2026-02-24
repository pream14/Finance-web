'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, User, Phone, MapPin, Wallet, Calendar, RefreshCw } from 'lucide-react'
import { customersApi, loansApi, transactionsApi } from '@/lib/api'

interface Loan {
    id: number
    loan_type: 'DC Loan' | 'Monthly Interest Loan' | 'DL Loan'
    principal_amount: number
    remaining_amount: number
    start_date: string
    status: 'active' | 'settled' | 'overdue'
    monthly_interest_rate?: number
    daily_interest_rate?: number
    daily_collection_amount?: number
    expected_total_days?: number
}

interface Customer {
    id: number
    name: string
    email?: string
    phone: string
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
    const [loanStatusFilter, setLoanStatusFilter] = useState<'active' | 'settled' | 'all'>('active')

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
                monthly_interest_rate: loan.monthly_interest_rate ? parseFloat(loan.monthly_interest_rate) : undefined,
                daily_interest_rate: loan.daily_interest_rate ? parseFloat(loan.daily_interest_rate) : undefined,
                daily_collection_amount: loan.daily_collection_amount ? parseFloat(loan.daily_collection_amount) : undefined,
                expected_total_days: loan.expected_total_days ? parseInt(loan.expected_total_days) : undefined,
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
    }, [customerId])

    // Handle loan card click - switch to selected loan
    const handleLoanClick = (loanId: number) => {
        if (selectedLoanId !== loanId) {
            setSelectedLoanId(loanId)
            fetchEntries(loanId)
        }
    }

    // Get selected loan details for display
    const selectedLoan = selectedLoanId ? loans.find(l => l.id === selectedLoanId) : null

    // Calculate totals
    const totalAmount = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const totalPrincipal = entries.reduce((sum, e) => sum + Number(e.asal_amount || 0), 0)
    const totalInterest = entries.reduce((sum, e) => sum + Number(e.interest_amount || 0), 0)
    const totalLoanAmount = loans.reduce((sum, l) => sum + l.principal_amount, 0)
    const totalBalance = loans.reduce((sum, l) => sum + l.remaining_amount, 0)
    const activeLoansCount = loans.filter(l => l.status === 'active').length

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
                        <Button asChild>
                            <Link href="/collections">Add Collection</Link>
                        </Button>
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
                                    {(['active', 'settled'] as const).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setLoanStatusFilter(status)}
                                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${loanStatusFilter === status
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                }`}
                                        >
                                            {status}
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
                                                    'bg-red-500/20 text-red-600'
                                                }`}>
                                                {loan.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Principal</span>
                                                <span className="font-medium text-foreground">₹{loan.principal_amount.toLocaleString('en-IN')}</span>
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
                                            {loan.start_date && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Started</span>
                                                    <span className="text-muted-foreground">{new Date(loan.start_date).toLocaleDateString('en-IN')}</span>
                                                </div>
                                            )}
                                        </div>
                                        {selectedLoanId === loan.id && (
                                            <div className="mt-2 pt-2 border-t border-primary/30 text-center">
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
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {entries.map((entry, index) => {
                                            // Calculate running balance: start from principal and subtract previous entries' principal payments
                                            const previousEntries = entries.slice(0, index)
                                            const totalPrincipalPaidBefore = previousEntries.reduce((sum, e) => {
                                                return sum + Number(e.asal_amount || e.amount || 0)
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
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                                            {entry.collected_by_name || 'Unknown'}
                                                        </span>
                                                    </td>
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
        </div>
    )
}
