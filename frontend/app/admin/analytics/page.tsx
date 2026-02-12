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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let queryParams = {}
      
      if (startDate && endDate) {
        queryParams = { start_date: startDate, end_date: endDate }
      } else {
        queryParams = { days }
      }
      
      const response = await api.paymentAnalytics.get(queryParams as any)
      setAnalytics(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const setQuickDate = (days: number) => {
    setDays(days)
    setStartDate('')
    setEndDate('')
    fetchAnalytics()
  }

  const handleCustomDateRange = () => {
    if (startDate && endDate) {
      setDays(0) // Reset days when using custom dates
      fetchAnalytics()
    }
  }

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
      {/* Date Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Analytics</h1>
          <p className="text-muted-foreground">
            Track cash vs online payment methods
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3">
          {/* Quick Date Options */}
          <div className="flex gap-2">
            <Button 
              variant={days === 1 ? "default" : "outline"} 
              size="sm" 
              onClick={() => setQuickDate(1)}
            >
              Today
            </Button>
            <Button 
              variant={days === 7 ? "default" : "outline"} 
              size="sm" 
              onClick={() => setQuickDate(7)}
            >
              Yesterday
            </Button>
            <Button 
              variant={days === 7 ? "default" : "outline"} 
              size="sm" 
              onClick={() => setQuickDate(7)}
            >
              Week
            </Button>
            <Button 
              variant={days === 30 ? "default" : "outline"} 
              size="sm" 
              onClick={() => setQuickDate(30)}
            >
              Month
            </Button>
            <Button 
              variant={days === 90 ? "default" : "outline"} 
              size="sm" 
              onClick={() => setQuickDate(90)}
            >
              Quarter
            </Button>
            <Button 
              variant={days === 365 ? "default" : "outline"} 
              size="sm" 
              onClick={() => setQuickDate(365)}
            >
              Year
            </Button>
          </div>
          
          {/* Custom Date Range */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
              placeholder="Start Date"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
              placeholder="End Date"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCustomDateRange}
              disabled={!startDate || !endDate}
            >
              Apply
            </Button>
          </div>
          
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <Calendar className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Simple Cash vs Online Balance */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Cash vs Online Summary</h2>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Net Cash Flow</p>
                <p className={`text-xl font-bold ${analytics.summary.cash_flow.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.summary.cash_flow.net_cash_flow >= 0 ? '+' : ''}{formatCurrency(analytics.summary.cash_flow.net_cash_flow)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.cash_flow.net_cash_flow >= 0 ? 'Cash surplus' : 'Cash deficit'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">Net Online Flow</p>
                <p className={`text-xl font-bold ${analytics.summary.cash_flow.net_online_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {analytics.summary.cash_flow.net_online_flow >= 0 ? '+' : ''}{formatCurrency(analytics.summary.cash_flow.net_online_flow)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.summary.cash_flow.net_online_flow >= 0 ? 'Online surplus' : 'Online deficit'}
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
        </div>
      </div>
    </div>
  )
}
