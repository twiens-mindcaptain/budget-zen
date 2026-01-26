'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { getServerSupabase } from '@/lib/supabase'
import {
  insertTransactionSchema,
  type ApiResponse,
  type Transaction,
  type MonthlyStatistics,
  type BillItem,
  type SinkingFundItem,
  type SafeToSpendData,
} from '@/lib/types'
import { format } from 'date-fns'

/**
 * Creates a new transaction in the database
 */
export async function createTransaction(
  data: unknown
): Promise<ApiResponse<Transaction>> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in to create transactions.',
      }
    }

    const validationResult = insertTransactionSchema.safeParse(data)

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => err.message)
        .join(', ')

      return {
        success: false,
        error: `Validation failed: ${errorMessages}`,
      }
    }

    const validatedData = validationResult.data

    // Determine transaction type and normalize amount with sign
    let finalAmount = Math.abs(parseFloat(validatedData.amount))

    if (validatedData.category_id) {
      // If category is selected, determine type from category
      const { data: category } = await getServerSupabase()
        .from('categories')
        .select('type')
        .eq('id', validatedData.category_id)
        .single()

      // INCOME = positive, all others = negative
      // Handle both 'INCOME' (new ZBB) and 'income' (legacy) types
      if (category?.type?.toUpperCase() !== 'INCOME') {
        finalAmount = -finalAmount
      }
    } else {
      // No category: check if amount starts with + (income) or treat as expense
      const amountStr = validatedData.amount.toString()
      if (!amountStr.startsWith('+')) {
        finalAmount = -finalAmount
      }
    }

    const { data: transaction, error: insertError } = await getServerSupabase()
      .from('transactions')
      .insert({
        user_id: userId,
        category_id: validatedData.category_id || null,
        amount: finalAmount.toString(),
        date: validatedData.date && /^\d{4}-\d{2}-\d{2}$/.test(validatedData.date) ? validatedData.date : format(new Date(), 'yyyy-MM-dd'),
        memo: validatedData.memo || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return {
        success: false,
        error: `Failed to create transaction: ${insertError.message}`,
      }
    }

    revalidatePath('/')

    return {
      success: true,
      data: transaction as Transaction,
    }
  } catch (error) {
    console.error('Unexpected error in createTransaction:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}

/**
 * Fetches transactions for the current user, optionally for a specific month
 */
export async function getRecentTransactions(limit: number = 50, monthDate?: Date) {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    let query = getServerSupabase()
      .from('transactions')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    // If monthDate is provided, filter to that month only
    if (monthDate) {
      const startOfMonth = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), 'yyyy-MM-dd')
      const endOfMonth = format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), 'yyyy-MM-dd')
      query = query.gte('date', startOfMonth).lte('date', endOfMonth)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase fetch error:', error)
      throw new Error(`Failed to fetch transactions: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getRecentTransactions:', error)
    throw error
  }
}

/**
 * Fetches all active categories for the current user
 */
export async function getCategories() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { data, error } = await getServerSupabase()
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Supabase fetch error:', error)
      throw new Error(`Failed to fetch categories: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getCategories:', error)
    throw error
  }
}

/**
 * Calculates monthly statistics (income, expenses, balance) for a specific month
 * Reads from pre-aggregated monthly_summaries table (updated via triggers)
 * Falls back to real-time calculation if no summary exists
 */
export async function getMonthlyStatistics(monthDate: Date = new Date()): Promise<MonthlyStatistics> {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const monthIso = format(monthDate, 'yyyy-MM')

    // Try to read from pre-aggregated summary first (fast path)
    const { data: summary, error: summaryError } = await getServerSupabase()
      .from('monthly_summaries')
      .select('total_income, total_expenses, balance')
      .eq('user_id', userId)
      .eq('month_iso', monthIso)
      .single()

    if (!summaryError && summary) {
      // Use cached summary
      return {
        income: parseFloat(summary.total_income).toFixed(2),
        expenses: parseFloat(summary.total_expenses).toFixed(2),
        balance: parseFloat(summary.balance).toFixed(2),
      }
    }

    // Fallback: Calculate from transactions (for months without data)
    const startOfMonth = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), 'yyyy-MM-dd')
    const endOfMonth = format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), 'yyyy-MM-dd')

    const { data, error } = await getServerSupabase()
      .from('transactions')
      .select(`
        amount,
        category:categories(type)
      `)
      .eq('user_id', userId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    if (error) {
      console.error('Supabase fetch error:', error)
      throw new Error(`Failed to fetch monthly statistics: ${error.message}`)
    }

    let totalIncome = 0
    let totalExpenses = 0

    data?.forEach((transaction) => {
      const amount = Math.abs(parseFloat(transaction.amount))
      const categoryData = transaction.category
      const category = Array.isArray(categoryData) ? categoryData[0] : categoryData
      const isIncome = category?.type?.toUpperCase() === 'INCOME'

      if (isIncome) {
        totalIncome += amount
      } else if (amount > 0) {
        totalExpenses += amount
      }
    })

    const balance = totalIncome - totalExpenses

    return {
      income: totalIncome.toFixed(2),
      expenses: totalExpenses.toFixed(2),
      balance: balance.toFixed(2),
    }
  } catch (error) {
    console.error('Error in getMonthlyStatistics:', error)
    throw error
  }
}

