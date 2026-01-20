'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { getServerSupabase } from '@/lib/supabase'
import {
  insertMonthlyBudgetSchema,
  type ApiResponse,
  type MonthlyBudget,
  type MonthlyBudgetWithActivity,
  type BudgetSummary,
  type Category,
  type RolloverStrategy,
} from '@/lib/types'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

/**
 * Get monthly budgets for a specific month with activity calculations
 * IMPORTANT: start_balance is calculated dynamically from previous month's available balance
 */
export async function getMonthlyBudgets(
  monthDate: Date = new Date()
): Promise<MonthlyBudgetWithActivity[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const monthIso = format(monthStart, 'yyyy-MM')
  const startDateStr = format(monthStart, 'yyyy-MM-dd')
  const endDateStr = format(monthEnd, 'yyyy-MM-dd')

  // Previous month dates for rollover calculation
  const prevMonthStart = startOfMonth(subMonths(monthDate, 1))
  const prevMonthEnd = endOfMonth(subMonths(monthDate, 1))
  const prevMonthIso = format(prevMonthStart, 'yyyy-MM')
  const prevStartDateStr = format(prevMonthStart, 'yyyy-MM-dd')
  const prevEndDateStr = format(prevMonthEnd, 'yyyy-MM-dd')

  // Get all active categories for the user
  const { data: categories, error: catError } = await getServerSupabase()
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (catError) {
    console.error('Error fetching categories:', catError)
    throw new Error('Failed to fetch categories')
  }

  // Get existing monthly budgets for this month
  const { data: budgets, error: budgetError } = await getServerSupabase()
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month_iso', monthIso)

  if (budgetError) {
    console.error('Error fetching monthly budgets:', budgetError)
    throw new Error('Failed to fetch monthly budgets')
  }

  // Get previous month's budgets for rollover calculation
  const { data: prevBudgets } = await getServerSupabase()
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month_iso', prevMonthIso)

  // Get all transactions for this month
  const { data: transactions, error: txError } = await getServerSupabase()
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  if (txError) {
    console.error('Error fetching transactions:', txError)
    throw new Error('Failed to fetch transactions')
  }

  // Get previous month's transactions for rollover calculation
  const { data: prevTransactions } = await getServerSupabase()
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', userId)
    .gte('date', prevStartDateStr)
    .lte('date', prevEndDateStr)

  // Calculate activity per category for current month
  const activityByCategory: Record<string, number> = {}
  for (const tx of transactions || []) {
    if (tx.category_id) {
      activityByCategory[tx.category_id] =
        (activityByCategory[tx.category_id] || 0) + parseFloat(tx.amount)
    }
  }

  // Calculate activity per category for previous month
  const prevActivityByCategory: Record<string, number> = {}
  for (const tx of prevTransactions || []) {
    if (tx.category_id) {
      prevActivityByCategory[tx.category_id] =
        (prevActivityByCategory[tx.category_id] || 0) + parseFloat(tx.amount)
    }
  }

  // Map budgets by category_id
  const budgetByCategory: Record<string, MonthlyBudget> = {}
  for (const budget of budgets || []) {
    budgetByCategory[budget.category_id] = budget
  }

  // Map previous budgets by category_id
  const prevBudgetByCategory: Record<string, MonthlyBudget> = {}
  for (const budget of prevBudgets || []) {
    prevBudgetByCategory[budget.category_id] = budget
  }

  // Build result: one entry per category
  const result: MonthlyBudgetWithActivity[] = []

  for (const category of categories || []) {
    const budget = budgetByCategory[category.id]
    const activity = activityByCategory[category.id] || 0
    const assignedAmount = budget ? parseFloat(budget.assigned_amount) : 0

    // Calculate start_balance dynamically from previous month
    let startBalance = 0
    const strategy = (category.rollover_strategy || 'RESET') as RolloverStrategy

    if (strategy !== 'RESET') {
      const prevBudget = prevBudgetByCategory[category.id]
      if (prevBudget) {
        const prevStartBalance = parseFloat(prevBudget.start_balance)
        const prevAssigned = parseFloat(prevBudget.assigned_amount)
        const prevActivity = prevActivityByCategory[category.id] || 0
        const prevAvailable = prevStartBalance + prevAssigned + prevActivity

        if (strategy === 'ACCUMULATE') {
          startBalance = prevAvailable
        } else if (strategy === 'SWEEP') {
          startBalance = prevAvailable < 0 ? prevAvailable : 0
        }
      }
    }

    const available = startBalance + assignedAmount + activity

    result.push({
      id: budget?.id || `virtual-${category.id}`,
      user_id: userId,
      category_id: category.id,
      month_iso: monthIso,
      assigned_amount: assignedAmount.toFixed(2),
      start_balance: startBalance.toFixed(2),
      created_at: budget?.created_at || new Date().toISOString(),
      updated_at: budget?.updated_at || new Date().toISOString(),
      activity: activity.toFixed(2),
      available: available.toFixed(2),
      category: category as Category,
    })
  }

  return result
}

