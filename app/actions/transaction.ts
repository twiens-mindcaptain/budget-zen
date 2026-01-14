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

/**
 * Creates a new transaction in the database
 *
 * @param data - Transaction data matching insertTransactionSchema
 * @returns ApiResponse with success/error status
 */
export async function createTransaction(
  data: unknown
): Promise<ApiResponse<Transaction>> {
  try {
    // 1. Authenticate user via Clerk
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in to create transactions.',
      }
    }

    // 2. Validate input with Zod
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

      // Income = positive, Expense = negative
      if (category?.type === 'expense') {
        finalAmount = -finalAmount
      }
    } else {
      // No category: check if amount starts with + (income) or treat as expense
      const amountStr = validatedData.amount.toString()
      if (!amountStr.startsWith('+')) {
        // Default: treat as expense (negative)
        finalAmount = -finalAmount
      }
    }

    // 3. Insert into Supabase transactions table
    const { data: transaction, error: insertError } = await getServerSupabase()
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: validatedData.account_id,
        category_id: validatedData.category_id || null,
        amount: finalAmount.toString(),
        date: validatedData.date || new Date().toISOString(),
        note: validatedData.note || null,
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

    // 4. Revalidate the dashboard path
    revalidatePath('/')

    // 5. Return success response
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
 * Fetches recent transactions for the current user
 *
 * @param limit - Number of transactions to fetch (default: 50)
 * @returns Array of transactions with category and account data
 */