/**
 * Updates an existing transaction in the database
 */
export async function updateTransaction(
  transactionId: string,
  data: unknown
): Promise<ApiResponse<Transaction>> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in to update transactions.',
      }
    }

    const validationResult = insertTransactionSchema.safeParse(data)

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((err) => err.message)
        .join(', ')

      return {
        success: false,
        error: `Validation failed: ${errorMessages}`,
      }
    }

    const validatedData = validationResult.data

    let finalAmount = Math.abs(parseFloat(validatedData.amount))

    if (validatedData.category_id) {
      const { data: category } = await getServerSupabase()
        .from('categories')
        .select('type')
        .eq('id', validatedData.category_id)
        .single()

      // Handle both 'INCOME' (new ZBB) and 'income' (legacy) types
      if (category?.type?.toUpperCase() !== 'INCOME') {
        finalAmount = -finalAmount
      }
    } else {
      const amountStr = validatedData.amount.toString()
      if (!amountStr.startsWith('+')) {
        finalAmount = -finalAmount
      }
    }

    const { data: transaction, error: updateError } = await getServerSupabase()
      .from('transactions')
      .update({
        category_id: validatedData.category_id || null,
        amount: finalAmount.toString(),
        date: validatedData.date && /^\d{4}-\d{2}-\d{2}$/.test(validatedData.date) ? validatedData.date : format(new Date(), 'yyyy-MM-dd'),
        memo: validatedData.memo || null,
      })
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Supabase update error:', updateError)
      return {
        success: false,
        error: `Failed to update transaction: ${updateError.message}`,
      }
    }

    revalidatePath('/')

    return {
      success: true,
      data: transaction as Transaction,
    }
  } catch (error) {
    console.error('Unexpected error in updateTransaction:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}

/**
 * Deletes a transaction from the database
 */
export async function deleteTransaction(
  transactionId: string
): Promise<ApiResponse<null>> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in to delete transactions.',
      }
    }

    const { error: deleteError } = await getServerSupabase()
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Supabase delete error:', deleteError)
      return {
        success: false,
        error: `Failed to delete transaction: ${deleteError.message}`,
      }
    }

    revalidatePath('/')

    return {
      success: true,
      data: null,
    }
  } catch (error) {
    console.error('Unexpected error in deleteTransaction:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}

/**
 * Get bills checklist for a specific month
 * Returns FIX categories with target_amount and payment status
 */
export async function getBillsChecklist(monthDate: Date = new Date()): Promise<BillItem[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const startOfMonth = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), 'yyyy-MM-dd')
  const endOfMonth = format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), 'yyyy-MM-dd')

  // Get all FIX categories with target amounts
  const { data: categories, error } = await getServerSupabase()
    .from('categories')
    .select('id, name, icon, color, target_amount')
    .eq('user_id', userId)
    .eq('type', 'FIX')
    .eq('is_active', true)
    .not('target_amount', 'is', null)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch FIX categories:', error)
    return [] // Return empty array instead of throwing
  }

  const bills: BillItem[] = []

  for (const category of categories || []) {
    // Check if there's a transaction this month for this category
    const { data: transactions } = await getServerSupabase()
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', category.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .limit(1)

    bills.push({
      id: category.id,
      name: category.name || 'Unnamed',
      icon: category.icon || 'HelpCircle',
      color: category.color || '#71717a',
      target_amount: category.target_amount || '0.00',
      is_paid: !!(transactions && transactions.length > 0),
    })
  }

  return bills
}

/**
 * Get sinking funds with progress
 * Returns SF1/SF2 categories with saved balance
 *
 * Saved balance calculation:
 * - Sum only assigned_amount from all months (NOT start_balance, which already contains carryover)
 * - Subtract total spent (negative transactions)
 */