/**
 * Get budget summary for a month (To Be Budgeted calculation)
 *
 * To Be Budgeted = Income + Leftover from RESET categories (previous month) - Assigned
 *
 * For RESET categories: leftover goes back to the general pool
 * For ACCUMULATE categories: leftover stays in the category (handled via start_balance)
 */
export async function getBudgetSummary(
  monthDate: Date = new Date()
): Promise<BudgetSummary> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const monthIso = format(monthStart, 'yyyy-MM')
  const startDateStr = format(monthStart, 'yyyy-MM-dd')
  const endDateStr = format(monthEnd, 'yyyy-MM-dd')

  // Previous month for carryover calculation
  const prevMonthStart = startOfMonth(subMonths(monthDate, 1))
  const prevMonthEnd = endOfMonth(subMonths(monthDate, 1))
  const prevMonthIso = format(prevMonthStart, 'yyyy-MM')
  const prevStartDateStr = format(prevMonthStart, 'yyyy-MM-dd')
  const prevEndDateStr = format(prevMonthEnd, 'yyyy-MM-dd')

  // Get all categories
  const { data: categories } = await getServerSupabase()
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  // Get all income transactions for this month (from INCOME categories)
  // Handle both 'INCOME' (new ZBB) and 'income' (legacy) types
  const incomeCategoryIds = (categories || [])
    .filter((c) => c.type?.toUpperCase() === 'INCOME')
    .map((c) => c.id)

  let totalIncome = 0
  if (incomeCategoryIds.length > 0) {
    const { data: incomeTx } = await getServerSupabase()
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .in('category_id', incomeCategoryIds)
      .gte('date', startDateStr)
      .lte('date', endDateStr)

    totalIncome = (incomeTx || []).reduce(
      (sum, tx) => sum + Math.abs(parseFloat(tx.amount)),
      0
    )
  }

  // Calculate leftover from previous month's RESET categories
  // This money goes back to the general pool for budgeting
  let leftoverFromReset = 0

  // Get previous month's budgets
  const { data: prevBudgets } = await getServerSupabase()
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month_iso', prevMonthIso)

  // Get previous month's transactions
  const { data: prevTransactions } = await getServerSupabase()
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', userId)
    .gte('date', prevStartDateStr)
    .lte('date', prevEndDateStr)

  // Calculate previous month's activity per category
  const prevActivityByCategory: Record<string, number> = {}
  for (const tx of prevTransactions || []) {
    if (tx.category_id) {
      prevActivityByCategory[tx.category_id] =
        (prevActivityByCategory[tx.category_id] || 0) + parseFloat(tx.amount)
    }
  }

  // Map previous budgets
  const prevBudgetByCategory: Record<string, MonthlyBudget> = {}
  for (const budget of prevBudgets || []) {
    prevBudgetByCategory[budget.category_id] = budget
  }

  // Calculate leftover from RESET categories
  for (const category of categories || []) {
    if (category.type?.toUpperCase() === 'INCOME') continue // Skip income categories

    const strategy = (category.rollover_strategy || 'RESET') as RolloverStrategy

    // Only RESET categories contribute to the pool
    if (strategy === 'RESET') {
      const prevBudget = prevBudgetByCategory[category.id]
      const prevActivity = prevActivityByCategory[category.id] || 0

      if (prevBudget) {
        // Category has a budget entry - calculate full available
        const prevStartBalance = parseFloat(prevBudget.start_balance)
        const prevAssigned = parseFloat(prevBudget.assigned_amount)
        const prevAvailable = prevStartBalance + prevAssigned + prevActivity

        // Positive leftover goes back to pool, negative (overspent) also affects pool
        leftoverFromReset += prevAvailable
      } else if (prevActivity !== 0) {
        // Category has activity but no budget entry
        // For RESET categories, available = 0 + 0 + activity = activity
        // Negative activity (expenses) means overspending that reduces the pool
        leftoverFromReset += prevActivity
      }
    }
  }

  // Get monthly budgets with activity for current month
  const budgets = await getMonthlyBudgets(monthDate)

  // Calculate totals (exclude INCOME categories)
  // Handle both 'INCOME' (new ZBB) and 'income' (legacy) types
  const expenseBudgets = budgets.filter(
    (b) => b.category.type?.toUpperCase() !== 'INCOME'
  )

  const totalAssigned = expenseBudgets.reduce(
    (sum, b) => sum + parseFloat(b.assigned_amount),
    0
  )

  const totalActivity = expenseBudgets.reduce(
    (sum, b) => sum + parseFloat(b.activity),
    0
  )

  const totalAvailable = expenseBudgets.reduce(
    (sum, b) => sum + parseFloat(b.available),
    0
  )

  const overspent = expenseBudgets
    .filter((b) => parseFloat(b.available) < 0)
    .reduce((sum, b) => sum + Math.abs(parseFloat(b.available)), 0)

  // To Be Budgeted = Income + Leftover from RESET categories - Assigned
  const toBeBudgeted = totalIncome + leftoverFromReset - totalAssigned

  return {
    month: monthIso,
    toBeBudgeted: toBeBudgeted.toFixed(2),
    totalIncome: totalIncome.toFixed(2),
    leftoverFromReset: leftoverFromReset.toFixed(2),
    totalAssigned: totalAssigned.toFixed(2),
    totalActivity: totalActivity.toFixed(2),
    totalAvailable: totalAvailable.toFixed(2),
    overspent: overspent.toFixed(2),
  }
}

