'use server'

import { auth } from '@clerk/nextjs/server'
import { getServerSupabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Category, ApiResponse } from '@/lib/types'

/**
 * Schema for creating/updating a category
 */
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name too long'),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  type: z.enum(['income', 'expense']),
  budget_type: z.enum(['variable', 'fixed', 'sinking_fund']).default('variable'),
  target_amount: z.string().optional().nullable(),
  frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).default('monthly'),
})

export type CategoryFormData = z.infer<typeof categorySchema>

/**
 * Helper function to calculate monthly_target based on target_amount and frequency
 */
function calculateMonthlyTarget(targetAmount: string | null | undefined, frequency: string): string | null {
  if (!targetAmount || targetAmount === '') return null

  const amount = parseFloat(targetAmount)
  if (isNaN(amount)) return null

  const divisors = {
    monthly: 1,
    quarterly: 3,
    semi_annual: 6,
    annual: 12,
  }

  const divisor = divisors[frequency as keyof typeof divisors] || 1
  return (amount / divisor).toFixed(2)
}

/**
 * Get all categories for the current user
 */
export async function getUserCategories() {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { data, error } = await getServerSupabase()
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('type', { ascending: false }) // income first
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      throw new Error('Failed to fetch categories')
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserCategories:', error)
    throw error
  }
}

/**
 * Create a new category
 */
export async function createCategory(data: CategoryFormData): Promise<ApiResponse<Category>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    // Validate input
    const validated = categorySchema.parse(data)

    // Calculate monthly_target
    const monthly_target = calculateMonthlyTarget(validated.target_amount, validated.frequency)

    // Insert category
    const { data: category, error } = await getServerSupabase()
      .from('categories')
      .insert({
        user_id: userId,
        ...validated,
        monthly_target,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return {
        success: false,
        error: 'Failed to create category',
      }
    }

    // Revalidate pages that use categories
    revalidatePath('/[locale]', 'layout')

    return {
      success: true,
      data: category,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      }
    }

    console.error('Error in createCategory:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Update an existing category
 */
export async function updateCategory(id: string, data: CategoryFormData): Promise<ApiResponse<Category>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    // Validate input
    const validated = categorySchema.parse(data)

    // Calculate monthly_target
    const monthly_target = calculateMonthlyTarget(validated.target_amount, validated.frequency)

    // Update category (only if it belongs to the user)
    const { data: category, error } = await getServerSupabase()
      .from('categories')
      .update({
        ...validated,
        monthly_target,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return {
        success: false,
        error: 'Failed to update category',
      }
    }

    // Revalidate pages that use categories
    revalidatePath('/[locale]', 'layout')

    return {
      success: true,
      data: category,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      }
    }

    console.error('Error in updateCategory:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    // Check if category has transactions
    const { data: transactions, error: checkError } = await getServerSupabase()
      .from('transactions')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (checkError) {
      console.error('Error checking category usage:', checkError)
      return {
        success: false,
        error: 'Failed to check category usage',
      }
    }

    if (transactions && transactions.length > 0) {
      return {
        success: false,
        error: 'Cannot delete category with existing transactions',
      }
    }

    // Delete category (only if it belongs to the user)
    const { error } = await getServerSupabase()
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting category:', error)
      return {
        success: false,
        error: 'Failed to delete category',
      }
    }

    // Revalidate pages that use categories
    revalidatePath('/[locale]', 'layout')

    return {
      success: true,
      message: 'Category deleted successfully',
    }
  } catch (error) {
    console.error('Error in deleteCategory:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}
