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
  collection_methods: Array<{
    payment_method: string
    total_amount: number
    count: number
    avg_amount: number
  }>
  daily_data: {
    disbursement: Array<{
      day: string
      payment_method: string
      total_amount: number
      count: number
    }>
    repayment: Array<{
      day: string
      payment_method: string
      total_amount: number
      count: number
    }>
  }
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

      {/* Summary Cards - Disbursement */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Loan Disbursement (Money Out)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Loans</p>
                  <p className="text-2xl font-bold">{analytics.summary.disbursement.total_loans}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Disbursed</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.summary.disbursement.total_amount)}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cash Disbursed</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.summary.disbursement.cash_amount)}</p>
                  <p className="text-xs text-muted-foreground">{analytics.summary.disbursement.cash_percentage}%</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Online Disbursed</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.summary.disbursement.online_amount)}</p>
                  <p className="text-xs text-muted-foreground">{analytics.summary.disbursement.online_percentage}%</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Cards - Repayment */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Customer Repayment (Money In)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{analytics.summary.repayment.total_transactions}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Repaid</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.summary.repayment.total_repaid)}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cash Repaid</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.summary.repayment.cash_repaid)}</p>
                  <p className="text-xs text-muted-foreground">{analytics.summary.repayment.cash_percentage}%</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Online Repaid</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.summary.repayment.online_repaid)}</p>
                  <p className="text-xs text-muted-foreground">{analytics.summary.repayment.online_percentage}%</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cash Flow Summary */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Cash Flow Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Cash Flow</p>
                  <p className={`text-2xl font-bold ${analytics.summary.cash_flow.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.summary.cash_flow.net_cash_flow >= 0 ? '+' : ''}{formatCurrency(analytics.summary.cash_flow.net_cash_flow)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.summary.cash_flow.net_cash_flow >= 0 ? 'Cash surplus' : 'Cash deficit'}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${analytics.summary.cash_flow.net_cash_flow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`w-5 h-5 ${analytics.summary.cash_flow.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Online Flow</p>
                  <p className={`text-2xl font-bold ${analytics.summary.cash_flow.net_online_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.summary.cash_flow.net_online_flow >= 0 ? '+' : ''}{formatCurrency(analytics.summary.cash_flow.net_online_flow)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.summary.cash_flow.net_online_flow >= 0 ? 'Online surplus' : 'Online deficit'}
                  </p>
                </div>
                <div className={`p-2 rounded-lg ${analytics.summary.cash_flow.net_online_flow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <CreditCard className={`w-5 h-5 ${analytics.summary.cash_flow.net_online_flow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Flow</p>
                  <p className={`text-2xl font-bold ${analytics.summary.cash_flow.total_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.summary.cash_flow.total_flow >= 0 ? '+' : ''}{formatCurrency(analytics.summary.cash_flow.total_flow)}
                  </p>
                  <p className="text-xs text-muted-foreground">{analytics.summary.cash_flow.interpretation}</p>
                </div>
                <div className={`p-2 rounded-lg ${analytics.summary.cash_flow.total_flow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <BarChart3 className={`w-5 h-5 ${analytics.summary.cash_flow.total_flow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Disbursement Breakdown</CardTitle>
            <CardDescription>
              How you give money to customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.disbursement_breakdown.map((method) => (
                <div key={method.payment_method} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant={method.payment_method === 'cash' ? 'default' : 'secondary'}>
                      {method.payment_method === 'cash' ? (
                        <>
                          <DollarSign className="w-3 h-3 mr-1" />
                          Cash
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3 h-3 mr-1" />
                          Online
                        </>
                      )}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {method.count} loans
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(method.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {((method.total_amount / analytics.summary.disbursement.total_amount) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Repayment Breakdown</CardTitle>
            <CardDescription>
              How customers pay you back
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.repayment_breakdown.map((method) => (
                <div key={method.payment_method} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant={method.payment_method === 'cash' ? 'default' : 'secondary'}>
                      {method.payment_method === 'cash' ? (
                        <>
                          <DollarSign className="w-3 h-3 mr-1" />
                          Cash
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3 h-3 mr-1" />
                          Online
                        </>
                      )}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {method.count} transactions
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(method.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {((method.total_amount / analytics.summary.repayment.total_repaid) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Key Insights */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>
            Payment trends and patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                analytics.summary.disbursement.cash_percentage > analytics.summary.disbursement.online_percentage 
                  ? 'bg-orange-100' 
                  : 'bg-purple-100'
              }`}>
                {analytics.summary.disbursement.cash_percentage > analytics.summary.disbursement.online_percentage ? (
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-purple-600" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {analytics.summary.disbursement.cash_percentage > analytics.summary.disbursement.online_percentage 
                    ? 'Cash Preferred' 
                    : 'Online Preferred'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.abs(analytics.summary.disbursement.cash_percentage - analytics.summary.disbursement.online_percentage).toFixed(1)}% difference
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Average Loan Size</p>
              <p className="text-lg font-bold">
                {formatCurrency(analytics.summary.disbursement.total_amount / analytics.summary.disbursement.total_loans)}
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Period</p>
              <p className="text-sm">
                {formatDate(analytics.summary.period.start_date)} - {formatDate(analytics.summary.period.end_date)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      </div>
  )
}