/**
 * Assign budget to a category for a specific month
 */
export async function assignBudget(
  categoryId: string,
  monthIso: string,
  amount: string
): Promise<ApiResponse<MonthlyBudget>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validated = insertMonthlyBudgetSchema.parse({
      category_id: categoryId,
      month_iso: monthIso,
      assigned_amount: amount,
    })

    // Check if budget already exists for this category/month
    const { data: existing } = await getServerSupabase()
      .from('monthly_budgets')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', validated.category_id)
      .eq('month_iso', validated.month_iso)
      .single()

    if (existing) {
      // Update existing budget
      const { data: budget, error } = await getServerSupabase()
        .from('monthly_budgets')
        .update({
          assigned_amount: validated.assigned_amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating budget:', error)
        return { success: false, error: 'Failed to update budget' }
      }

      revalidatePath('/[locale]', 'layout')
      return { success: true, data: budget }
    } else {
      // Calculate start_balance from previous month rollover
      const monthDate = new Date(`${validated.month_iso}-01`)
      const startBalance = await calculateRollover(
        validated.category_id,
        userId,
        monthDate
      )

      // Create new budget
      const { data: budget, error } = await getServerSupabase()
        .from('monthly_budgets')
        .insert({
          user_id: userId,
          category_id: validated.category_id,
          month_iso: validated.month_iso,
          assigned_amount: validated.assigned_amount,
          start_balance: startBalance.toFixed(2),
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating budget:', error)
        return { success: false, error: 'Failed to create budget' }
      }

      revalidatePath('/[locale]', 'layout')
      return { success: true, data: budget }
    }
  } catch (error) {
    console.error('Error in assignBudget:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Calculate rollover amount from previous month based on category's rollover strategy
 */
async function calculateRollover(
  categoryId: string,
  userId: string,
  currentMonth: Date
): Promise<number> {
  const prevMonth = subMonths(currentMonth, 1)
  const prevMonthIso = format(startOfMonth(prevMonth), 'yyyy-MM')
  const prevMonthStart = format(startOfMonth(prevMonth), 'yyyy-MM-dd')
  const prevMonthEnd = format(endOfMonth(prevMonth), 'yyyy-MM-dd')

  // Get category with rollover strategy
  const { data: category } = await getServerSupabase()
    .from('categories')
    .select('rollover_strategy')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .single()

  if (!category) return 0

  const strategy = (category.rollover_strategy || 'RESET') as RolloverStrategy

  // RESET strategy: no carryover
  if (strategy === 'RESET') return 0

  // Get previous month's budget
  const { data: prevBudget } = await getServerSupabase()
    .from('monthly_budgets')
    .select('assigned_amount, start_balance')
    .eq('category_id', categoryId)
    .eq('user_id', userId)
    .eq('month_iso', prevMonthIso)
    .single()

  if (!prevBudget) return 0

  // Get previous month's activity
  const { data: transactions } = await getServerSupabase()
    .from('transactions')
    .select('amount')
    .eq('category_id', categoryId)
    .eq('user_id', userId)
    .gte('date', prevMonthStart)
    .lte('date', prevMonthEnd)

  const activity = (transactions || []).reduce(
    (sum, tx) => sum + parseFloat(tx.amount),
    0
  )

  // Calculate previous available
  const prevStartBalance = parseFloat(prevBudget.start_balance)
  const prevAssignedAmount = parseFloat(prevBudget.assigned_amount)
  const prevAvailable = prevStartBalance + prevAssignedAmount + activity

  // Apply rollover strategy
  switch (strategy) {
    case 'ACCUMULATE':
      // Carry over everything (positive or negative)
      return prevAvailable
    case 'SWEEP':
      // Only carry over negative (overspending)
      return prevAvailable < 0 ? prevAvailable : 0
    default:
      return 0
  }
}

/**
 * Initialize monthly budgets for a new month (auto-create from previous month)
 */
export async function initializeMonth(
  monthDate: Date = new Date()
): Promise<ApiResponse<number>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const monthStart = startOfMonth(monthDate)
    const monthIso = format(monthStart, 'yyyy-MM')

    // Get all expense categories (not INCOME)
    // Handle both 'INCOME' (new ZBB) and 'income' (legacy) types
    const { data: allCategories } = await getServerSupabase()
      .from('categories')
      .select('id, type')
      .eq('user_id', userId)
      .eq('is_active', true)

    // Filter out income categories (case-insensitive)
    const categories = (allCategories || []).filter(
      (c) => c.type?.toUpperCase() !== 'INCOME'
    )

    if (categories.length === 0) {
      return { success: true, data: 0 }
    }

    let created = 0

    for (const category of categories) {
      // Check if budget already exists
      const { data: existing } = await getServerSupabase()
        .from('monthly_budgets')
        .select('id')
        .eq('user_id', userId)
        .eq('category_id', category.id)
        .eq('month_iso', monthIso)
        .single()

      if (!existing) {
        // Calculate start_balance from rollover
        const startBalance = await calculateRollover(
          category.id,
          userId,
          monthStart
        )

        // Create budget with start_balance only (assigned_amount = 0)
        const { error } = await getServerSupabase()
          .from('monthly_budgets')
          .insert({
            user_id: userId,
            category_id: category.id,
            month_iso: monthIso,
            assigned_amount: '0.00',
            start_balance: startBalance.toFixed(2),
          })

        if (!error) {
          created++
        }
      }
    }

    revalidatePath('/[locale]', 'layout')
    return { success: true, data: created }
  } catch (error) {
    console.error('Error in initializeMonth:', error)
    return { success: false, error: 'Failed to initialize month' }
  }
}

/**
 * Quick assign: Distribute remaining "To Be Budgeted" across categories
 */
export async function quickAssign(
  categoryIds: string[],
  monthDate: Date = new Date()
): Promise<ApiResponse<number>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (categoryIds.length === 0) {
      return { success: false, error: 'No categories selected' }
    }

    // Get current budget summary
    const summary = await getBudgetSummary(monthDate)
    const toBeBudgeted = parseFloat(summary.toBeBudgeted)

    if (toBeBudgeted <= 0) {
      return { success: false, error: 'No funds available to assign' }
    }

    // Distribute evenly
    const amountPerCategory = (toBeBudgeted / categoryIds.length).toFixed(2)
    const monthIso = format(startOfMonth(monthDate), 'yyyy-MM')

    let assigned = 0
    for (const categoryId of categoryIds) {
      const result = await assignBudget(categoryId, monthIso, amountPerCategory)
      if (result.success) {
        assigned++
      }
    }

    revalidatePath('/[locale]', 'layout')
    return { success: true, data: assigned }
  } catch (error) {
    console.error('Error in quickAssign:', error)
    return { success: false, error: 'Failed to quick assign' }
  }
}

