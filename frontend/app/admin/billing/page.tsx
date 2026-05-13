'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft, CheckCircle, Crown, Zap, Building2, Users, UserPlus,
  AlertTriangle, Clock, Star, IndianRupee
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

interface SubscriptionData {
  plan: string
  plan_display: string
  status: string
  status_display: string
  is_trial: boolean
  is_active: boolean
  is_read_only: boolean
  days_remaining: number
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  amount_per_month: string
  max_users: number
  max_customers: number
  current_users: number
  current_customers: number
  organization: { id: number; name: string }
  available_plans: Array<{
    name: string
    display: string
    price: number
    max_users: number
    max_customers: number
  }>
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    '2 Users', '50 Customers', 'DC & Interest Loans',
    'Daily Cashbook', 'Collection Tracking', 'Basic Reports',
  ],
  pro: [
    '5 Users', '200 Customers', 'All Loan Types',
    'Multi-branch Support', 'Advanced Reports & PDF Export',
    'Expense & Income Manager', 'Interest Calendar', 'Priority Support',
  ],
  business: [
    'Unlimited Users', 'Unlimited Customers', 'Everything in Professional',
    'Multi-owner Administration', 'Full Audit Trail',
    'Dedicated Support', 'Custom Integrations',
  ],
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [razorpayReady, setRazorpayReady] = useState(false)

  useEffect(() => { fetchSubscription() }, [])

  async function fetchSubscription() {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`${API_BASE}/organizations/subscription/`, {
        headers: { 'Authorization': `Token ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load subscription')
      setSubscription(await res.json())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planName: string) {
    if (!subscription) return
    setUpgrading(planName)
    setError('')
    setSuccess('')

    const token = localStorage.getItem('auth_token')

    try {
      // Step 1: Create Razorpay order
      const orderRes = await fetch(`${API_BASE}/api/organizations/payment/create-order/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: subscription.organization.id, plan: planName }),
      })
      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        // If Razorpay not configured, fall back to direct upgrade
        if (orderRes.status === 503) {
          const upgradeRes = await fetch(`${API_BASE}/organizations/subscription/upgrade/`, {
            method: 'POST',
            headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ org_id: subscription.organization.id, plan: planName }),
          })
          const upgradeData = await upgradeRes.json()
          if (!upgradeRes.ok) throw new Error(upgradeData.error || 'Upgrade failed')
          setSuccess(upgradeData.message)
          fetchSubscription()
          return
        }
        throw new Error(orderData.error || 'Failed to create order')
      }

      // Step 2: Open Razorpay checkout
      if (!window.Razorpay) {
        throw new Error('Payment gateway is loading. Please try again.')
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'YourBrand',
        description: `${orderData.plan_display} Plan — Monthly Subscription`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await fetch(`${API_BASE}/api/organizations/payment/verify/`, {
              method: 'POST',
              headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                org_id: subscription.organization.id,
                plan: planName,
              }),
            })
            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed')
            setSuccess(verifyData.message || 'Plan upgraded successfully!')
            fetchSubscription()
          } catch (err: any) {
            setError(err.message || 'Payment verification failed')
          }
          setUpgrading(null)
        },
        prefill: {
          contact: '',
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: function () {
            setUpgrading(null)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response: any) {
        setError(response.error?.description || 'Payment failed. Please try again.')
        setUpgrading(null)
      })
      rzp.open()

    } catch (err: any) {
      setError(err.message)
      setUpgrading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trial': return 'text-blue-600 bg-blue-500/10'
      case 'active': return 'text-emerald-600 bg-emerald-500/10'
      case 'past_due': return 'text-orange-600 bg-orange-500/10'
      case 'expired': return 'text-red-600 bg-red-500/10'
      case 'cancelled': return 'text-gray-600 bg-gray-500/10'
      default: return 'text-muted-foreground bg-muted'
    }
  }

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'trial': return Zap
      case 'starter': return Star
      case 'pro': return Crown
      case 'business': return Building2
      default: return Star
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading billing info...</p>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">No Subscription Found</h2>
            <p className="text-muted-foreground mt-2">{error || 'No active subscription.'}</p>
            <Button asChild className="mt-4"><Link href="/admin/dashboard">Back to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const PlanIcon = getPlanIcon(subscription.plan)

  return (
    <div className="min-h-screen bg-background">
      {/* Load Razorpay script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayReady(true)}
      />

      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Plan & Billing</h1>
            <p className="text-sm text-muted-foreground">{subscription.organization.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Alerts */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-600">
            <CheckCircle className="w-4 h-4 inline mr-2" />{success}
          </div>
        )}

        {/* Trial Warning */}
        {subscription.is_trial && subscription.days_remaining <= 10 && (
          <Card className={`border-blue-500/50 ${subscription.days_remaining <= 3 ? 'bg-red-500/5 border-red-500/50' : 'bg-blue-500/5'}`}>
            <CardContent className="py-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${subscription.days_remaining <= 3 ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                  <Clock className={`w-5 h-5 ${subscription.days_remaining <= 3 ? 'text-red-500' : 'text-blue-500'}`} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {subscription.days_remaining === 0 ? 'Your trial expires today!' : `${subscription.days_remaining} day${subscription.days_remaining !== 1 ? 's' : ''} left in your free trial`}
                  </p>
                  <p className="text-sm text-muted-foreground">Upgrade now to keep all features.</p>
                </div>
              </div>
              <Button onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}>Upgrade Now</Button>
            </CardContent>
          </Card>
        )}

        {/* Expired Warning */}
        {subscription.is_read_only && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="py-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
                <div>
                  <p className="font-semibold text-red-600">Your subscription has expired</p>
                  <p className="text-sm text-muted-foreground">Account is read-only. Upgrade to resume operations.</p>
                </div>
              </div>
              <Button onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })} className="bg-red-600 hover:bg-red-700 text-white">
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Current Plan + Usage */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-border/50">
            <CardHeader><CardTitle className="text-lg">Current Plan</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PlanIcon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{subscription.plan_display}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                      {subscription.status_display}
                    </span>
                    {subscription.is_trial && <span className="text-sm text-muted-foreground">• {subscription.days_remaining} days remaining</span>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <IndianRupee className="w-4 h-4" /><span className="text-sm">Monthly Price</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {subscription.is_trial ? 'Free' : `₹${parseFloat(subscription.amount_per_month).toLocaleString('en-IN')}`}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" /><span className="text-sm">{subscription.is_trial ? 'Trial Ends' : 'Renews On'}</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {subscription.trial_ends_at
                      ? new Date(subscription.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : subscription.current_period_end
                        ? new Date(subscription.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-lg">Usage</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4" /> Users</span>
                  <span className="font-medium text-foreground">{subscription.current_users} / {subscription.max_users >= 999 ? '∞' : subscription.max_users}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className={`h-full rounded-full transition-all ${subscription.current_users >= subscription.max_users ? 'bg-red-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, (subscription.current_users / Math.max(subscription.max_users, 1)) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-muted-foreground"><UserPlus className="w-4 h-4" /> Customers</span>
                  <span className="font-medium text-foreground">{subscription.current_customers} / {subscription.max_customers >= 9999 ? '∞' : subscription.max_customers}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className={`h-full rounded-full transition-all ${subscription.current_customers >= subscription.max_customers ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (subscription.current_customers / Math.max(subscription.max_customers, 1)) * 100)}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Cards */}
        <div id="plans">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {subscription.is_trial || subscription.is_read_only ? 'Choose a Plan' : 'Upgrade Your Plan'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subscription.available_plans.map((plan) => {
              const isCurrentPlan = plan.name === subscription.plan
              const features = PLAN_FEATURES[plan.name] || []
              const isPro = plan.name === 'pro'

              return (
                <Card key={plan.name} className={`relative border-border/50 shadow-sm hover:shadow-lg transition-all h-full flex flex-col ${isPro ? 'border-primary shadow-md scale-[1.02]' : ''} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
                  {isPro && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">Most Popular</div>}
                  {isCurrentPlan && <div className="absolute -top-3 right-4 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">Current</div>}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg font-semibold">{plan.display}</CardTitle>
                    <div className="mt-3">
                      <span className="text-4xl font-extrabold text-foreground">₹{plan.price.toLocaleString('en-IN')}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.max_users >= 999 ? 'Unlimited' : plan.max_users} users • {plan.max_customers >= 9999 ? 'Unlimited' : plan.max_customers} customers
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-2.5 flex-1">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleUpgrade(plan.name)}
                      disabled={isCurrentPlan || upgrading !== null}
                      className={`mt-6 w-full ${isPro ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}`}
                      variant={isPro ? 'default' : 'outline'}
                    >
                      {upgrading === plan.name ? 'Processing...' : isCurrentPlan ? 'Current Plan' : `Upgrade to ${plan.display}`}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