export async function getRecentTransactions(limit: number = 50) {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { data, error } = await getServerSupabase()
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        account:accounts(*)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

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
 * Fetches all accounts for the current user
 */
export async function getAccounts() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { data, error } = await getServerSupabase()
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Supabase fetch error:', error)
      throw new Error(`Failed to fetch accounts: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('Error in getAccounts:', error)
    throw error
  }
}

/**
 * Fetches all categories for the current user
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
      .order('type', { ascending: false }) // 'income' before 'expense'
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
 * Calculates monthly statistics (income, expenses, balance) for the current month
 */
export async function getMonthlyStatistics(): Promise<MonthlyStatistics> {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Get start and end of current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Fetch all transactions for this month
    const { data, error } = await getServerSupabase()
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString())

    if (error) {
      console.error('Supabase fetch error:', error)
      throw new Error(`Failed to fetch monthly statistics: ${error.message}`)
    }

    // Calculate totals from signed amounts
    // Positive amounts = income, Negative amounts = expense
    let totalIncome = 0
    let totalExpenses = 0

    data?.forEach((transaction: any) => {
      const amount = parseFloat(transaction.amount)

      if (amount > 0) {
        totalIncome += amount
      } else if (amount < 0) {
        totalExpenses += Math.abs(amount)
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
 *
 * @param transactionId - UUID of the transaction to update
 * @param data - Updated transaction data matching insertTransactionSchema
 * @returns ApiResponse with success/error status
 */
export async function updateTransaction(
  transactionId: string,
  data: unknown
): Promise<ApiResponse<Transaction>> {
  try {
    // 1. Authenticate user via Clerk
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in to update transactions.',
      }
    }

    // 2. Validate input with Zod
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

      // Income = positive, Expense = negative
      if (category?.type === 'expense') {
        finalAmount = -finalAmount
      }
    } else {
      // No category: check if amount starts with + (income) or treat as expense
      const amountStr = validatedData.amount.toString()
      if (!amountStr.startsWith('+')) {
        // Default: treat as expense (negative)
        finalAmount = -finalAmount
      }
    }

    // 3. Verify ownership and update transaction
    const { data: transaction, error: updateError } = await getServerSupabase()
      .from('transactions')
      .update({
        account_id: validatedData.account_id,
        category_id: validatedData.category_id || null,
        amount: finalAmount.toString(),
        date: validatedData.date || new Date().toISOString(),
        note: validatedData.note || null,
      })
      .eq('id', transactionId)
      .eq('user_id', userId) // Ensure user owns this transaction
      .select()
      .single()

    if (updateError) {
      console.error('Supabase update error:', updateError)
      return {
        success: false,
        error: `Failed to update transaction: ${updateError.message}`,
      }
    }

    // 4. Revalidate the dashboard path
    revalidatePath('/')

    // 5. Return success response
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
 *
 * @param transactionId - UUID of the transaction to delete
 * @returns ApiResponse with success/error status
 */
export async function deleteTransaction(
  transactionId: string
): Promise<ApiResponse<null>> {
  try {
    // 1. Authenticate user via Clerk
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in to delete transactions.',
      }
    }

    // 2. Delete transaction (ownership check via user_id)
    const { error: deleteError } = await getServerSupabase()
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', userId) // Ensure user owns this transaction

    if (deleteError) {
      console.error('Supabase delete error:', deleteError)
      return {
        success: false,
        error: `Failed to delete transaction: ${deleteError.message}`,
      }
    }

    // 3. Revalidate the dashboard path
    revalidatePath('/')

    // 4. Return success response
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
 * Get bills checklist for current month
 * Returns monthly budget items with payment status
 */
export async function getBillsChecklist(): Promise<BillItem[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Get monthly budget items with category info
  const { data: items, error } = await getServerSupabase()
    .from('budget_items')
    .select(`
      id,
      name,
      category_id,
      monthly_impact,
      category:categories(name, translation_key, icon, color)
    `)
    .eq('user_id', userId)
    .eq('frequency', 'monthly')
    .order('name', { ascending: true })

  if (error) throw new Error('Failed to fetch bills')

  // For each item, check if paid this month
  const bills: BillItem[] = []

  for (const item of items || []) {
    const { data: transactions } = await getServerSupabase()
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('category_id', item.category_id)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString())
      .limit(1)

    const category = Array.isArray(item.category) ? item.category[0] : item.category

    bills.push({
      id: item.id,
      name: item.name,
      category_id: item.category_id,
      category_name: category?.name || null,
      category_icon: category?.icon || 'HelpCircle',
      category_color: category?.color || '#71717a',
      monthly_impact: item.monthly_impact,
      is_paid: !!(transactions && transactions.length > 0),
    })
  }

  return bills
}

/**
 * Get sinking funds with progress
 * Returns non-monthly budget items with saved balance
 */
export async function getSinkingFunds(): Promise<SinkingFundItem[]> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data: items, error } = await getServerSupabase()
    .from('budget_items')
    .select(`
      id,
      name,
      category_id,
      amount,
      monthly_impact,
      saved_balance,
      category:categories(name, translation_key, icon, color)
    `)
    .eq('user_id', userId)
    .neq('frequency', 'monthly')
    .order('name', { ascending: true })

  if (error) throw new Error('Failed to fetch sinking funds')

  return (items || []).map((item) => {
    const category = Array.isArray(item.category) ? item.category[0] : item.category
    const targetAmount = parseFloat(item.amount)
    const savedBalance = parseFloat(item.saved_balance)
    const progressPercentage =
      targetAmount > 0 ? Math.min((savedBalance / targetAmount) * 100, 100) : 0

    return {
      id: item.id,
      name: item.name,
      category_id: item.category_id,
      category_name: category?.name || null,
      category_icon: category?.icon || 'HelpCircle',
      category_color: category?.color || '#71717a',
      amount: item.amount,
      monthly_impact: item.monthly_impact,
      saved_balance: item.saved_balance,
      progress_percentage: Math.round(progressPercentage),
    }
  })
}

/**
 * Calculate Safe-to-Spend with NEW formula
 * Formula: Total Liquid - Pending Bills - Sinking Contributions
 */
export async function getSafeToSpend(): Promise<SafeToSpendData> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // 1. Calculate Total Liquid (sum of all account balances)
  const { data: accounts, error: accountsError } = await getServerSupabase()
    .from('accounts')
    .select('id, initial_balance')
    .eq('user_id', userId)

  if (accountsError) {
    console.error('Error fetching accounts:', accountsError)
    throw new Error('Failed to fetch accounts')
  }

  let totalLiquid = 0

  if (accounts && accounts.length > 0) {
    for (const account of accounts) {
      const initialBalance = parseFloat(account.initial_balance)

      const { data: transactions, error: transError } = await getServerSupabase()
        .from('transactions')
        .select('amount')
        .eq('account_id', account.id)
        .eq('user_id', userId)

      if (transError) {
        console.error('Error fetching transactions:', transError)
        continue
      }

      const transactionsSum = (transactions || []).reduce(
        (sum, t) => sum + parseFloat(t.amount),
        0
      )

      totalLiquid += initialBalance + transactionsSum
    }
  }

  // 2. Get unpaid bills (monthly items not paid this month)
  const bills = await getBillsChecklist()
  const pendingBills = bills
    .filter((bill) => !bill.is_paid)
    .reduce((sum, bill) => sum + parseFloat(bill.monthly_impact), 0)

  // 3. Get sinking funds contributions (always deducted)
  const funds = await getSinkingFunds()
  const sinkingContributions = funds.reduce(
    (sum, fund) => sum + parseFloat(fund.monthly_impact),
    0
  )

  // 4. Calculate Safe to Spend
  const safeToSpend = totalLiquid - pendingBills - sinkingContributions

  return {
    safeToSpend: safeToSpend.toFixed(2),
    totalLiquid: totalLiquid.toFixed(2),
    pendingBills: pendingBills.toFixed(2),
    sinkingContributions: sinkingContributions.toFixed(2),
  }
}

/**
 * Mark a bill as paid by creating a transaction
 */
export async function markBillPaid(
  billId: string,
  accountId: string
): Promise<ApiResponse<Transaction>> {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get budget item details
  const { data: item, error: itemError } = await getServerSupabase()
    .from('budget_items')
    .select('category_id, monthly_impact')
    .eq('id', billId)
    .eq('user_id', userId)
    .single()

  if (itemError || !item) {
    return { success: false, error: 'Budget item not found' }
  }

  // Create transaction (negative amount for expense)
  const amount = -Math.abs(parseFloat(item.monthly_impact))

  const { data: transaction, error: txError } = await getServerSupabase()
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: accountId,
      category_id: item.category_id,
      amount: amount.toString(),
      date: new Date().toISOString(),
      note: 'Bill payment',
    })
    .select()
    .single()

  if (txError) {
    return { success: false, error: 'Failed to create transaction' }
  }

  revalidatePath('/')
  return { success: true, data: transaction as Transaction }
}
