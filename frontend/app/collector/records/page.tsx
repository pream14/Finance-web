'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Wallet, User } from 'lucide-react'
import { transactionsApi, authApi } from '@/lib/api'

function getMonthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const start = `${ym}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${ym}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function buildMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

const MONTH_OPTIONS = buildMonthOptions()

export default function CollectorRecordsPage() {
  const [currentUser, setCurrentUser] = useState<{ full_name?: string } | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(() => MONTH_OPTIONS[0]?.value || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { start, end } = useMemo(() => getMonthRange(selectedMonth || new Date().toISOString().slice(0, 7)), [selectedMonth])

  useEffect(() => {
    let cancelled = false
    async function loadUser() {
      const user = await authApi.getCurrentUser()
      if (!cancelled && user) setCurrentUser(user)
    }
    loadUser()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selectedMonth) return
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const txs = await transactionsApi.getAll({ start_date: start, end_date: end })
        if (!cancelled) setTransactions(Array.isArray(txs) ? txs : [])
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load your records')
          setTransactions([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [start, end, selectedMonth])

  const byDate = useMemo(() => {
    const map: Record<string, { total: number; entries: { customer_name: string; amount: number; loan_type: string }[] }> = {}
    for (const t of transactions) {
      const dateStr = t.created_at ? t.created_at.split('T')[0] : ''
      if (!dateStr) continue
      if (!map[dateStr]) map[dateStr] = { total: 0, entries: [] }
      const amount = parseFloat(t.amount || 0)
      map[dateStr].total += amount
      map[dateStr].entries.push({
        customer_name: t.customer_name || '—',
        amount,
        loan_type: t.loan_type || '—',
      })
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [transactions])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Date-wise Records</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Collections entered by you only</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/collector/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48 border-border/50">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
          </Card>
        ) : byDate.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">No records in this period</CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {byDate.map(([dateStr, { total, entries }]) => (
              <Card key={dateStr} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <CardTitle className="text-lg">
                      {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </CardTitle>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-foreground">₹{total.toLocaleString('en-IN')}</span>
                      <p className="text-xs text-muted-foreground">{entries.length} payment(s)</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Customers you collected from</p>
                  <ul className="space-y-2">
                    {entries.map((e, i) => (
                      <li key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{e.customer_name}</span>
                          <span className="text-xs text-muted-foreground">({e.loan_type})</span>
                        </div>
                        <span className="font-semibold text-foreground">₹{e.amount.toLocaleString('en-IN')}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
