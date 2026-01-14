'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { getServerSupabase } from '@/lib/supabase'
import { insertTransactionSchema, type ApiResponse, type Transaction, type MonthlyStatistics } from '@/lib/types'

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
 * Calculate Safe-to-Spend amount
 * Formula: Total Liquid Cash - Monthly Committed
 */
export async function getSafeToSpend(): Promise<{
  safeToSpend: string
  totalLiquid: string
  monthlyCommitted: string
}> {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    // 1. Calculate Total Liquid Cash (sum of all account balances)
    // Get all accounts
    const { data: accounts, error: accountsError } = await getServerSupabase()
      .from('accounts')
      .select('id, initial_balance')
      .eq('user_id', userId)

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError)
      throw new Error('Failed to fetch accounts')
    }

    let totalLiquid = 0

    // For each account, calculate current balance (initial_balance + transactions sum)
    if (accounts && accounts.length > 0) {
      for (const account of accounts) {
        const initialBalance = parseFloat(account.initial_balance)

        // Get sum of transactions for this account
        const { data: transactions, error: transError } = await getServerSupabase()
          .from('transactions')
          .select('amount')
          .eq('account_id', account.id)
          .eq('user_id', userId)

        if (transError) {
          console.error('Error fetching transactions:', transError)
          continue
        }

        // Calculate balance: simply sum all amounts (negative for expenses, positive for income)
        const transactionsSum = (transactions || []).reduce(
          (sum, t) => sum + parseFloat(t.amount),
          0
        )

        totalLiquid += initialBalance + transactionsSum
      }
    }

    // 2. Calculate Monthly Committed (sum of monthly_target for fixed/sinking_fund categories)
    const { data: categories, error: categoriesError } = await getServerSupabase()
      .from('categories')
      .select('monthly_target')
      .eq('user_id', userId)
      .in('budget_type', ['fixed', 'sinking_fund'])

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      throw new Error('Failed to fetch categories')
    }

    const monthlyCommitted = (categories || []).reduce((sum, cat) => {
      return sum + (cat.monthly_target ? parseFloat(cat.monthly_target) : 0)
    }, 0)

    // 3. Calculate Safe to Spend
    const safeToSpend = totalLiquid - monthlyCommitted

    return {
      safeToSpend: safeToSpend.toFixed(2),
      totalLiquid: totalLiquid.toFixed(2),
      monthlyCommitted: monthlyCommitted.toFixed(2),
    }
  } catch (error) {
    console.error('Error in getSafeToSpend:', error)
    throw error
  }
}
