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

    // 3. Insert into Supabase transactions table
    const { data: transaction, error: insertError } = await getServerSupabase()
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: validatedData.account_id,
        category_id: validatedData.category_id || null,
        amount: validatedData.amount,
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

    // Fetch all transactions for this month with category info
    const { data, error } = await getServerSupabase()
      .from('transactions')
      .select(`
        amount,
        category:categories(type)
      `)
      .eq('user_id', userId)
      .gte('date', startOfMonth.toISOString())
      .lte('date', endOfMonth.toISOString())

    if (error) {
      console.error('Supabase fetch error:', error)
      throw new Error(`Failed to fetch monthly statistics: ${error.message}`)
    }

    // Calculate totals
    let totalIncome = 0
    let totalExpenses = 0

    data?.forEach((transaction: any) => {
      const amount = parseFloat(transaction.amount)

      if (transaction.category?.type === 'income') {
        totalIncome += amount
      } else if (transaction.category?.type === 'expense') {
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
