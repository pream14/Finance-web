'use client'

import React, { useEffect } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus, TrendingDown } from 'lucide-react'
import { expensesApi } from '@/lib/api'

interface Expense {
  id: number
  description: string
  amount: number
  date: string
  created_by_name: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ description: '', amount: '' })
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadExpenses = async () => {
    setIsLoading(true)
    setError('')
    try {
      const params: { start_date?: string; end_date?: string } = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const data = await expensesApi.getAll(Object.keys(params).length ? params : undefined)
      setExpenses(Array.isArray(data) ? data.map((e: any) => ({
        id: e.id,
        description: e.description,
        amount: parseFloat(e.amount),
        date: e.created_at ? e.created_at.split('T')[0] : '',
        created_by_name: e.created_by_name || '—',
      })) : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses')
      setExpenses([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [startDate, endDate])

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    try {
      await expensesApi.delete(id)
      setExpenses((prev) => prev.filter((e) => e.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete')
    }
  }

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const amount = parseFloat(formData.amount)
    if (!formData.description.trim() || isNaN(amount) || amount <= 0) {
      setError('Please enter description and a valid amount')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const created = await expensesApi.create({
        description: formData.description.trim(),
        amount,
      })
      setExpenses((prev) => [{
        id: created.id,
        description: created.description,
        amount: parseFloat(created.amount),
        date: created.created_at ? created.created_at.split('T')[0] : '',
        created_by_name: created.created_by_name || '—',
      }, ...prev])
      setFormData({ description: '', amount: '' })
      setShowForm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to add expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <TrendingDown className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Manage Expenses</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Track and manage your expenses</p>
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
        {/* Add Expense Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
            <Card className="w-full max-w-md border-border/50 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Add New Expense</CardTitle>
                <CardDescription>Record a new expense entry</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Description</label>
                      <Input
                        name="description"
                        placeholder="Office Equipment"
                        className="border-border/50"
                        value={formData.description}
                        onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Amount (₹)</label>
                      <Input
                        name="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="border-border/50"
                        value={formData.amount}
                        onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Add Expense'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">₹{totalExpenses.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-2">Filtered total</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">
                ₹{expenses.length > 0 ? (totalExpenses / expenses.length).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Per transaction</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-4 flex-col sm:flex-row mb-6 items-start sm:items-center">
          <div className="flex gap-2 flex-wrap items-center">
            <Input
              type="date"
              placeholder="Start date"
              className="w-40 border-border/50"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              placeholder="End date"
              className="w-40 border-border/50"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Expenses List */}
        {isLoading ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">Loading expenses...</CardContent>
          </Card>
        ) : expenses.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No expenses found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
              <CardDescription>All recorded expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">By</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-foreground">{expense.date}</td>
                        <td className="py-3 px-4 font-medium text-foreground">{expense.description}</td>
                        <td className="py-3 px-4 text-right font-bold text-destructive">
                          ₹{expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{expense.created_by_name}</td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
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
