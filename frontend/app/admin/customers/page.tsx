'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Plus, Trash2, Edit3, Wallet, Eye, X, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { customersApi, loansApi, transactionsApi } from '@/lib/api'

const LOAN_TYPES = ['DC Loan', 'Monthly Interest Loan', 'DL Loan'] as const

interface Loan {
  id: number
  loan_type: 'DC Loan' | 'Monthly Interest Loan' | 'DL Loan'
  principal_amount: number
  remaining_amount: number
  start_date: string
  status: 'active' | 'settled' | 'overdue'
  has_transactions?: boolean
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
  created_by: string
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

const CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Fujairah', 'Umm Al Quwain', 'Ras Al Khaimah']

function normalizeCustomer(apiCustomer: any): Customer {
  const createdBy = typeof apiCustomer.created_by === 'object'
    ? (apiCustomer.created_by?.username || apiCustomer.created_by?.full_name || '—')
    : String(apiCustomer.created_by ?? '—')
  const created_at = apiCustomer.created_at
    ? new Date(apiCustomer.created_at).toISOString().split('T')[0]
    : '—'
  return {
    id: apiCustomer.id,
    name: apiCustomer.name,
    email: apiCustomer.email || '',
    phone: apiCustomer.phone_number || apiCustomer.phone || '',
    city: apiCustomer.area || apiCustomer.city || '',
    address: apiCustomer.address || '',
    loans: (apiCustomer.loans || []).map((loan: any) => ({
      id: loan.id,
      loan_type: loan.loan_type || loan.type,
      principal_amount: parseFloat(loan.principal_amount || loan.amount || 0),
      remaining_amount: parseFloat(loan.remaining_amount || 0),
      start_date: loan.start_date || '',
      status: loan.status || 'active',
      has_transactions: loan.has_transactions || false,
    })),
    created_at,
    created_by: createdBy,
  }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locationFilter, setLocationFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({})
  const [addFormData, setAddFormData] = useState({ name: '', phone: '', address: '', city: '' })
  const [addLoanWithCustomer, setAddLoanWithCustomer] = useState(false)
  const [firstLoanType, setFirstLoanType] = useState<string>(LOAN_TYPES[0])
  const [firstLoanPrincipal, setFirstLoanPrincipal] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [addLoanForCustomer, setAddLoanForCustomer] = useState<Customer | null>(null)
  const [newLoanType, setNewLoanType] = useState<string>(LOAN_TYPES[0])
  const [newLoanPrincipal, setNewLoanPrincipal] = useState('')
  const [addingLoan, setAddingLoan] = useState(false)

  // Monthly Interest Loan fields
  const [monthlyInterestRate, setMonthlyInterestRate] = useState('')
  const [interestCycleDay, setInterestCycleDay] = useState('')

  // DC Loan fields
  const [dailyCollectionAmount, setDailyCollectionAmount] = useState('')
  const [expectedTotalDays, setExpectedTotalDays] = useState('')

  // DL Loan fields
  const [dailyInterestRate, setDailyInterestRate] = useState('')
  const [maxDays, setMaxDays] = useState('')
  const [allowAsalPaymentAnytime, setAllowAsalPaymentAnytime] = useState(true)

  // For existing customer loan creation
  const [newMonthlyInterestRate, setNewMonthlyInterestRate] = useState('')
  const [newInterestCycleDay, setNewInterestCycleDay] = useState('')
  const [newDailyCollectionAmount, setNewDailyCollectionAmount] = useState('')
  const [newExpectedTotalDays, setNewExpectedTotalDays] = useState('')
  const [newDailyInterestRate, setNewDailyInterestRate] = useState('')
  const [newMaxDays, setNewMaxDays] = useState('')
  const [newAllowAsalPaymentAnytime, setNewAllowAsalPaymentAnytime] = useState(true)

  // Loan edit/delete state
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [editLoanFormData, setEditLoanFormData] = useState<{
    principal_amount?: string
    monthly_interest_rate?: string
    interest_cycle_day?: string
    daily_collection_amount?: string
    daily_interest_rate?: string
  }>({})
  const [savingLoan, setSavingLoan] = useState(false)
  const [deletingLoanId, setDeletingLoanId] = useState<number | null>(null)

  // Customer entries modal state - REMOVED, now using navigation
  // const [selectedCustomerForEntries, setSelectedCustomerForEntries] = useState<Customer | null>(null)
  // const [customerEntries, setCustomerEntries] = useState<Transaction[]>([])
  // const [entriesLoading, setEntriesLoading] = useState(false)
  // const [selectedLoanFilter, setSelectedLoanFilter] = useState<string>('all')
  // const [customerLoans, setCustomerLoans] = useState<Loan[]>([])

  const router = useRouter()

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await customersApi.getAll()
      setCustomers(Array.isArray(data) ? data.map(normalizeCustomer) : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load customers')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Handle customer row click - navigate to detail page
  const handleCustomerClick = (customer: Customer) => {
    router.push(`/admin/customers/${customer.id}`)
  }


  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return
    try {
      await customersApi.delete(id)
      await fetchCustomers()
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer')
    }
  }

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!addFormData.name.trim() || !addFormData.phone.trim() || !addFormData.address.trim() || !addFormData.city) {
      alert('Please fill Name, Phone, Address, and City')
      return
    }
    const principal = parseFloat(firstLoanPrincipal)
    if (addLoanWithCustomer && (isNaN(principal) || principal <= 0)) {
      alert('To add a loan, enter a valid principal amount (₹)')
      return
    }

