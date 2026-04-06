'use client'

import React, { useEffect } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Trash2, Plus, TrendingDown, TrendingUp, Wallet, Tag, X, Settings, Pencil, Menu } from 'lucide-react'
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

type ActiveTab = 'expenses' | 'income'

export default function MoneyManagerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('expenses')

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', payment_method: 'cash', category: '' })
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editExpenseForm, setEditExpenseForm] = useState({ description: '', amount: '', payment_method: 'cash', category: '' })

  // Income state
  const [incomes, setIncomes] = useState<Income[]>([])
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ description: '', amount: '', source: '', payment_method: 'cash' })
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [editIncomeForm, setEditIncomeForm] = useState({ description: '', amount: '', source: '', payment_method: 'cash' })

  // Categories state
  const [categories, setCategories] = useState<Category[]>([])
  const [showCategoryManager, setShowCategoryManager] = useState(false)
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
        category: expenseForm.category && expenseForm.category !== 'none' ? parseInt(expenseForm.category) : null,
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

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setEditExpenseForm({
      description: expense.description,
      amount: String(expense.amount),
      payment_method: expense.payment_method,
      category: expense.category ? String(expense.category) : '',
    })
  }

  const handleEditExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingExpense) return
    const amount = parseFloat(editExpenseForm.amount)
    if (!editExpenseForm.description.trim() || isNaN(amount) || amount <= 0) {
      setError('Please enter description and a valid amount')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const updated = await expensesApi.update(editingExpense.id, {
        description: editExpenseForm.description.trim(),
        amount,
        payment_method: editExpenseForm.payment_method,
        category: editExpenseForm.category && editExpenseForm.category !== 'none' ? parseInt(editExpenseForm.category) : null,
      })
      setExpenses((prev) => prev.map((exp) =>
        exp.id === editingExpense.id ? {
          ...exp,
          description: updated.description,
          amount: parseFloat(updated.amount),
          payment_method: updated.payment_method || 'cash',
          category: updated.category || null,
          category_name: updated.category_name || null,
        } : exp
      ))
      setEditingExpense(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update expense')
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

  const openEditIncome = (income: Income) => {
    setEditingIncome(income)
    setEditIncomeForm({
      description: income.description,
      amount: String(income.amount),
      source: income.source,
      payment_method: income.payment_method,
    })
  }

  const handleEditIncome = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingIncome) return
    const amount = parseFloat(editIncomeForm.amount)
    if (!editIncomeForm.source.trim() || isNaN(amount) || amount <= 0) {
      setError('Please enter source and a valid amount')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const updated = await incomeApi.update(editingIncome.id, {
        description: editIncomeForm.description.trim(),
        amount,
        source: editIncomeForm.source.trim(),
        payment_method: editIncomeForm.payment_method,
      })
      setIncomes((prev) => prev.map((inc) =>
        inc.id === editingIncome.id ? {
          ...inc,
          description: updated.description,
          amount: parseFloat(updated.amount),
          source: updated.source,
          payment_method: updated.payment_method || 'cash',
        } : inc
      ))
      setEditingIncome(null)
    } catch (err: any) {
      setError(err.message || 'Failed to update income')
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
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-card/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Money Manager</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Track expenses & income</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryManager(true)}
              className="text-muted-foreground whitespace-nowrap"
            >
              <Settings className="w-4 h-4 mr-1.5" />
              Categories
            </Button>
            <Button
              onClick={() => activeTab === 'expenses' ? setShowExpenseForm(true) : setShowIncomeForm(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {activeTab === 'expenses' ? 'Expense' : 'Income'}
            </Button>
            {/* Mobile Navigation */}
            <div className="flex md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader className="mb-6">
                    <SheetTitle>Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-4">
                    <SheetClose asChild>
                      <Button asChild className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Link href="/collections">Add Collection</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="outline" asChild className="w-full justify-start">
                        <Link href="/collections/datewise">Collections</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="outline" asChild className="w-full justify-start">
                        <Link href="/admin/customers">Customers</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="outline" asChild className="w-full justify-start">
                        <Link href="/admin/expenses">Money Manager</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="outline" asChild className="w-full justify-start border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10">
                        <Link href="/admin/cashbook">Cash Book</Link>
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Category Manager Modal */}
        {showCategoryManager && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCategoryManager(false)}>
            <Card className="w-full max-w-md border-border/50 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">Manage Categories</CardTitle>
                  <CardDescription>Create or delete expense categories</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowCategoryManager(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add category */}
                <div className="flex gap-2">
                  <Input
                    placeholder="New category name..."
                    className="border-border/50 flex-1"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    autoFocus
                  />
                  <Button
                    onClick={handleAddCategory}
                    disabled={isSubmitting || !newCategoryName.trim()}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Category list */}
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No categories yet. Create one above.</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-sm font-medium text-foreground">{cat.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

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
                      <label className="text-sm font-medium text-foreground">Description</label>
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

        {/* Edit Expense Modal */}
        {editingExpense && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingExpense(null)}>
            <Card className="w-full max-w-md border-border/50 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Edit Expense</CardTitle>
                <CardDescription>Update this expense entry</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEditExpense} className="space-y-4">
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
                        value={editExpenseForm.description}
                        onChange={(e) => setEditExpenseForm((p) => ({ ...p, description: e.target.value }))}
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
                        value={editExpenseForm.amount}
                        onChange={(e) => setEditExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Payment Method</label>
                        <Select value={editExpenseForm.payment_method} onValueChange={(value) => setEditExpenseForm((p) => ({ ...p, payment_method: value }))}>
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
                        <Select value={editExpenseForm.category} onValueChange={(value) => setEditExpenseForm((p) => ({ ...p, category: value }))}>
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
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditingExpense(null)} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Income Modal */}
        {editingIncome && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingIncome(null)}>
            <Card className="w-full max-w-md border-border/50 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Edit Income</CardTitle>
                <CardDescription>Update this income entry</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEditIncome} className="space-y-4">
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
                        value={editIncomeForm.source}
                        onChange={(e) => setEditIncomeForm((p) => ({ ...p, source: e.target.value }))}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Description</label>
                      <Input
                        name="description"
                        placeholder="Additional details..."
                        className="border-border/50"
                        value={editIncomeForm.description}
                        onChange={(e) => setEditIncomeForm((p) => ({ ...p, description: e.target.value }))}
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
                        value={editIncomeForm.amount}
                        onChange={(e) => setEditIncomeForm((p) => ({ ...p, amount: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Payment Method</label>
                      <Select value={editIncomeForm.payment_method} onValueChange={(value) => setEditIncomeForm((p) => ({ ...p, payment_method: value }))}>
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
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditingIncome(null)} disabled={isSubmitting}>
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
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6 items-start sm:items-center w-full">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="flex flex-row items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-sm font-medium text-muted-foreground shrink-0">Start Date:</label>
                <Input
                  type="date"
                  className="w-full sm:w-40 border-border/50"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-sm font-medium text-muted-foreground shrink-0">End Date:</label>
                <Input
                  type="date"
                  className="w-full sm:w-40 border-border/50"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          {activeTab === 'expenses' && categories.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 lg:ml-auto">
              <label className="text-sm font-medium text-muted-foreground shrink-0 hidden sm:block">Category:</label>
              <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full sm:w-44 border-border/50">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

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
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap sticky left-0 z-20 bg-card" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>Description</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Category</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Method</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {expenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-foreground">{expense.date}</td>
                            <td className="py-3 px-4 font-medium text-foreground sticky left-0 z-10 bg-card" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>{expense.description}</td>
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
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditExpense(expense)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 h-8 w-8 p-0"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
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
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap sticky left-0 z-20 bg-card" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>Source</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Description</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Method</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {incomes.map((income) => (
                          <tr key={income.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-foreground">{income.date}</td>
                            <td className="py-3 px-4 font-medium text-foreground sticky left-0 z-10 bg-card" style={{ boxShadow: '2px 0 5px -2px rgba(0,0,0,0.1)' }}>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-600">
                                {income.source}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-foreground">{income.description || '—'}</td>
                            <td className="py-3 px-4 text-right font-bold text-green-600">
                              ₹{income.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${income.payment_method === 'cash' ? 'bg-amber-500/20 text-amber-600' : 'bg-purple-500/20 text-purple-600'
                                }`}>
                                {income.payment_method}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditIncome(income)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 h-8 w-8 p-0"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteIncome(income.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="font-bold text-lg text-green-600">₹{totalIncome.toLocaleString('en-IN')}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