/**
 * Calculate suggested monthly budget amount for a category
 *
 * - FIX: Returns target_amount (monthly bill amount)
 * - SF1: Returns (target_amount - saved_balance) / months_remaining
 * - VARIABLE/SF2/INCOME: Returns null (no automatic suggestion)
 */
export async function getSuggestedAmount(
  categoryId: string,
  monthDate: Date = new Date()
): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null

  // Get category details
  const { data: category, error } = await getServerSupabase()
    .from('categories')
    .select('type, target_amount, due_date')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .single()

  if (error || !category) return null

  const categoryType = category.type as string
  const targetAmount = parseFloat(category.target_amount || '0')

  // FIX: Simply return the target_amount (monthly bill)
  if (categoryType === 'FIX' && targetAmount > 0) {
    return targetAmount.toFixed(2)
  }

  // SF1: Calculate based on remaining time and amount
  if (categoryType === 'SF1' && targetAmount > 0 && category.due_date) {
    const dueDate = new Date(category.due_date)
    const now = new Date(monthDate)

    // Calculate months remaining (at least 1)
    const monthsDiff =
      (dueDate.getFullYear() - now.getFullYear()) * 12 +
      (dueDate.getMonth() - now.getMonth())
    const monthsRemaining = Math.max(1, monthsDiff)

    // Get saved balance (what's accumulated so far)
    const { data: budgets } = await getServerSupabase()
      .from('monthly_budgets')
      .select('assigned_amount')
      .eq('user_id', userId)
      .eq('category_id', categoryId)

    const totalAssigned = (budgets || []).reduce(
      (sum, b) => sum + parseFloat(b.assigned_amount || '0'),
      0
    )

    // Calculate total spent
    const { data: transactions } = await getServerSupabase()
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('category_id', categoryId)

    const totalSpent = (transactions || []).reduce((sum, tx) => {
      const amount = parseFloat(tx.amount)
      return amount < 0 ? sum + Math.abs(amount) : sum
    }, 0)

    const savedBalance = Math.max(0, totalAssigned - totalSpent)
    const remainingToSave = Math.max(0, targetAmount - savedBalance)

    // Monthly amount needed
    const suggestedMonthly = remainingToSave / monthsRemaining

    return suggestedMonthly.toFixed(2)
  }

  return null
}

