'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Calendar, BarChart3 } from 'lucide-react'

interface PaymentAnalytics {
  summary: {
    period: {
      start_date: string
      end_date: string
      days: number
    }
    disbursement: {
      total_loans: number
      total_amount: number
      cash_amount: number
      online_amount: number
      cash_percentage: number
      online_percentage: number
    }
    repayment: {
      total_transactions: number
      total_repaid: number
      cash_repaid: number
      online_repaid: number
      cash_percentage: number
      online_percentage: number
    }
    cash_flow: {
      net_cash_flow: number
      net_online_flow: number
      total_flow: number
      interpretation: string
    }
  }
  disbursement_breakdown: Array<{
    payment_method: string
    total_amount: number
    count: number
  }>
  repayment_breakdown: Array<{
    payment_method: string
    total_amount: number
    count: number
  }>
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.paymentAnalytics.get(days)
      setAnalytics(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchAnalytics} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payment Analytics</h1>
          <p className="text-muted-foreground">
            Track cash vs online payment trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <Calendar className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Simple Cash vs Online Balance */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Cash vs Online Balance</h2>
        
        {/* Main Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cash Balance</p>
                  <p className={`text-3xl font-bold ${analytics.summary.cash_flow.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(analytics.summary.cash_flow.net_cash_flow)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {analytics.summary.cash_flow.net_cash_flow >= 0 ? 'Cash on hand' : 'Cash deficit'}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${analytics.summary.cash_flow.net_cash_flow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <DollarSign className={`w-8 h-8 ${analytics.summary.cash_flow.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Online Balance</p>
                  <p className={`text-3xl font-bold ${analytics.summary.cash_flow.net_online_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(analytics.summary.cash_flow.net_online_flow)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {analytics.summary.cash_flow.net_online_flow >= 0 ? 'Online funds available' : 'Online deficit'}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${analytics.summary.cash_flow.net_online_flow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <CreditCard className={`w-8 h-8 ${analytics.summary.cash_flow.net_online_flow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Cash Out</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(analytics.summary.disbursement.cash_amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.disbursement.cash_percentage}% of disbursements
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Cash In</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(analytics.summary.repayment.cash_repaid)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.repayment.cash_percentage}% of repayments
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Online Out</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(analytics.summary.disbursement.online_amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.disbursement.online_percentage}% of disbursements
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Online In</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(analytics.summary.repayment.online_repaid)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.repayment.online_percentage}% of repayments
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Period</p>
                <p className="text-sm">
                  {formatDate(analytics.summary.period.start_date)} - {formatDate(analytics.summary.period.end_date)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Total Flow</p>
                <p className={`text-xl font-bold ${analytics.summary.cash_flow.total_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.summary.cash_flow.total_flow >= 0 ? '+' : ''}{formatCurrency(analytics.summary.cash_flow.total_flow)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.cash_flow.total_flow >= 0 ? 'Net surplus' : 'Net deficit'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
