'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Wallet, Edit2, X, Check, Trash2 } from 'lucide-react'
import { customersApi, loansApi, transactionsApi, authApi } from '@/lib/api'

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'online', label: 'Online' },
] as const

interface Loan {
  id: number
  loan_type: 'DC Loan' | 'Monthly Interest Loan' | 'DL Loan'
  principal_amount: number
  remaining_amount: number
  start_date: string
  status: 'active' | 'settled' | 'overdue'
  // Interest tracking
  pending_interest?: number
  expected_interest?: string
  total_pending_interest?: string
  days_since_start?: number
  // Rate fields
  monthly_interest_rate?: number
  daily_interest_rate?: number
  daily_collection_amount?: number
}

interface Customer {
  id: number
  name: string
  area?: string
  address?: string
  phone_number?: string
  loans: Loan[]
}

const LOAN_TYPES = ['DC Loan', 'Monthly Interest Loan', 'DL Loan'] as const
const FIXED_DAILY_AMOUNT = 100 // Fixed daily collection amount

export default function CollectionsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLoanType, setSelectedLoanType] = useState<string>('DC Loan')
  const [searchTerm, setSearchTerm] = useState('')
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [entries, setEntries] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Track payments by loan ID (not customer ID) to support multiple loans per customer
  const [loanPayments, setLoanPayments] = useState<{
    [loanId: number]: {
      amount: string;
      paid: boolean;
      balance: number;
      monthlyAsal?: string;
      monthlyInterest?: string;
      dlInterest?: string;
      dlAsal?: string;
      paymentMethod: string;
      // Interest calculation fields from API
      expectedInterest?: string;
      totalPendingInterest?: string;
      daysSinceStart?: number;
    }
  }>({})

  // Editing entry state
  const [editingEntry, setEditingEntry] = useState<any | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editAsalAmount, setEditAsalAmount] = useState('')
  const [editInterestAmount, setEditInterestAmount] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash')

  // For Monthly Loan
  const [monthlyAsalAmount, setMonthlyAsalAmount] = useState<string>('')
  const [monthlyInterestAmount, setMonthlyInterestAmount] = useState<string>('')

  // For Daily Loan
  const [dailyCollectionDays, setDailyCollectionDays] = useState('')
  const [dailyCollectionAmount, setDailyCollectionAmount] = useState('')

  // For DL Loan
  const [dlInterestAmount, setDlInterestAmount] = useState<string>('')
  const [dlAsalAmount, setDlAsalAmount] = useState<string>('')

  // Payment handling functions - now keyed by loanId
  const updateLoanAmount = (loanId: number, amount: string) => {
    setLoanPayments(prev => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        amount,
        paid: false,
        balance: prev[loanId]?.balance || 0
      }
    }))
  }

  const updateMonthlyAsal = (loanId: number, value: string) => {
    setLoanPayments(prev => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        monthlyAsal: value,
        amount: calculateMonthlyTotal(value, prev[loanId]?.monthlyInterest || '0').toString(),
        paid: false,
        balance: prev[loanId]?.balance || 0
      }
    }))
  }

  const updateMonthlyInterest = (loanId: number, value: string) => {
    setLoanPayments(prev => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        monthlyInterest: value,
        amount: calculateMonthlyTotal(prev[loanId]?.monthlyAsal || '0', value).toString(),
        paid: false,
        balance: prev[loanId]?.balance || 0
      }
    }))
  }

  const updateDLInterest = (loanId: number, value: string) => {
    setLoanPayments(prev => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        dlInterest: value,
        amount: calculateDLTotal(value, prev[loanId]?.dlAsal || '0').toString(),
        paid: false,
        balance: prev[loanId]?.balance || 0
      }
    }))
  }

  const updateDLAsal = (loanId: number, value: string) => {
    setLoanPayments(prev => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        dlAsal: value,
        amount: calculateDLTotal(prev[loanId]?.dlInterest || '0', value).toString(),
        paid: false,
        balance: prev[loanId]?.balance || 0
      }
    }))
  }

  const calculateMonthlyTotal = (asal: string, interest: string) => {
    return (parseFloat(asal) || 0) + (parseFloat(interest) || 0)
  }

  const calculateDLTotal = (interest: string, asal: string) => {
    return (parseFloat(interest) || 0) + (parseFloat(asal) || 0)
  }

  // Update payment method for a specific loan
  const updateLoanPaymentMethod = (loanId: number, method: string) => {
    setLoanPayments(prev => ({
      ...prev,
      [loanId]: {
        ...prev[loanId],
        paymentMethod: method
      }
    }))
  }

  const markAsPaid = async (customerId: number, customerName: string, loanId: number) => {
    const payment = loanPayments[loanId]
    if (!payment || !payment.amount || parseFloat(payment.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    // Balance validation - don't allow payment if amount > balance
    const paymentAmount = parseFloat(payment.amount)
    if (paymentAmount > payment.balance) {
      alert(`Payment amount (₹${paymentAmount.toLocaleString()}) cannot exceed the remaining balance (₹${payment.balance.toLocaleString()})`)
      return
    }

    try {
      setSubmitting(true)

      // Prepare transaction data based on loan type
      let transactionData: any = {
        loan: loanId,
        payment_method: payment.paymentMethod || 'cash',
        description: `${selectedLoanType} collection`
      }

      // Add amount based on loan type
      if (selectedLoanType === 'DC Loan') {
        transactionData.amount = parseFloat(payment.amount) // Total amount
        transactionData.asal_amount = parseFloat(payment.amount) // For DC loans, full amount is principal
      } else if (selectedLoanType === 'Monthly Interest Loan') {
        transactionData.asal_amount = parseFloat(payment.monthlyAsal || '0')
        transactionData.interest_amount = parseFloat(payment.monthlyInterest || '0')
        transactionData.amount = parseFloat(payment.amount) // Total amount for Monthly
      } else if (selectedLoanType === 'DL Loan') {
        transactionData.interest_amount = parseFloat(payment.dlInterest || '0')
        transactionData.asal_amount = parseFloat(payment.dlAsal || '0')
        transactionData.amount = parseFloat(payment.amount) // Total amount for DL
      }

      await transactionsApi.create(transactionData)

      // Fetch updated loan data from backend to get accurate balance
      try {
        const updatedLoan = await loansApi.getById(loanId)
        const newBalance = parseFloat(updatedLoan.remaining_amount)

        setLoanPayments(prev => ({
          ...prev,
          [loanId]: {
            ...prev[loanId],
            paid: true,
            balance: newBalance
          }
        }))

        // Update customer's loan balance in customers array
        setCustomers(prev => prev.map(customer => {
          if (customer.id === customerId) {
            return {
              ...customer,
              loans: customer.loans.map(loan =>
                loan.id === loanId
                  ? { ...loan, remaining_amount: newBalance }
                  : loan
              )
            }
          }
          return customer
        }))
      } catch (err) {
        console.error('Error fetching updated loan:', err)
        // Fallback: keep current balance if fetch fails
      }

      // Refresh data
      fetchTodayEntries()
      fetchCustomers() // Refetch all customers to get updated balances

    } catch (err: any) {
      alert(err.message || 'Failed to submit payment')
    } finally {
      setSubmitting(false)
    }
  }

  // Fetch customers and loans
  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await customersApi.getAll({ all: true })

      // Fetch loans for each customer
      const customersWithLoans = await Promise.all(
        data.map(async (customer: any) => {
          try {
            const loans = await loansApi.getAll({ customer_id: customer.id, status: 'active' })
            return {
              ...customer,
              loans: loans.map((loan: any) => ({
                id: loan.id,
                loan_type: loan.loan_type,
                principal_amount: parseFloat(loan.principal_amount),
                remaining_amount: parseFloat(loan.remaining_amount),
                start_date: loan.start_date,
                status: loan.status,
                // Interest calculation fields
                expected_interest: loan.expected_interest,
                total_pending_interest: loan.total_pending_interest,
                days_since_start: loan.days_since_start,
                pending_interest: loan.pending_interest ? parseFloat(loan.pending_interest) : 0,
                // Rate fields
                monthly_interest_rate: loan.monthly_interest_rate ? parseFloat(loan.monthly_interest_rate) : null,
                daily_interest_rate: loan.daily_interest_rate ? parseFloat(loan.daily_interest_rate) : null,
                daily_collection_amount: loan.daily_collection_amount ? parseFloat(loan.daily_collection_amount) : null,
              })),
            }
          } catch (err) {
            return { ...customer, loans: [] }
          }
        })
      )
      setCustomers(customersWithLoans)

      // Initialize payment balances for each loan (keyed by loanId)
      const initialPayments: {
        [loanId: number]: {
          amount: string;
          paid: boolean;
          balance: number;
          monthlyAsal?: string;
          monthlyInterest?: string;
          dlInterest?: string;
          dlAsal?: string;
          paymentMethod: string;
        }
      } = {}
      customersWithLoans.forEach((customer: Customer) => {
        // Get ALL matching loans for this customer (not just the first one)
        const matchingLoans = customer.loans.filter((loan: Loan) =>
          loan.status === 'active' && loan.loan_type === selectedLoanType
        )

        matchingLoans.forEach((loan: Loan) => {
          let defaultAmount = ''

          // Get expected interest from API (already calculated)
          const expectedInterest = loan.expected_interest ? parseFloat(loan.expected_interest) : 0

          // Auto-populate default amounts based on loan type
          if (loan.loan_type === 'DC Loan') {
            defaultAmount = (loan.daily_collection_amount || FIXED_DAILY_AMOUNT).toString()
          } else if (loan.loan_type === 'Monthly Interest Loan') {
            // Pre-populate with expected interest, asal starts at 0
            defaultAmount = expectedInterest.toString()
          } else if (loan.loan_type === 'DL Loan') {
            // Pre-populate with expected interest, asal starts at 0
            defaultAmount = expectedInterest.toString()
          }

          initialPayments[loan.id] = {
            amount: defaultAmount,
            paid: false,
            balance: loan.remaining_amount,
            // Pre-populate interest fields with calculated values
            monthlyAsal: loan.loan_type === 'Monthly Interest Loan' ? '' : undefined,
            monthlyInterest: loan.loan_type === 'Monthly Interest Loan' ? expectedInterest.toString() : undefined,
            dlInterest: loan.loan_type === 'DL Loan' ? expectedInterest.toString() : undefined,
            dlAsal: loan.loan_type === 'DL Loan' ? '' : undefined,
            paymentMethod: 'cash'
          }
        })
      })
      setLoanPayments(initialPayments)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers')
      console.error('Error fetching customers:', err)
    } finally {
      setLoading(false)
    }
  }

  // Track current user
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    authApi.getCurrentUser().then(user => setCurrentUser(user))
  }, [])

  const fetchTodayEntries = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      // Fetch ALL entries for duplicate check
      const data = await transactionsApi.getAll({ start_date: today, end_date: today, include_all: 'true' })
      setEntries(data)
    } catch (err) {
      console.error('Error fetching entries:', err)
    }
  }

  // Edit entry handlers
  const startEditEntry = (entry: any) => {
    setEditingEntry(entry)
    setEditAmount(entry.amount?.toString() || '')
    setEditAsalAmount(entry.asal_amount?.toString() || '0')
    setEditInterestAmount(entry.interest_amount?.toString() || '0')
    setEditPaymentMethod(entry.payment_method || 'cash')
  }

  const cancelEditEntry = () => {
    setEditingEntry(null)
    setEditAmount('')
    setEditAsalAmount('')
    setEditInterestAmount('')
    setEditPaymentMethod('cash')
  }

  const saveEditEntry = async () => {
    if (!editingEntry) return

    try {
      setSubmitting(true)
      const loanType = editingEntry.loan_type
      let updateData: any = { payment_method: editPaymentMethod }

      if (loanType === 'DC Loan') {
        const amt = parseFloat(editAmount)
        if (isNaN(amt) || amt <= 0) { alert('Enter a valid amount'); return }
        updateData.amount = amt
        updateData.asal_amount = amt
        updateData.interest_amount = 0
      } else {
        // Monthly or DL - separate asal and interest
        const asal = parseFloat(editAsalAmount) || 0
        const interest = parseFloat(editInterestAmount) || 0
        if (asal + interest <= 0) { alert('Enter a valid amount'); return }
        updateData.asal_amount = asal
        updateData.interest_amount = interest
        updateData.amount = asal + interest
      }

      await transactionsApi.update(editingEntry.id, updateData)
      await fetchTodayEntries()
      await fetchCustomers()
      cancelEditEntry()
    } catch (err: any) {
      alert(err.message || 'Failed to update entry')
    } finally {
      setSubmitting(false)
    }
  }

  // Find today's entry for a specific loan
  const getTodayEntryForLoan = (loanId: number) => {
    return entries.find((e: any) => e.loan === loanId)
  }

  // Delete an entry
  const handleDeleteEntry = async (entryId: number) => {
    if (!confirm('Are you sure you want to delete this payment?')) return
    try {
      setSubmitting(true)
      await transactionsApi.delete(entryId)
      await fetchTodayEntries()
      await fetchCustomers()
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry')
    } finally {
      setSubmitting(false)
    }
  }

  // Fetch entries on component mount
  useEffect(() => {
    fetchTodayEntries()
  }, [])

  // Update payment balances when loan type changes
  useEffect(() => {
    if (customers.length > 0) {
      const initialPayments: {
        [loanId: number]: {
          amount: string;
          paid: boolean;
          balance: number;
          monthlyAsal?: string;
          monthlyInterest?: string;
          dlInterest?: string;
          dlAsal?: string;
          paymentMethod: string;
        }
      } = {}
      customers.forEach((customer: Customer) => {
        // Get ALL matching loans for this customer (not just the first one)
        const matchingLoans = customer.loans.filter((loan: Loan) =>
          loan.status === 'active' && loan.loan_type === selectedLoanType
        )

        matchingLoans.forEach((loan: Loan) => {
          let defaultAmount = ''

          // Get expected interest from API (already calculated)
          const expectedInterest = loan.expected_interest ? parseFloat(loan.expected_interest) : 0
          console.log('Loan ID:', loan.id, 'Expected Interest:', loan.expected_interest, 'Parsed:', expectedInterest)

          // Auto-populate default amounts based on loan type
          if (loan.loan_type === 'DC Loan') {
            defaultAmount = (loan.daily_collection_amount || FIXED_DAILY_AMOUNT).toString()
          } else if (loan.loan_type === 'Monthly Interest Loan') {
            // Pre-populate with expected interest
            defaultAmount = expectedInterest.toString()
          } else if (loan.loan_type === 'DL Loan') {
            // Pre-populate with expected interest
            defaultAmount = expectedInterest.toString()
          }

          initialPayments[loan.id] = {
            amount: defaultAmount,
            paid: false,
            balance: loan.remaining_amount,
            // Pre-populate interest fields with calculated values
            monthlyAsal: loan.loan_type === 'Monthly Interest Loan' ? '' : undefined,
            monthlyInterest: loan.loan_type === 'Monthly Interest Loan' ? expectedInterest.toString() : undefined,
            dlInterest: loan.loan_type === 'DL Loan' ? expectedInterest.toString() : undefined,
            dlAsal: loan.loan_type === 'DL Loan' ? '' : undefined,
            paymentMethod: 'cash'
          }
        })
      })
      setLoanPayments(initialPayments)
    }
  }, [selectedLoanType, customers])

  // Get filtered loans with their customer info (one row per loan)
  interface LoanWithCustomer extends Loan {
    customer: Customer
  }

  const getFilteredLoans = (): LoanWithCustomer[] => {
    const result: LoanWithCustomer[] = []
    customers.forEach(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesArea = areaFilter === 'all' || customer.area === areaFilter
      if (matchesSearch && matchesArea) {
        customer.loans
          .filter(loan => loan.loan_type === selectedLoanType && loan.status === 'active')
          .forEach(loan => {
            // Apply paid/unpaid filter
            if (paymentStatusFilter !== 'all') {
              const hasTodayEntry = entries.some((e: any) => e.loan === loan.id)
              if (paymentStatusFilter === 'paid' && !hasTodayEntry) return
              if (paymentStatusFilter === 'unpaid' && hasTodayEntry) return
            }
            result.push({ ...loan, customer })
          })
      }
    })
    return result
  }

  // Get unique areas for filter dropdown
  const getUniqueAreas = () => {
    const areas = new Set<string>()
    customers.forEach(c => {
      if (c.area) areas.add(c.area)
    })
    return Array.from(areas).sort()
  }

  // Keep for backward compat with other parts
  const getFilteredCustomers = () => {
    return customers.filter((customer) => {
      const hasLoanType = customer.loans.some((loan) => loan.loan_type === selectedLoanType && loan.status === 'active')
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesArea = areaFilter === 'all' || customer.area === areaFilter
      return hasLoanType && matchesSearch && matchesArea
    })
  }

  // Get available loans for selected customer
  const getAvailableLoans = () => {
    if (!selectedCustomer) return []
    return selectedCustomer.loans.filter((loan) =>
      loan.status === 'active' && loan.loan_type === selectedLoanType
    )
  }

  // Calculate amount based on loan type
  const getCollectionAmount = (): number => {
    if (!selectedLoan) return 0

    if (selectedLoan.loan_type === 'DC Loan') {
      // Fixed daily amount
      return FIXED_DAILY_AMOUNT
    } else if (selectedLoan.loan_type === 'Monthly Interest Loan') {
      // Calculate total from user input amounts
      const asal = parseFloat(monthlyAsalAmount) || 0
      const interest = parseFloat(monthlyInterestAmount) || 0
      return asal + interest
    } else if (selectedLoan.loan_type === 'DL Loan') {
      // Calculate total from user input amounts
      const interest = parseFloat(dlInterestAmount) || 0
      const asal = parseFloat(dlAsalAmount) || 0
      return interest + asal
    }

    return 0
  }

  const handleAddEntry = async () => {
    if (!selectedCustomer || !selectedLoan) {
      alert('Please select customer and loan')
      return
    }

    // Validate based on loan type
    if (selectedLoan.loan_type === 'DC Loan' && !dailyCollectionDays && !dailyCollectionAmount) {
      alert('Enter either number of days or total amount for Daily Collection')
      return
    }

    if (selectedLoan.loan_type === 'Monthly Interest Loan') {
      const asal = parseFloat(monthlyAsalAmount) || 0
      const interest = parseFloat(monthlyInterestAmount) || 0
      if (asal === 0 && interest === 0) {
        alert('Please enter at least one amount (Asal or Interest) for Monthly Interest Loan')
        return
      }
    }

    if (selectedLoan.loan_type === 'DL Loan') {
      const interest = parseFloat(dlInterestAmount) || 0
      const asal = parseFloat(dlAsalAmount) || 0
      if (interest === 0 && asal === 0) {
        alert('Please enter at least one amount (Interest or Asal) for DL Loan')
        return
      }
    }

    let entryAmount = getCollectionAmount()
    let entryDescription = ''
    let asalAmount = 0
    let interestAmount = 0

    // Calculate entry details based on loan type
    if (selectedLoan.loan_type === 'DC Loan') {
      const days = dailyCollectionDays ? parseInt(dailyCollectionDays) : Math.ceil(parseInt(dailyCollectionAmount) / FIXED_DAILY_AMOUNT)
      entryAmount = days * FIXED_DAILY_AMOUNT
      entryDescription = `${days} day${days !== 1 ? 's' : ''} collected`
    } else if (selectedLoan.loan_type === 'Monthly Interest Loan') {
      asalAmount = parseFloat(monthlyAsalAmount) || 0
      interestAmount = parseFloat(monthlyInterestAmount) || 0
      if (asalAmount > 0 && interestAmount > 0) {
        entryDescription = `Asal: ₹${asalAmount.toLocaleString()} + Interest: ₹${interestAmount.toLocaleString()}`
      } else if (asalAmount > 0) {
        entryDescription = `Asal: ₹${asalAmount.toLocaleString()}`
      } else if (interestAmount > 0) {
        entryDescription = `Interest: ₹${interestAmount.toLocaleString()}`
      }
    } else if (selectedLoan.loan_type === 'DL Loan') {
      interestAmount = parseFloat(dlInterestAmount) || 0
      asalAmount = parseFloat(dlAsalAmount) || 0
      if (interestAmount > 0 && asalAmount > 0) {
        entryDescription = `Interest: ₹${interestAmount.toLocaleString()} + Asal: ₹${asalAmount.toLocaleString()}`
      } else if (interestAmount > 0) {
        entryDescription = `Interest: ₹${interestAmount.toLocaleString()}`
      } else if (asalAmount > 0) {
        entryDescription = `Asal: ₹${asalAmount.toLocaleString()}`
      }
    }

    try {
      setSubmitting(true)
      const transaction = await transactionsApi.create({
        loan: selectedLoan.id,
        amount: entryAmount,
        asal_amount: asalAmount || undefined,
        interest_amount: interestAmount || undefined,
        payment_method: paymentMethod,
        description: entryDescription,
      })

      // Refresh entries
      await fetchTodayEntries()

      // Reset form
      setPaymentMethod('cash')
      setSelectedCustomer(null)
      setSelectedLoan(null)
      setMonthlyAsalAmount('')
      setMonthlyInterestAmount('')
      setDailyCollectionDays('')
      setDailyCollectionAmount('')
      setDlInterestAmount('')
      setDlAsalAmount('')

      alert('Collection recorded successfully!')
    } catch (err: any) {
      alert(err.message || 'Failed to record collection')
      console.error('Error creating transaction:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCustomers = getFilteredCustomers()
  const availableLoans = getAvailableLoans()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Add Collection Entry</h1>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loan Type Flicker Buttons and Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {LOAN_TYPES.map((type) => (
              <Button
                key={type}
                onClick={() => {
                  setSelectedLoanType(type)
                }}
                variant={selectedLoanType === type ? 'default' : 'outline'}
                className="px-6 py-2"
              >
                {type}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Area:</label>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-40 border-border/50">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {getUniqueAreas().map((area) => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Status:</label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-32 border-border/50">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Search:</label>
              <Input
                placeholder="Customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 border-border/50"
              />
            </div>
          </div>
        </div>

        {/* Spreadsheet Interface */}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Name</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Area</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Phone</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Loan</th>
                  {selectedLoanType === 'Monthly Interest Loan' && (
                    <>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Asal</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Interest</th>
                    </>
                  )}
                  {selectedLoanType === 'DL Loan' && (
                    <>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Interest</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Asal</th>
                    </>
                  )}
                  {selectedLoanType === 'DC Loan' && (
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Amount</th>
                  )}
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Total</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Method</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Action</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/70">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground">
                      Loading customers...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={selectedLoanType === 'Monthly Interest Loan' || selectedLoanType === 'DL Loan' ? 11 : 9} className="text-center py-8 text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : getFilteredLoans().length === 0 ? (
                  <tr>
                    <td colSpan={selectedLoanType === 'Monthly Interest Loan' || selectedLoanType === 'DL Loan' ? 11 : 9} className="text-center py-8 text-muted-foreground">
                      No loans found
                    </td>
                  </tr>
                ) : (
                  getFilteredLoans().map((loanWithCustomer, index) => {
                    const { customer, ...loan } = loanWithCustomer
                    const payment = loanPayments[loan.id]

                    return (
                      <tr key={loan.id} className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-card' : 'bg-muted/10'
                        }`}>
                        <td className="px-3 py-2 text-sm font-medium text-foreground">{customer.name}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{customer.area || '-'}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{customer.phone_number || '-'}</td>

                        <td className="px-3 py-2 text-sm">
                          <span className="font-medium text-foreground">₹{loan.principal_amount.toLocaleString()}</span>
                          {loan.loan_type === 'Monthly Interest Loan' && loan.monthly_interest_rate && (
                            <span className="text-xs text-muted-foreground ml-1">@ {loan.monthly_interest_rate}%</span>
                          )}
                          {loan.loan_type === 'DL Loan' && loan.daily_interest_rate && (
                            <span className="text-xs text-muted-foreground ml-1">@ {loan.daily_interest_rate}%/d</span>
                          )}
                          {loan.loan_type === 'DC Loan' && loan.daily_collection_amount && (
                            <span className="text-xs text-muted-foreground ml-1">({loan.daily_collection_amount}/d)</span>
                          )}
                        </td>
                        {/* Dynamic input fields based on loan type */}
                        {selectedLoanType === 'Monthly Interest Loan' && (
                          <>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                placeholder="0"
                                value={payment?.monthlyAsal || ''}
                                onChange={(e) => updateMonthlyAsal(loan.id, e.target.value)}
                                className="w-full text-center text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                min="0"
                                step="1"
                                disabled={payment?.paid}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                placeholder="0"
                                value={payment?.monthlyInterest ?? ''}
                                onChange={(e) => updateMonthlyInterest(loan.id, e.target.value)}
                                className="w-full text-center text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                min="0"
                                step="1"
                                disabled={payment?.paid}
                              />
                            </td>
                          </>
                        )}
                        {selectedLoanType === 'DL Loan' && (
                          <>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                placeholder="0"
                                value={payment?.dlInterest ?? ''}
                                onChange={(e) => updateDLInterest(loan.id, e.target.value)}
                                className="w-full text-center text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                min="0"
                                step="1"
                                disabled={payment?.paid}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                placeholder="0"
                                value={payment?.dlAsal || ''}
                                onChange={(e) => updateDLAsal(loan.id, e.target.value)}
                                className="w-full text-center text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                min="0"
                                step="1"
                                disabled={payment?.paid}
                              />
                            </td>
                          </>
                        )}
                        {selectedLoanType === 'DC Loan' && (
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              placeholder="0"
                              value={payment?.amount || ''}
                              onChange={(e) => updateLoanAmount(loan.id, e.target.value)}
                              className="w-full text-center text-sm border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              min="0"
                              step="1"
                              disabled={payment?.paid}
                            />
                          </td>
                        )}
                        {/* Total column */}
                        <td className="px-3 py-2 text-center">
                          <span className="font-semibold text-sm text-foreground">
                            ₹{(parseFloat(payment?.amount || '0')).toLocaleString()}
                          </span>
                        </td>
                        {/* Payment Method column */}
                        <td className="px-3 py-2 text-center">
                          <select
                            value={payment?.paymentMethod || 'cash'}
                            onChange={(e) => updateLoanPaymentMethod(loan.id, e.target.value)}
                            disabled={payment?.paid}
                            className="text-xs border border-border/50 rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        {/* Action column */}
                        <td className="px-3 py-2 text-center">
                          {(() => {
                            const todayEntry = getTodayEntryForLoan(loan.id)

                            if (todayEntry) {
                              // Entry exists
                              const isMyEntry = !currentUser || todayEntry.created_by === currentUser.id

                              if (editingEntry?.id === todayEntry.id && isMyEntry) {
                                // EDIT MODE (Only for own entries)
                                const isCompound = editingEntry.loan_type !== 'DC Loan'
                                return (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-center gap-1">
                                      {isCompound ? (
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground w-6">Asal</span>
                                            <input
                                              type="number"
                                              value={editAsalAmount}
                                              onChange={(e) => setEditAsalAmount(e.target.value)}
                                              className="w-16 text-center text-xs border border-border rounded px-1 py-0.5 bg-background text-foreground"
                                              min="0"
                                              placeholder="0"
                                            />
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground w-6">Int</span>
                                            <input
                                              type="number"
                                              value={editInterestAmount}
                                              onChange={(e) => setEditInterestAmount(e.target.value)}
                                              className="w-16 text-center text-xs border border-border rounded px-1 py-0.5 bg-background text-foreground"
                                              min="0"
                                              placeholder="0"
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <input
                                          type="number"
                                          value={editAmount}
                                          onChange={(e) => setEditAmount(e.target.value)}
                                          className="w-20 text-center text-xs border border-border rounded px-1 py-1 bg-background text-foreground"
                                          min="0"
                                        />
                                      )}

                                      <div className="flex flex-col gap-0.5">
                                        <select
                                          value={editPaymentMethod}
                                          onChange={(e) => setEditPaymentMethod(e.target.value)}
                                          className="text-xs border border-border rounded px-1 py-1 bg-background text-foreground mb-1"
                                        >
                                          {PAYMENT_METHODS.map((m) => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                          ))}
                                        </select>
                                        <div className="flex gap-1 justify-center">
                                          <button
                                            onClick={saveEditEntry}
                                            disabled={submitting}
                                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                                            title="Save"
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={cancelEditEntry}
                                            disabled={submitting}
                                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                                            title="Cancel"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              } else {
                                // DISPLAY MODE (Paid or Paid by Other)
                                const amt = parseFloat(todayEntry.amount)
                                const asal = todayEntry.asal_amount ? parseFloat(todayEntry.asal_amount) : 0
                                const interest = todayEntry.interest_amount ? parseFloat(todayEntry.interest_amount) : 0
                                const isCompound = loan.loan_type !== 'DC Loan' && (asal > 0 || interest > 0)

                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isMyEntry
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                      {isMyEntry ? 'Paid' : `By ${todayEntry.collected_by_name?.split(' ')[0] || 'Other'}`}
                                    </span>

                                    <div className="text-xs font-medium">₹{amt.toLocaleString()}</div>
                                    {isCompound && (
                                      <div className="text-[10px] text-muted-foreground">
                                        A:₹{asal} I:₹{interest}
                                      </div>
                                    )}

                                    {isMyEntry && (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => startEditEntry(todayEntry)}
                                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                          title="Edit"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteEntry(todayEntry.id)}
                                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )
                              }
                            } else {
                              // NOT PAID - Show Pay Button
                              return (
                                <button
                                  onClick={() => markAsPaid(customer.id, customer.name, loan.id)}
                                  disabled={submitting || !payment?.amount || parseFloat(payment?.amount || '0') <= 0}
                                  className="px-3 py-1 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                  Pay
                                </button>
                              )
                            }
                          })()}
                        </td>
                        {/* Balance column */}
                        <td className={`px-3 py-2 text-center text-sm font-semibold ${payment?.paid
                          ? 'text-green-600'
                          : 'text-foreground'
                          }`}>
                          ₹{(payment?.balance || loan.remaining_amount).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table >
          </div >
        </div >

      </main >
    </div >
  )
}