/**
 * Get suggested amounts for all categories in a month
 * Returns a map of category_id -> suggested_amount
 *
 * Priority:
 * 1. FIX with target_amount: use target_amount
 * 2. SF1 with due_date and target_amount: calculate based on remaining time
 * 3. All others: use previous month's assigned_amount as suggestion
 */
export async function getAllSuggestedAmounts(
  monthDate: Date = new Date()
): Promise<Record<string, string>> {
  const { userId } = await auth()
  if (!userId) return {}

  const now = startOfMonth(monthDate)
  const prevMonthIso = format(subMonths(now, 1), 'yyyy-MM')

  // Get all expense categories (not INCOME)
  const { data: categories, error } = await getServerSupabase()
    .from('categories')
    .select('id, type, target_amount, due_date')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !categories) return {}

  // Get previous month's budgets for fallback suggestions
  const { data: prevBudgets } = await getServerSupabase()
    .from('monthly_budgets')
    .select('category_id, assigned_amount')
    .eq('user_id', userId)
    .eq('month_iso', prevMonthIso)

  const prevBudgetByCategory: Record<string, string> = {}
  for (const budget of prevBudgets || []) {
    prevBudgetByCategory[budget.category_id] = budget.assigned_amount
  }

  const suggestions: Record<string, string> = {}

  for (const category of categories) {
    // Skip INCOME categories
    if (category.type?.toUpperCase() === 'INCOME') continue

    const targetAmount = parseFloat(category.target_amount || '0')
    const prevAssigned = parseFloat(prevBudgetByCategory[category.id] || '0')

    // 1. FIX with target_amount: use target_amount
    if (category.type === 'FIX' && targetAmount > 0) {
      suggestions[category.id] = targetAmount.toFixed(2)
      continue
    }

    // 2. SF1 with due_date and target_amount: calculate based on remaining time
    if (category.type === 'SF1' && targetAmount > 0 && category.due_date) {
      const dueDate = new Date(category.due_date)
      const monthsDiff =
        (dueDate.getFullYear() - now.getFullYear()) * 12 +
        (dueDate.getMonth() - now.getMonth())
      const monthsRemaining = Math.max(1, monthsDiff)

      // Get saved balance
      const { data: budgets } = await getServerSupabase()
        .from('monthly_budgets')
        .select('assigned_amount')
        .eq('user_id', userId)
        .eq('category_id', category.id)

      const totalAssigned = (budgets || []).reduce(
        (sum, b) => sum + parseFloat(b.assigned_amount || '0'),
        0
      )

      const { data: transactions } = await getServerSupabase()
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('category_id', category.id)

      const totalSpent = (transactions || []).reduce((sum, tx) => {
        const amount = parseFloat(tx.amount)
        return amount < 0 ? sum + Math.abs(amount) : sum
      }, 0)

      const savedBalance = Math.max(0, totalAssigned - totalSpent)
      const remainingToSave = Math.max(0, targetAmount - savedBalance)
      const suggestedMonthly = remainingToSave / monthsRemaining

      suggestions[category.id] = suggestedMonthly.toFixed(2)
      continue
    }

    // 3. All others (VARIABLE, SF2, etc.): use previous month's assigned amount
    if (prevAssigned > 0) {
      suggestions[category.id] = prevAssigned.toFixed(2)
    }
  }

  return suggestions
}