    // Validate loan-specific fields
    if (addLoanWithCustomer) {
      if (firstLoanType === 'Monthly Interest Loan') {
        if (!monthlyInterestRate || !interestCycleDay) {
          alert('Monthly Interest Loan requires interest rate and cycle day')
          return
        }
        const rate = parseFloat(monthlyInterestRate)
        const day = parseInt(interestCycleDay)
        if (isNaN(rate) || rate <= 0 || day < 1 || day > 31) {
          alert('Please enter valid interest rate and cycle day (1-31)')
          return
        }
      } else if (firstLoanType === 'DC Loan') {
        if (!dailyCollectionAmount) {
          alert('DC Loan requires daily collection amount')
          return
        }
        const amount = parseFloat(dailyCollectionAmount)
        if (isNaN(amount) || amount <= 0) {
          alert('Please enter valid daily collection amount')
          return
        }
      } else if (firstLoanType === 'DL Loan') {
        if (!dailyInterestRate) {
          alert('DL Loan requires daily interest rate')
          return
        }
        const rate = parseFloat(dailyInterestRate)
        if (isNaN(rate) || rate <= 0) {
          alert('Please enter valid daily interest rate')
          return
        }
      }
    }

    try {
      setSubmitting(true)
      const created = await customersApi.create({
        name: addFormData.name.trim(),
        phone_number: addFormData.phone.trim(),
        address: addFormData.address.trim(),
        area: addFormData.city,
      })
      const newId = created?.id
      if (addLoanWithCustomer && newId && !isNaN(principal) && principal > 0) {
        const loanData: any = {
          customer: newId,
          loan_type: firstLoanType,
          principal_amount: principal,
        }

        // Add loan-specific fields
        if (firstLoanType === 'Monthly Interest Loan') {
          loanData.monthly_interest_rate = parseFloat(monthlyInterestRate)
          loanData.interest_cycle_day = parseInt(interestCycleDay)
        } else if (firstLoanType === 'DC Loan') {
          loanData.daily_collection_amount = parseFloat(dailyCollectionAmount)
          if (expectedTotalDays) {
            loanData.expected_total_days = parseInt(expectedTotalDays)
          }
        } else if (firstLoanType === 'DL Loan') {
          loanData.daily_interest_rate = parseFloat(dailyInterestRate)
          if (maxDays) {
            loanData.max_days = parseInt(maxDays)
          }
          loanData.allow_asal_payment_anytime = allowAsalPaymentAnytime
        }

        await loansApi.create(loanData)
      }

      // Reset form
      setAddFormData({ name: '', phone: '', address: '', city: '' })
      setAddLoanWithCustomer(false)
      setFirstLoanType(LOAN_TYPES[0])
      setFirstLoanPrincipal('')
      setMonthlyInterestRate('')
      setInterestCycleDay('')
      setDailyCollectionAmount('')
      setExpectedTotalDays('')
      setDailyInterestRate('')
      setMaxDays('')
      setAllowAsalPaymentAnytime(true)
      setShowForm(false)
      await fetchCustomers()
    } catch (err: any) {
      alert(err.message || 'Failed to add customer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddNewLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addLoanForCustomer) return
    const principal = parseFloat(newLoanPrincipal)
    if (isNaN(principal) || principal <= 0) {
      alert('Enter a valid principal amount (₹)')
      return
    }

    // Validate loan-specific fields
    if (newLoanType === 'Monthly Interest Loan') {
      if (!newMonthlyInterestRate || !newInterestCycleDay) {
        alert('Monthly Interest Loan requires interest rate and cycle day')
        return
      }
      const rate = parseFloat(newMonthlyInterestRate)
      const day = parseInt(newInterestCycleDay)
      if (isNaN(rate) || rate <= 0 || day < 1 || day > 31) {
        alert('Please enter valid interest rate and cycle day (1-31)')
        return
      }
    } else if (newLoanType === 'DC Loan') {
      if (!newDailyCollectionAmount) {
        alert('DC Loan requires daily collection amount')
        return
      }
      const amount = parseFloat(newDailyCollectionAmount)
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter valid daily collection amount')
        return
      }
    } else if (newLoanType === 'DL Loan') {
      if (!newDailyInterestRate) {
        alert('DL Loan requires daily interest rate')
        return
      }
      const rate = parseFloat(newDailyInterestRate)
      if (isNaN(rate) || rate <= 0) {
        alert('Please enter valid daily interest rate')
        return
      }
    }

    try {
      setAddingLoan(true)
      const loanData: any = {
        customer: addLoanForCustomer.id,
        loan_type: newLoanType,
        principal_amount: principal,
      }

      // Add loan-specific fields
      if (newLoanType === 'Monthly Interest Loan') {
        loanData.monthly_interest_rate = parseFloat(newMonthlyInterestRate)
        loanData.interest_cycle_day = parseInt(newInterestCycleDay)
      } else if (newLoanType === 'DC Loan') {
        loanData.daily_collection_amount = parseFloat(newDailyCollectionAmount)
        if (newExpectedTotalDays) {
          loanData.expected_total_days = parseInt(newExpectedTotalDays)
        }
      } else if (newLoanType === 'DL Loan') {
        loanData.daily_interest_rate = parseFloat(newDailyInterestRate)
        if (newMaxDays) {
          loanData.max_days = parseInt(newMaxDays)
        }
        loanData.allow_asal_payment_anytime = newAllowAsalPaymentAnytime
      }

      await loansApi.create(loanData)

      // Reset form
      setAddLoanForCustomer(null)
      setNewLoanPrincipal('')
      setNewLoanType(LOAN_TYPES[0])
      setNewMonthlyInterestRate('')
      setNewInterestCycleDay('')
      setNewDailyCollectionAmount('')
      setNewExpectedTotalDays('')
      setNewDailyInterestRate('')
      setNewMaxDays('')
      setNewAllowAsalPaymentAnytime(true)
      await fetchCustomers()
    } catch (err: any) {
      alert(err.message || 'Failed to add loan')
    } finally {
      setAddingLoan(false)
    }
  }

