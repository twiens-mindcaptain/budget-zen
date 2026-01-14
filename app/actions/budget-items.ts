'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { getServerSupabase } from '@/lib/supabase'
import {
  insertBudgetItemSchema,
  type InsertBudgetItemInput,
  type BudgetItem,
  type ApiResponse,
} from '@/lib/types'

/**
 * Get all budget items for a category (or all user's items)
 */
export async function getBudgetItems(categoryId?: string): Promise<BudgetItem[]> {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  let query = getServerSupabase()
    .from('budget_items')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching budget items:', error)
    throw new Error('Failed to fetch budget items')
  }

  return data || []
}

/**
 * Create a new budget item
 */
export async function createBudgetItem(
  data: InsertBudgetItemInput
): Promise<ApiResponse<BudgetItem>> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validated = insertBudgetItemSchema.parse(data)

    // Calculate monthly_impact
    const amount = parseFloat(validated.amount)
    const divisors = { monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 }
    const monthlyImpact = (amount / divisors[validated.frequency]).toFixed(2)

    // Insert budget item
    const { data: item, error } = await getServerSupabase()
      .from('budget_items')
      .insert({
        user_id: userId,
        category_id: validated.category_id,
        name: validated.name,
        amount: validated.amount,
        frequency: validated.frequency,
        monthly_impact: monthlyImpact,
        saved_balance: validated.saved_balance || '0.00',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating budget item:', error)
      return { success: false, error: 'Failed to create budget item' }
    }

    revalidatePath('/[locale]', 'layout')
    revalidatePath('/[locale]/settings', 'page')

    return { success: true, data: item }
  } catch (error) {
    console.error('Error in createBudgetItem:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Update an existing budget item
 */
export async function updateBudgetItem(
  itemId: string,
  data: InsertBudgetItemInput
): Promise<ApiResponse<BudgetItem>> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validated = insertBudgetItemSchema.parse(data)

    // Calculate monthly_impact
    const amount = parseFloat(validated.amount)
    const divisors = { monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 }
    const monthlyImpact = (amount / divisors[validated.frequency]).toFixed(2)

    // Update budget item
    const { data: item, error } = await getServerSupabase()
      .from('budget_items')
      .update({
        category_id: validated.category_id,
        name: validated.name,
        amount: validated.amount,
        frequency: validated.frequency,
        monthly_impact: monthlyImpact,
        saved_balance: validated.saved_balance || '0.00',
      })
      .eq('id', itemId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating budget item:', error)
      return { success: false, error: 'Failed to update budget item' }
    }

    revalidatePath('/[locale]', 'layout')
    revalidatePath('/[locale]/settings', 'page')

    return { success: true, data: item }
  } catch (error) {
    console.error('Error in updateBudgetItem:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Delete a budget item
 */
export async function deleteBudgetItem(itemId: string): Promise<ApiResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { error } = await getServerSupabase()
      .from('budget_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting budget item:', error)
      return { success: false, error: 'Failed to delete budget item' }
    }

    revalidatePath('/[locale]', 'layout')
    revalidatePath('/[locale]/settings', 'page')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Error in deleteBudgetItem:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}
