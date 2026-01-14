'use server'

import { auth } from '@clerk/nextjs/server'
import { getServerSupabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

/**
 * Schema for creating/updating a category
 */
const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name too long'),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  type: z.enum(['income', 'expense']),
})

export type CategoryFormData = z.infer<typeof categorySchema>

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
export async function createCategory(data: CategoryFormData) {
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

    // Insert category
    const { error } = await getServerSupabase()
      .from('categories')
      .insert({
        user_id: userId,
        ...validated,
      })

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
      message: 'Category created successfully',
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
export async function updateCategory(id: string, data: CategoryFormData) {
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

    // Update category (only if it belongs to the user)
    const { error } = await getServerSupabase()
      .from('categories')
      .update(validated)
      .eq('id', id)
      .eq('user_id', userId)

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
      message: 'Category updated successfully',
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
