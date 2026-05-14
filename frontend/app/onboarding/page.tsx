'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Building2, Users, Plus, CheckCircle, ArrowRight, ArrowLeft,
  Wallet, Sparkles, UserPlus, IndianRupee, PartyPopper
} from 'lucide-react'
import { customersApi, loansApi, authApi } from '@/lib/api'

const STEPS = [
  { title: 'Welcome', icon: Sparkles },
  { title: 'Add Customer', icon: UserPlus },
  { title: 'Create Loan', icon: IndianRupee },
  { title: 'All Set!', icon: PartyPopper },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Customer form
  const [customerForm, setCustomerForm] = useState({
    name: '', phone_number: '', area: '', address: '',
  })
  const [customerSaving, setCustomerSaving] = useState(false)
  const [createdCustomer, setCreatedCustomer] = useState<any>(null)

  // Loan form
  const [loanForm, setLoanForm] = useState({
    loan_type: 'DC Loan',
    principal_amount: '',
    daily_collection_amount: '100',
    monthly_interest_rate: '3',
    daily_interest_rate: '0.1',
  })
  const [loanSaving, setLoanSaving] = useState(false)
  const [createdLoan, setCreatedLoan] = useState<any>(null)

  useEffect(() => {
    authApi.getCurrentUser().then(u => {
      setUser(u)
      setLoading(false)
    }).catch(() => {
      router.push('/auth/login')
    })
  }, [])

  const handleCreateCustomer = async () => {
    if (!customerForm.name.trim()) {
      alert('Customer name is required')
      return
    }
    setCustomerSaving(true)
    try {
      const customer = await customersApi.create(customerForm)
      setCreatedCustomer(customer)
      setStep(2) // Move to loan step
    } catch (err: any) {
      alert(err.message || 'Failed to create customer')
    } finally {
      setCustomerSaving(false)
    }
  }

  const handleCreateLoan = async () => {
    if (!createdCustomer) return
    const amount = parseFloat(loanForm.principal_amount)
    if (!amount || amount <= 0) {
      alert('Enter a valid loan amount')
      return
    }
    setLoanSaving(true)
    try {
      const loanData: any = {
        customer: createdCustomer.id,
        loan_type: loanForm.loan_type,
        principal_amount: amount,
        remaining_amount: amount,
      }
      if (loanForm.loan_type === 'DC Loan') {
        loanData.daily_collection_amount = parseFloat(loanForm.daily_collection_amount) || 100
      } else if (loanForm.loan_type === 'Monthly Interest Loan') {
        loanData.monthly_interest_rate = parseFloat(loanForm.monthly_interest_rate) || 3
      } else if (loanForm.loan_type === 'DL Loan') {
        loanData.daily_interest_rate = parseFloat(loanForm.daily_interest_rate) || 0.1
      }
      const loan = await loansApi.create(loanData)
      setCreatedLoan(loan)
      setStep(3) // Move to success step
    } catch (err: any) {
      alert(err.message || 'Failed to create loan')
    } finally {
      setLoanSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      {/* Progress Bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step ? 'bg-emerald-500 text-white' :
                i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <Card className="w-full max-w-lg">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome, {user?.first_name || 'there'}! 🎉</CardTitle>
              <CardDescription className="text-base mt-2">
                Your organization is set up with a <span className="font-semibold text-primary">10-day free trial</span>.
                Let's get you started in just 2 simple steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-bold text-blue-500">1</div>
                  <span className="text-sm">Add your first customer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-sm font-bold text-emerald-500">2</div>
                  <span className="text-sm">Create a loan for them</span>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => setStep(1)}>
                Let's Go <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => router.push('/admin/dashboard')}>
                Skip for now
              </Button>
            </CardContent>
          </>
        )}

        {/* Step 1: Add Customer */}
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Add Your First Customer
              </CardTitle>
              <CardDescription>Enter the customer's basic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Customer Name *</label>
                <Input
                  placeholder="e.g. Ravi Kumar"
                  value={customerForm.name}
                  onChange={e => setCustomerForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number</label>
                <Input
                  placeholder="e.g. 9876543210"
                  value={customerForm.phone_number}
                  onChange={e => setCustomerForm(p => ({ ...p, phone_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Area</label>
                <Input
                  placeholder="e.g. T.Nagar"
                  value={customerForm.area}
                  onChange={e => setCustomerForm(p => ({ ...p, area: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={handleCreateCustomer} disabled={customerSaving}>
                  {customerSaving ? 'Creating...' : 'Create Customer'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 2: Create Loan */}
        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-500" />
                Create a Loan for {createdCustomer?.name}
              </CardTitle>
              <CardDescription>Set up the first loan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Loan Type</label>
                <Select value={loanForm.loan_type} onValueChange={v => setLoanForm(p => ({ ...p, loan_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DC Loan">DC Loan (Daily Collection)</SelectItem>
                    <SelectItem value="Monthly Interest Loan">Monthly Interest Loan</SelectItem>
                    <SelectItem value="DL Loan">DL Loan (Daily Interest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Principal Amount (₹) *</label>
                <Input
                  type="number"
                  placeholder="e.g. 10000"
                  value={loanForm.principal_amount}
                  onChange={e => setLoanForm(p => ({ ...p, principal_amount: e.target.value }))}
                />
              </div>

              {loanForm.loan_type === 'DC Loan' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Daily Collection Amount (₹)</label>
                  <Input
                    type="number"
                    value={loanForm.daily_collection_amount}
                    onChange={e => setLoanForm(p => ({ ...p, daily_collection_amount: e.target.value }))}
                  />
                </div>
              )}
              {loanForm.loan_type === 'Monthly Interest Loan' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Monthly Interest Rate (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={loanForm.monthly_interest_rate}
                    onChange={e => setLoanForm(p => ({ ...p, monthly_interest_rate: e.target.value }))}
                  />
                </div>
              )}
              {loanForm.loan_type === 'DL Loan' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Daily Interest Rate (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={loanForm.daily_interest_rate}
                    onChange={e => setLoanForm(p => ({ ...p, daily_interest_rate: e.target.value }))}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button className="flex-1" onClick={handleCreateLoan} disabled={loanSaving}>
                  {loanSaving ? 'Creating...' : 'Create Loan'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 3: All Set! */}
        {step === 3 && (
          <>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <PartyPopper className="w-8 h-8 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl">You're All Set! 🎉</CardTitle>
              <CardDescription className="text-base mt-2">
                Your first customer and loan are ready. Start collecting payments from the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{createdCustomer?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Loan Type</span>
                  <span className="font-medium">{createdLoan?.loan_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">₹{parseFloat(createdLoan?.principal_amount || 0).toLocaleString()}</span>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => router.push('/admin/dashboard')}>
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/collections')}>
                <Wallet className="w-4 h-4 mr-2" /> Start Collecting
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
