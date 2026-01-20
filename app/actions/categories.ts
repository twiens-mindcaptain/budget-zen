'use server'

import { auth } from '@clerk/nextjs/server'
import { getServerSupabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Category, ApiResponse, ZBBCategoryType, RolloverStrategy } from '@/lib/types'

/**
 * Schema for creating/updating a category
 */
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name too long'),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  type: z.enum(['FIX', 'VARIABLE', 'SF1', 'SF2', 'INCOME']),
  rollover_strategy: z.enum(['ACCUMULATE', 'RESET', 'SWEEP']).optional(),
  target_amount: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
})

export type CategoryFormData = z.infer<typeof categorySchema>

/**
 * Get default rollover strategy based on ZBB type
 */
function getDefaultRolloverStrategy(zbbType: ZBBCategoryType): RolloverStrategy {
  switch (zbbType) {
    case 'SF1':
    case 'SF2':
      return 'ACCUMULATE'
    default:
      return 'RESET'
  }
}

/**
 * Get all categories for the current user
 */
export async function getUserCategories(): Promise<Category[]> {
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
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validated = categorySchema.parse(data)

    // SF1 requires due_date
    if (validated.type === 'SF1' && !validated.due_date) {
      return { success: false, error: 'Due date is required for SF1 categories' }
    }

    // Use provided rollover_strategy or get default
    const rolloverStrategy = validated.rollover_strategy || getDefaultRolloverStrategy(validated.type as ZBBCategoryType)

    // Insert category
    const { data: category, error } = await getServerSupabase()
      .from('categories')
      .insert({
        user_id: userId,
        name: validated.name,
        icon: validated.icon,
        color: validated.color,
        type: validated.type,
        rollover_strategy: rolloverStrategy,
        target_amount: validated.target_amount || null,
        due_date: validated.due_date || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return { success: false, error: 'Failed to create category' }
    }

    revalidatePath('/[locale]', 'layout')
    return { success: true, data: category }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error('Error in createCategory:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Update an existing category
 */
export async function updateCategory(id: string, data: CategoryFormData): Promise<ApiResponse<Category>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validate input
    const validated = categorySchema.parse(data)

    // SF1 requires due_date
    if (validated.type === 'SF1' && !validated.due_date) {
      return { success: false, error: 'Due date is required for SF1 categories' }
    }

    // Use provided rollover_strategy or get default
    const rolloverStrategy = validated.rollover_strategy || getDefaultRolloverStrategy(validated.type as ZBBCategoryType)

    // Update category (only if it belongs to the user)
    const { data: category, error } = await getServerSupabase()
      .from('categories')
      .update({
        name: validated.name,
        icon: validated.icon,
        color: validated.color,
        type: validated.type,
        rollover_strategy: rolloverStrategy,
        target_amount: validated.target_amount || null,
        due_date: validated.due_date || null,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      return { success: false, error: 'Failed to update category' }
    }

    revalidatePath('/[locale]', 'layout')
    return { success: true, data: category }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message }
    }
    console.error('Error in updateCategory:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Delete a category (soft delete by setting is_active = false)
 */
export async function deleteCategory(id: string) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if category has transactions
    const { data: transactions, error: checkError } = await getServerSupabase()
      .from('transactions')
      .select('id')
      .eq('category_id', id)
      .limit(1)

    if (checkError) {
      console.error('Error checking category usage:', checkError)
      return { success: false, error: 'Failed to check category usage' }
    }

    if (transactions && transactions.length > 0) {
      // Soft delete: set is_active = false
      const { error } = await getServerSupabase()
        .from('categories')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deactivating category:', error)
        return { success: false, error: 'Failed to delete category' }
      }
    } else {
      // Hard delete: no transactions
      const { error } = await getServerSupabase()
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting category:', error)
        return { success: false, error: 'Failed to delete category' }
      }
    }

    revalidatePath('/[locale]', 'layout')
    return { success: true, message: 'Category deleted successfully' }
  } catch (error) {
    console.error('Error in deleteCategory:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Get categories grouped by ZBB type
 */
export async function getCategoriesByZBBType(): Promise<Record<string, Category[]>> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await getServerSupabase()
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    throw new Error('Failed to fetch categories')
  }

  // Group by type
  const grouped: Record<string, Category[]> = {
    INCOME: [],
    FIX: [],
    VARIABLE: [],
    SF1: [],
    SF2: [],
  }

  for (const category of data || []) {
    const zbbType = category.type || 'VARIABLE'
    if (grouped[zbbType]) {
      grouped[zbbType].push(category)
    }
  }

  return grouped
}
