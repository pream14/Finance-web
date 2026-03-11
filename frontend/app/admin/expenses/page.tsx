'use client'

import React, { useEffect } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, TrendingDown, TrendingUp, Wallet, Tag, FolderPlus } from 'lucide-react'
import { expensesApi, incomeApi, expenseCategoriesApi } from '@/lib/api'

interface Expense {
  id: number
  description: string
  amount: number
  payment_method: string
  category: number | null
  category_name: string | null
  date: string
  created_by_name: string
}

interface Income {
  id: number
  description: string
  amount: number
  source: string
  payment_method: string
  date: string
  created_by_name: string
}

interface Category {
  id: number
  name: string
}

type ActiveTab = 'expenses' | 'income' | 'categories'

export default function MoneyManagerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('expenses')

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', payment_method: 'cash', category: '' })

  // Income state
  const [incomes, setIncomes] = useState<Income[]>([])
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: '', source: '', payment_method: 'cash' })

  // Categories state
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // UI state
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load categories
  const loadCategories = async () => {
    try {
      const data = await expenseCategoriesApi.getAll()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('Failed to load categories:', err)
    }
  }

  // Load expenses
  const loadExpenses = async () => {
    setIsLoading(true)
    setError('')
    try {
      const params: { start_date?: string; end_date?: string; category?: string } = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      if (filterCategory) params.category = filterCategory
      const data = await expensesApi.getAll(Object.keys(params).length ? params : undefined)
      setExpenses(Array.isArray(data) ? data.map((e: any) => ({
        id: e.id,
        description: e.description,
        amount: parseFloat(e.amount),
        payment_method: e.payment_method || 'cash',
        category: e.category || null,
        category_name: e.category_name || null,
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

  // Load incomes
  const loadIncomes = async () => {
    setIsLoading(true)
    setError('')
    try {
      const params: { start_date?: string; end_date?: string } = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const data = await incomeApi.getAll(Object.keys(params).length ? params : undefined)
      setIncomes(Array.isArray(data) ? data.map((i: any) => ({
        id: i.id,
        description: i.description,
        amount: parseFloat(i.amount),
        source: i.source,
        payment_method: i.payment_method || 'cash',
        date: i.created_at ? i.created_at.split('T')[0] : '',
        created_by_name: i.created_by_name || '—',
      })) : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load incomes')
      setIncomes([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (activeTab === 'expenses') loadExpenses()
    if (activeTab === 'income') loadIncomes()
  }, [startDate, endDate, filterCategory, activeTab])

  // Handlers
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
    const amount = parseFloat(expenseForm.amount)
    if (!expenseForm.description.trim() || isNaN(amount) || amount <= 0) {
      setError('Please enter description and a valid amount')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const created = await expensesApi.create({
        description: expenseForm.description.trim(),
        amount,
        payment_method: expenseForm.payment_method,
        category: expenseForm.category ? parseInt(expenseForm.category) : null,
      })
      setExpenses((prev) => [{
        id: created.id,
        description: created.description,
        amount: parseFloat(created.amount),
        payment_method: created.payment_method || 'cash',
        category: created.category || null,
        category_name: created.category_name || null,
        date: created.created_at ? created.created_at.split('T')[0] : '',
        created_by_name: created.created_by_name || '—',
      }, ...prev])
      setExpenseForm({ description: '', amount: '', payment_method: 'cash', category: '' })
      setShowExpenseForm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to add expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteIncome = async (id: number) => {
    if (!confirm('Are you sure you want to delete this income?')) return
    try {
      await incomeApi.delete(id)
      setIncomes((prev) => prev.filter((i) => i.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete')
    }
  }

  const handleAddIncome = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const amount = parseFloat(incomeForm.amount)
    if (!incomeForm.source.trim() || isNaN(amount) || amount <= 0) {
      setError('Please enter source and a valid amount')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const created = await incomeApi.create({
        description: incomeForm.description.trim(),
        amount,
        source: incomeForm.source.trim(),
        payment_method: incomeForm.payment_method,
      })
      setIncomes((prev) => [{
        id: created.id,
        description: created.description,
        amount: parseFloat(created.amount),
        source: created.source,
        payment_method: created.payment_method || 'cash',
        date: created.created_at ? created.created_at.split('T')[0] : '',
        created_by_name: created.created_by_name || '—',
      }, ...prev])
      setIncomeForm({ description: '', amount: '', source: '', payment_method: 'cash' })
      setShowIncomeForm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to add income')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setIsSubmitting(true)
    try {
      const created = await expenseCategoriesApi.create({ name: newCategoryName.trim() })
      setCategories((prev) => [...prev, created])
      setNewCategoryName('')
    } catch (err: any) {
      setError(err.message || 'Failed to add category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category? Expenses using it will lose their category.')) return
    try {
      await expenseCategoriesApi.delete(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete category')
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)

  const tabs = [
    { key: 'expenses' as ActiveTab, label: 'Expenses', icon: TrendingDown, color: 'text-red-500' },
    { key: 'income' as ActiveTab, label: 'Income', icon: TrendingUp, color: 'text-green-500' },
    { key: 'categories' as ActiveTab, label: 'Categories', icon: Tag, color: 'text-blue-500' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Money Manager</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Track expenses & income</p>
            </div>
          </div>
          {activeTab !== 'categories' && (
            <Button
              onClick={() => activeTab === 'expenses' ? setShowExpenseForm(true) : setShowIncomeForm(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {activeTab === 'expenses' ? 'Expense' : 'Income'}
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Add Expense Modal */}
        {showExpenseForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExpenseForm(false)}>
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
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
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
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Payment Method</label>
                        <Select value={expenseForm.payment_method} onValueChange={(value) => setExpenseForm((p) => ({ ...p, payment_method: value }))}>
                          <SelectTrigger className="border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Category</label>
                        <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm((p) => ({ ...p, category: value }))}>
                          <SelectTrigger className="border-border/50">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Category</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Add Expense'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowExpenseForm(false)} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Income Modal */}
        {showIncomeForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowIncomeForm(false)}>
            <Card className="w-full max-w-md border-border/50 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Add New Income</CardTitle>
                <CardDescription>Record income from other sources</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddIncome} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Source</label>
                      <Input
                        name="source"
                        placeholder="e.g., House Rent, Shop Rent"
                        className="border-border/50"
                        value={incomeForm.source}
                        onChange={(e) => setIncomeForm((p) => ({ ...p, source: e.target.value }))}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Description (optional)</label>
                      <Input
                        name="description"
                        placeholder="Additional details..."
                        className="border-border/50"
                        value={incomeForm.description}
                        onChange={(e) => setIncomeForm((p) => ({ ...p, description: e.target.value }))}
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
                        value={incomeForm.amount}
                        onChange={(e) => setIncomeForm((p) => ({ ...p, amount: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Payment Method</label>
                      <Select value={incomeForm.payment_method} onValueChange={(value) => setIncomeForm((p) => ({ ...p, payment_method: value }))}>
                        <SelectTrigger className="border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Add Income'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowIncomeForm(false)} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-red-500/5 to-red-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">₹{totalExpenses.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-2">Filtered total</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-green-500/5 to-green-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">₹{totalIncome.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-2">From other sources</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{(totalIncome - totalExpenses).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Income - Expenses</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-muted/50 rounded-lg p-1 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeTab === tab.key ? tab.color : ''}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Filters (for expenses & income tabs) */}
        {activeTab !== 'categories' && (
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
              {activeTab === 'expenses' && categories.length > 0 && (
                <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value === 'all' ? '' : value)}>
                  <SelectTrigger className="w-44 border-border/50">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <>
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
                  <CardDescription>{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Method</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {expenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-foreground">{expense.date}</td>
                            <td className="py-3 px-4 font-medium text-foreground">{expense.description}</td>
                            <td className="py-3 px-4">
                              {expense.category_name ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-600">
                                  {expense.category_name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-destructive">
                              ₹{expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${expense.payment_method === 'cash' ? 'bg-amber-500/20 text-amber-600' : 'bg-purple-500/20 text-purple-600'
                                }`}>
                                {expense.payment_method}
                              </span>
                            </td>
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
                  <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-lg text-red-600">₹{totalExpenses.toLocaleString('en-IN')}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <>
            {isLoading ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center text-muted-foreground">Loading income...</CardContent>
              </Card>
            ) : incomes.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No income entries found</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Income Details</CardTitle>
                  <CardDescription>{incomes.length} entr{incomes.length !== 1 ? 'ies' : 'y'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Method</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {incomes.map((income) => (
                          <tr key={income.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-foreground">{income.date}</td>
                            <td className="py-3 px-4 font-medium text-foreground">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-600">
                                {income.source}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-foreground">{income.description || '—'}</td>
                            <td className="py-3 px-4 text-right font-bold text-green-600">
                              +₹{income.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${income.payment_method === 'cash' ? 'bg-amber-500/20 text-amber-600' : 'bg-purple-500/20 text-purple-600'
                                }`}>
                                {income.payment_method}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteIncome(income.id)}
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
                  <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-lg text-green-600">+₹{totalIncome.toLocaleString('en-IN')}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            {/* Add Category */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-primary" />
                  Create Category
                </CardTitle>
                <CardDescription>Categories help organize your expenses (e.g., Shop, House, Office)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter category name..."
                    className="border-border/50 flex-1"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <Button
                    onClick={handleAddCategory}
                    disabled={isSubmitting || !newCategoryName.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Category List */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>All Categories</CardTitle>
                <CardDescription>{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</CardDescription>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <div className="py-8 text-center">
                    <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No categories created yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create categories above to organize your expenses</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/30"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-foreground">{cat.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