  const handleEditClick = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation()
    setEditingCustomer(customer)
    setEditFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      address: customer.address,
    })
  }

  const handleEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingCustomer) return
    try {
      setSubmitting(true)
      await customersApi.update(editingCustomer.id, {
        name: editFormData.name,
        phone_number: editFormData.phone,
        address: editFormData.address,
        area: editFormData.city,
      })
      setEditingCustomer(null)
      setEditFormData({})
      await fetchCustomers()
    } catch (err: any) {
      alert(err.message || 'Failed to update customer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditCancel = () => {
    setEditingCustomer(null)
    setEditFormData({})
  }

  // Loan edit/delete handlers
  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan)
    setEditLoanFormData({
      principal_amount: loan.principal_amount.toString(),
    })
  }

  const handleEditLoanSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLoan) return
    try {
      setSavingLoan(true)
      const updateData: any = {}
      if (editLoanFormData.principal_amount) {
        updateData.principal_amount = parseFloat(editLoanFormData.principal_amount)
      }
      if (editLoanFormData.monthly_interest_rate) {
        updateData.monthly_interest_rate = parseFloat(editLoanFormData.monthly_interest_rate)
      }
      if (editLoanFormData.interest_cycle_day) {
        updateData.interest_cycle_day = parseInt(editLoanFormData.interest_cycle_day)
      }
      if (editLoanFormData.daily_collection_amount) {
        updateData.daily_collection_amount = parseFloat(editLoanFormData.daily_collection_amount)
      }
      if (editLoanFormData.daily_interest_rate) {
        updateData.daily_interest_rate = parseFloat(editLoanFormData.daily_interest_rate)
      }
      await loansApi.update(editingLoan.id, updateData)
      setEditingLoan(null)
      setEditLoanFormData({})
      await fetchCustomers()
    } catch (err: any) {
      alert(err.message || 'Failed to update loan')
    } finally {
      setSavingLoan(false)
    }
  }

  const handleEditLoanCancel = () => {
    setEditingLoan(null)
    setEditLoanFormData({})
  }

  const handleDeleteLoan = async (loanId: number) => {
    if (!confirm('Are you sure you want to delete this loan? This action cannot be undone.')) {
      return
    }
    try {
      setDeletingLoanId(loanId)
      await loansApi.delete(loanId)
      await fetchCustomers()
    } catch (err: any) {
      alert(err.message || err.error || 'Failed to delete loan. It may have existing transactions.')
    } finally {
      setDeletingLoanId(null)
    }
  }

  const toggleExpandCustomer = (customerId: number) => {
    setExpandedCustomerId(expandedCustomerId === customerId ? null : customerId)
  }

  const locations = Array.from(new Set(customers.map((c) => c.city).filter(Boolean))).sort()

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesLocation = !locationFilter || locationFilter === 'all' || c.city === locationFilter
    const matchesStatus = statusFilter === 'all' || c.loans.some((loan) => loan.status === statusFilter)
    return matchesSearch && matchesLocation && matchesStatus
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Manage Customers</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredCustomers.length} customers</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Edit Customer Modal */}
        {editingCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl border-border/50">
              <CardHeader>
                <CardTitle>Edit Customer</CardTitle>
                <CardDescription>Update customer details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEditSave} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Full Name</label>
                      <Input
                        placeholder="Full Name"
                        value={editFormData.name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="border-border/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Phone</label>
                      <Input
                        placeholder="Phone Number"
                        value={editFormData.phone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="border-border/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Email</label>
                      <Input
                        type="email"
                        placeholder="Email"
                        value={editFormData.email || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">City</label>
                      <Select value={editFormData.city || ''} onValueChange={(val) => setEditFormData({ ...editFormData, city: val })}>
                        <SelectTrigger className="border-border/50">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dubai">Dubai</SelectItem>
                          <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                          <SelectItem value="Sharjah">Sharjah</SelectItem>
                          <SelectItem value="Ajman">Ajman</SelectItem>
                          <SelectItem value="Fujairah">Fujairah</SelectItem>
                          <SelectItem value="Umm Al Quwain">Umm Al Quwain</SelectItem>
                          <SelectItem value="Ras Al Khaimah">Ras Al Khaimah</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Address</label>
                    <Input
                      placeholder="Address"
                      value={editFormData.address || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="border-border/50"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      {submitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleEditCancel}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Loan Modal */}
        {editingLoan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleEditLoanCancel}>
            <Card className="w-full max-w-md border-border/50" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Edit Loan</CardTitle>
                <CardDescription>{editingLoan.loan_type} - ID #{editingLoan.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEditLoanSave} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Principal Amount (₹)</label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={editLoanFormData.principal_amount || ''}
                      onChange={(e) => setEditLoanFormData({ ...editLoanFormData, principal_amount: e.target.value })}
                      className="border-border/50"
                    />
                  </div>

                  {editingLoan.loan_type === 'Monthly Interest Loan' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Monthly Interest Rate (%)</label>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={editLoanFormData.monthly_interest_rate || ''}
                          onChange={(e) => setEditLoanFormData({ ...editLoanFormData, monthly_interest_rate: e.target.value })}
                          className="border-border/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Interest Cycle Day</label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={editLoanFormData.interest_cycle_day || ''}
                          onChange={(e) => setEditLoanFormData({ ...editLoanFormData, interest_cycle_day: e.target.value })}
                          className="border-border/50"
                        />
                      </div>
                    </>
                  )}

                  {editingLoan.loan_type === 'DC Loan' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Daily Collection Amount (₹)</label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={editLoanFormData.daily_collection_amount || ''}
                        onChange={(e) => setEditLoanFormData({ ...editLoanFormData, daily_collection_amount: e.target.value })}
                        className="border-border/50"
                      />
                    </div>
                  )}

                  {editingLoan.loan_type === 'DL Loan' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Daily Interest Rate (%)</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editLoanFormData.daily_interest_rate || ''}
                        onChange={(e) => setEditLoanFormData({ ...editLoanFormData, daily_interest_rate: e.target.value })}
                        className="border-border/50"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={savingLoan} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      {savingLoan ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleEditLoanCancel}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add new loan modal (for existing customer) */}
        {addLoanForCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAddLoanForCustomer(null)}>
            <Card className="w-full max-w-md border-border/50" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Add new loan</CardTitle>
                <CardDescription>{addLoanForCustomer.name} — same customer</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddNewLoan} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Loan type</label>
                    <Select value={newLoanType} onValueChange={setNewLoanType}>
                      <SelectTrigger className="border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOAN_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      DC: daily principal. Monthly: interest/principal per month. DL: interest + asal per installment.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Principal amount (₹)</label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="e.g. 50000"
                      value={newLoanPrincipal}
                      onChange={(e) => setNewLoanPrincipal(e.target.value)}
                      className="border-border/50"
                      required
                    />
                  </div>

                  {/* Monthly Interest Loan Fields */}
                  {newLoanType === 'Monthly Interest Loan' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Monthly Interest Rate (%)</label>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          placeholder="e.g. 5"
                          value={newMonthlyInterestRate}
                          onChange={(e) => setNewMonthlyInterestRate(e.target.value)}
                          className="border-border/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Interest Cycle Day</label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="e.g. 5"
                          value={newInterestCycleDay}
                          onChange={(e) => setNewInterestCycleDay(e.target.value)}
                          className="border-border/50"
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* DC Loan Fields */}
                  {newLoanType === 'DC Loan' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Daily Collection Amount (₹)</label>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="e.g. 100"
                          value={newDailyCollectionAmount}
                          onChange={(e) => setNewDailyCollectionAmount(e.target.value)}
                          className="border-border/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Expected Total Days (Optional)</label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g. 120"
                          value={newExpectedTotalDays}
                          onChange={(e) => setNewExpectedTotalDays(e.target.value)}
                          className="border-border/50"
                        />
                      </div>
                    </>
                  )}

                  {/* DL Loan Fields */}
                  {newLoanType === 'DL Loan' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Daily Interest Rate (%)</label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="e.g. 0.2"
                          value={newDailyInterestRate}
                          onChange={(e) => setNewDailyInterestRate(e.target.value)}
                          className="border-border/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Max Days (Optional)</label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g. 90"
                          value={newMaxDays}
                          onChange={(e) => setNewMaxDays(e.target.value)}
                          className="border-border/50"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allow-asal-payment"
                          checked={newAllowAsalPaymentAnytime}
                          onChange={(e) => setNewAllowAsalPaymentAnytime(e.target.checked)}
                          className="rounded border-border"
                        />
                        <label htmlFor="allow-asal-payment" className="text-sm font-medium text-foreground">
                          Allow Asal Payment Anytime
                        </label>
                      </div>
                    </>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={addingLoan} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      {addingLoan ? 'Adding...' : 'Add loan'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setAddLoanForCustomer(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Customer Form */}
        {showForm && (
          <Card className="mb-8 border-border/50">
            <CardHeader>
              <CardTitle>Add New Customer</CardTitle>
              <CardDescription>Enter customer details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <Input
                      placeholder="Ahmed Hassan"
                      value={addFormData.name}
                      onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                      className="border-border/50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone</label>
                    <Input
                      placeholder="+971 50 123 4567"
                      value={addFormData.phone}
                      onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                      className="border-border/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">City / Area</label>
                  <Select
                    value={addFormData.city}
                    onValueChange={(val) => setAddFormData({ ...addFormData, city: val })}
                  >
                    <SelectTrigger className="border-border/50">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Address</label>
                  <Input
                    placeholder="Al Wasl Road, Dubai"
                    value={addFormData.address}
                    onChange={(e) => setAddFormData({ ...addFormData, address: e.target.value })}
                    className="border-border/50"
                    required
                  />
                </div>

                {/* Optional: Add first loan */}
                <div className="border-t border-border/50 pt-4 mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="add-loan-with-customer"
                      checked={addLoanWithCustomer}
                      onChange={(e) => setAddLoanWithCustomer(e.target.checked)}
                      className="rounded border-border"
                    />
                    <label htmlFor="add-loan-with-customer" className="text-sm font-medium text-foreground">
                      Add a loan for this customer
                    </label>
                  </div>
                  {addLoanWithCustomer && (
                    <div className="space-y-4 pl-6 border-l-2 border-primary/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Loan type</label>
                          <Select value={firstLoanType} onValueChange={setFirstLoanType}>
                            <SelectTrigger className="border-border/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LOAN_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            DC: principal collection. Monthly: interest/principal per month. DL: interest + asal per installment.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Principal amount (₹)</label>
                          <Input
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="e.g. 50000"
                            value={firstLoanPrincipal}
                            onChange={(e) => setFirstLoanPrincipal(e.target.value)}
                            className="border-border/50"
                            required={addLoanWithCustomer}
                          />
                        </div>
                      </div>

                      {/* Monthly Interest Loan Fields */}
                      {firstLoanType === 'Monthly Interest Loan' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Monthly Interest Rate (%)</label>
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              placeholder="e.g. 5"
                              value={monthlyInterestRate}
                              onChange={(e) => setMonthlyInterestRate(e.target.value)}
                              className="border-border/50"
                              required={addLoanWithCustomer}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Interest Cycle Day</label>
                            <Input
                              type="number"
                              min="1"
                              max="31"
                              placeholder="e.g. 5"
                              value={interestCycleDay}
                              onChange={(e) => setInterestCycleDay(e.target.value)}
                              className="border-border/50"
                              required={addLoanWithCustomer}
                            />
                          </div>
                        </div>
                      )}

                      {/* DC Loan Fields */}
                      {firstLoanType === 'DC Loan' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Daily Collection Amount (₹)</label>
                            <Input
                              type="number"
                              min="1"
                              step="0.01"
                              placeholder="e.g. 100"
                              value={dailyCollectionAmount}
                              onChange={(e) => setDailyCollectionAmount(e.target.value)}
                              className="border-border/50"
                              required={addLoanWithCustomer}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Expected Total Days (Optional)</label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="e.g. 120"
                              value={expectedTotalDays}
                              onChange={(e) => setExpectedTotalDays(e.target.value)}
                              className="border-border/50"
                            />
                          </div>
                        </div>
                      )}

                      {/* DL Loan Fields */}
                      {firstLoanType === 'DL Loan' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">Daily Interest Rate (%)</label>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="e.g. 0.2"
                                value={dailyInterestRate}
                                onChange={(e) => setDailyInterestRate(e.target.value)}
                                className="border-border/50"
                                required={addLoanWithCustomer}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">Max Days (Optional)</label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="e.g. 90"
                                value={maxDays}
                                onChange={(e) => setMaxDays(e.target.value)}
                                className="border-border/50"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="allow-asal-payment-new"
                              checked={allowAsalPaymentAnytime}
                              onChange={(e) => setAllowAsalPaymentAnytime(e.target.checked)}
                              className="rounded border-border"
                            />
                            <label htmlFor="allow-asal-payment-new" className="text-sm font-medium text-foreground">
                              Allow Asal Payment Anytime
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    {submitting ? 'Adding...' : 'Add Customer'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <div className="flex gap-4 flex-col sm:flex-row mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by name, phone, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-border/50"
            />
          </div>
          <Select value={locationFilter || 'all'} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full sm:w-48 border-border/50">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Customers Grid/Table */}
        {loading ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Loading customers...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={fetchCustomers} className="mt-4">Retry</Button>
            </CardContent>
          </Card>
        ) : filteredCustomers.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No customers found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="border border-border px-4 py-3 text-left text-xs font-medium text-muted-foreground bg-muted">Customer Name</th>
                      <th className="border border-border px-4 py-3 text-left text-xs font-medium text-muted-foreground bg-muted">Phone</th>
                      <th className="border border-border px-4 py-3 text-left text-xs font-medium text-muted-foreground bg-muted">Email</th>
                      <th className="border border-border px-4 py-3 text-left text-xs font-medium text-muted-foreground bg-muted">City</th>
                      <th className="border border-border px-4 py-3 text-center text-xs font-medium text-muted-foreground bg-muted">Active Loans</th>
                      <th className="border border-border px-4 py-3 text-right text-xs font-medium text-muted-foreground bg-muted">Total Loan</th>
                      <th className="border border-border px-4 py-3 text-right text-xs font-medium text-muted-foreground bg-muted">Balance</th>
                      <th className="border border-border px-4 py-3 text-center text-xs font-medium text-muted-foreground bg-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => {
                      const activeLoanCount = customer.loans.filter((l) => l.status === 'active').length
                      const totalLoanAmount = customer.loans.reduce((sum, l) => sum + l.principal_amount, 0)
                      const totalRemainingAmount = customer.loans.reduce((sum, l) => sum + (l.remaining_amount || 0), 0)

                      return (
                        <React.Fragment key={customer.id}>
                          <tr
                            className="hover:bg-muted/50 border-b border-border cursor-pointer transition-colors"
                            onClick={() => handleCustomerClick(customer)}
                          >
                            <td className="border border-border px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpandCustomer(customer.id)
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  {expandedCustomerId === customer.id ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                                <div>
                                  <div className="font-medium text-sm text-foreground">{customer.name}</div>
                                  <div className="text-xs text-muted-foreground">{customer.city || 'N/A'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="border border-border px-4 py-3 text-sm text-muted-foreground">{customer.phone || 'N/A'}</td>
                            <td className="border border-border px-4 py-3 text-sm text-muted-foreground">{customer.email || 'No email'}</td>
                            <td className="border border-border px-4 py-3 text-sm text-muted-foreground">{customer.city || 'N/A'}</td>
                            <td className="border border-border px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                                {activeLoanCount}
                              </span>
                            </td>
                            <td className="border border-border px-4 py-3 text-right font-medium text-sm text-foreground">₹{totalLoanAmount.toLocaleString()}</td>
                            <td className="border border-border px-4 py-3 text-right font-medium text-sm text-primary">₹{totalRemainingAmount.toLocaleString()}</td>
                            <td className="border border-border px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCustomerClick(customer)
                                  }}
                                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                  title="View Entries"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setAddLoanForCustomer(customer)
                                    setNewLoanType(LOAN_TYPES[0])
                                    setNewLoanPrincipal('')
                                  }}
                                  className="h-8 px-2 text-primary hover:bg-primary/10"
                                  title="Add Loan"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleEditClick(e, customer)}
                                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                  title="Edit"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteCustomer(customer.id)
                                  }}
                                  className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {/* Expandable Loans Row */}
                          {expandedCustomerId === customer.id && customer.loans.length > 0 && (
                            <tr className="bg-muted/30">
                              <td colSpan={8} className="border border-border px-6 py-4">
                                <div className="space-y-2">
                                  <h4 className="text-sm font-medium text-foreground mb-3">Loans for {customer.name}</h4>
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-xs text-muted-foreground">
                                        <th className="text-left py-1 px-2">Type</th>
                                        <th className="text-right py-1 px-2">Principal</th>
                                        <th className="text-right py-1 px-2">Remaining</th>
                                        <th className="text-center py-1 px-2">Status</th>
                                        <th className="text-left py-1 px-2">Start Date</th>
                                        <th className="text-center py-1 px-2">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {customer.loans.map((loan) => (
                                        <tr key={loan.id} className="border-t border-border/50">
                                          <td className="py-2 px-2">{loan.loan_type}</td>
                                          <td className="py-2 px-2 text-right">₹{loan.principal_amount.toLocaleString()}</td>
                                          <td className="py-2 px-2 text-right text-primary">₹{loan.remaining_amount.toLocaleString()}</td>
                                          <td className="py-2 px-2 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${loan.status === 'active' ? 'bg-green-100 text-green-700' :
                                              loan.status === 'settled' ? 'bg-gray-100 text-gray-700' :
                                                'bg-red-100 text-red-700'
                                              }`}>
                                              {loan.status}
                                            </span>
                                          </td>
                                          <td className="py-2 px-2">{loan.start_date}</td>
                                          <td className="py-2 px-2 text-center">
                                            {!loan.has_transactions ? (
                                              <div className="flex items-center justify-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleEditLoan(loan)}
                                                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                                  title="Edit Loan"
                                                >
                                                  <Edit3 className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => handleDeleteLoan(loan.id)}
                                                  disabled={deletingLoanId === loan.id}
                                                  className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                  title="Delete Loan"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