export async function getSinkingFunds(): Promise<SinkingFundItem[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Get all SF1 and SF2 categories
  const { data: categories, error } = await getServerSupabase()
    .from('categories')
    .select('id, name, icon, color, target_amount, due_date')
    .eq('user_id', userId)
    .in('type', ['SF1', 'SF2'])
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch sinking fund categories:', error)
    return []
  }

  const funds: SinkingFundItem[] = []

  for (const category of categories || []) {
    // Calculate total assigned from monthly_budgets (all time)
    // IMPORTANT: Only sum assigned_amount, NOT start_balance!
    // start_balance already contains carryover from previous months
    // Summing both would double-count the accumulated savings
    const { data: budgets } = await getServerSupabase()
      .from('monthly_budgets')
      .select('assigned_amount')
      .eq('user_id', userId)
      .eq('category_id', category.id)

    const totalAssigned = (budgets || []).reduce((sum, budget) => {
      return sum + parseFloat(budget.assigned_amount || '0')
    }, 0)

    // Calculate total spent (all time) - expenses are negative amounts
    const { data: transactions } = await getServerSupabase()
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('category_id', category.id)

    const totalSpent = (transactions || []).reduce((sum, tx) => {
      const amount = parseFloat(tx.amount)
      // Only count negative amounts (expenses)
      return amount < 0 ? sum + Math.abs(amount) : sum
    }, 0)

    // Saved balance = what was assigned minus what was spent
    const savedBalance = Math.max(0, totalAssigned - totalSpent)

    const targetAmount = parseFloat(category.target_amount || '0')
    const progressPercentage = targetAmount > 0
      ? Math.min((savedBalance / targetAmount) * 100, 100)
      : 0

    funds.push({
      id: category.id,
      name: category.name || 'Unnamed',
      icon: category.icon || 'PiggyBank',
      color: category.color || '#71717a',
      target_amount: category.target_amount || '0.00',
      due_date: category.due_date,
      saved_balance: savedBalance.toFixed(2),
      progress_percentage: Math.round(progressPercentage),
    })
  }

  return funds
}

/**
 * Calculate Safe to Spend (ZBB style)
 * Formula: Total Income - Total Assigned = Available to Assign
 */
export async function getSafeToSpend(monthDate: Date = new Date()): Promise<SafeToSpendData> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const monthIso = format(monthDate, 'yyyy-MM')
  const startOfMonth = format(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), 'yyyy-MM-dd')
  const endOfMonth = format(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0), 'yyyy-MM-dd')

  // Get all income transactions this month
  const { data: incomeTransactions } = await getServerSupabase()
    .from('transactions')
    .select('amount, category:categories!inner(type)')
    .eq('user_id', userId)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth)

  // Calculate total income (positive amounts from INCOME categories)
  const totalIncome = (incomeTransactions || []).reduce((sum, tx) => {
    const amount = parseFloat(tx.amount)
    return amount > 0 ? sum + amount : sum
  }, 0)

  // Get all assigned amounts for this month
  const { data: budgets } = await getServerSupabase()
    .from('monthly_budgets')
    .select('assigned_amount')
    .eq('user_id', userId)
    .eq('month_iso', monthIso)

  const totalAssigned = (budgets || []).reduce((sum, budget) => {
    return sum + parseFloat(budget.assigned_amount || '0')
  }, 0)

  // Available to assign = Income - Assigned
  const availableToAssign = totalIncome - totalAssigned

  return {
    safeToSpend: availableToAssign.toFixed(2),
    totalIncome: totalIncome.toFixed(2),
    totalAssigned: totalAssigned.toFixed(2),
    availableToAssign: availableToAssign.toFixed(2),
  }
}

/**
 * Mark a bill as paid by creating a transaction
 */
export async function markBillPaid(categoryId: string): Promise<ApiResponse<Transaction>> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get category details
  const { data: category, error: categoryError } = await getServerSupabase()
    .from('categories')
    .select('id, target_amount, name')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .single()

  if (categoryError || !category) {
    return { success: false, error: 'Category not found' }
  }

  // Create transaction (negative amount for expense)
  const amount = -Math.abs(parseFloat(category.target_amount || '0'))

  const { data: transaction, error: txError } = await getServerSupabase()
    .from('transactions')
    .insert({
      user_id: userId,
      category_id: category.id,
      amount: amount.toString(),
      date: format(new Date(), 'yyyy-MM-dd'),
      memo: `Bill payment: ${category.name}`,
    })
    .select()
    .single()

  if (txError) {
    return { success: false, error: 'Failed to create transaction' }
  }

  revalidatePath('/')
  return { success: true, data: transaction as Transaction }
}
