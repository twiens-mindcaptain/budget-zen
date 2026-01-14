'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { getServerSupabase } from '@/lib/supabase'
import { insertAccountSchema, type InsertAccountInput, type Account, type ApiResponse } from '@/lib/types'

/**
 * Get all accounts for the current user
 */
export async function getAccounts(): Promise<Account[]> {
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
    console.error('Error fetching accounts:', error)
    throw new Error('Failed to fetch accounts')
  }

  return data || []
}

/**
 * Get account balance (initial_balance + sum of transactions)
 */
export async function getAccountBalance(accountId: string): Promise<string> {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Get account initial balance
  const { data: account, error: accountError } = await getServerSupabase()
    .from('accounts')
    .select('initial_balance')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single()

  if (accountError || !account) {
    return '0.00'
  }

  // Get sum of transactions for this account
  const { data: transactions, error: transError } = await getServerSupabase()
    .from('transactions')
    .select('amount')
    .eq('account_id', accountId)
    .eq('user_id', userId)

  if (transError) {
    console.error('Error fetching transactions:', transError)
    return account.initial_balance
  }

  // Calculate total balance: simply sum all amounts (negative for expenses, positive for income)
  const initialBalance = parseFloat(account.initial_balance)
  const transactionsSum = (transactions || []).reduce((sum, t) => sum + parseFloat(t.amount), 0)
  const totalBalance = initialBalance + transactionsSum

  return totalBalance.toFixed(2)
}

/**
 * Get all accounts with calculated current balances
 */
export async function getAccountsWithBalances(): Promise<(Account & { current_balance: string })[]> {
  const accounts = await getAccounts()

  const accountsWithBalances = await Promise.all(
    accounts.map(async (account) => {
      const current_balance = await getAccountBalance(account.id)
      return {
        ...account,
        current_balance,
      }
    })
  )

  return accountsWithBalances
}

/**
 * Create a new account
 */
export async function createAccount(data: InsertAccountInput): Promise<ApiResponse<Account>> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validated = insertAccountSchema.parse(data)

    // Insert account
    const { data: account, error } = await getServerSupabase()
      .from('accounts')
      .insert({
        user_id: userId,
        name: validated.name,
        type: validated.type,
        initial_balance: validated.initial_balance,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating account:', error)
      return { success: false, error: 'Failed to create account' }
    }

    // Revalidate paths
    revalidatePath('/[locale]', 'layout')
    revalidatePath('/[locale]/settings', 'page')

    return { success: true, data: account }
  } catch (error) {
    console.error('Error in createAccount:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Update an existing account
 */
export async function updateAccount(
  accountId: string,
  data: InsertAccountInput
): Promise<ApiResponse<Account>> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validated = insertAccountSchema.parse(data)

    // Update account
    const { data: account, error } = await getServerSupabase()
      .from('accounts')
      .update({
        name: validated.name,
        type: validated.type,
        initial_balance: validated.initial_balance,
      })
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating account:', error)
      return { success: false, error: 'Failed to update account' }
    }

    // Revalidate paths
    revalidatePath('/[locale]', 'layout')
    revalidatePath('/[locale]/settings', 'page')

    return { success: true, data: account }
  } catch (error) {
    console.error('Error in updateAccount:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Delete an account
 * NOTE: This will fail if there are transactions associated with this account
 * due to foreign key constraints. Handle this gracefully in the UI.
 */
export async function deleteAccount(accountId: string): Promise<ApiResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if account has transactions
    const { data: transactions, error: checkError } = await getServerSupabase()
      .from('transactions')
      .select('id')
      .eq('account_id', accountId)
      .eq('user_id', userId)
      .limit(1)

    if (checkError) {
      console.error('Error checking transactions:', checkError)
      return { success: false, error: 'Failed to check for associated transactions' }
    }

    if (transactions && transactions.length > 0) {
      return {
        success: false,
        error: 'Cannot delete account with existing transactions. Please delete all transactions first.',
      }
    }

    // Delete account
    const { error } = await getServerSupabase()
      .from('accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting account:', error)
      return { success: false, error: 'Failed to delete account' }
    }

    // Revalidate paths
    revalidatePath('/[locale]', 'layout')
    revalidatePath('/[locale]/settings', 'page')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Error in deleteAccount:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}
