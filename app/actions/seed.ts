'use server'

import { auth } from '@clerk/nextjs/server'
import { getServerSupabase } from '@/lib/supabase'

/**
 * Seeds default accounts and categories for a new user
 * Only runs if the user has no existing accounts
 * Also creates user profile if it doesn't exist
 *
 * @returns ApiResponse indicating success or failure
 */
export async function seedUserDefaults() {
  try {
    // 1. Authenticate user
    const { userId } = await auth()

    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized. Please sign in.',
      }
    }

    // 2. Ensure user profile exists
    const { data: existingProfile } = await getServerSupabase()
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (!existingProfile) {
      // Create profile with default values
      const { error: profileError } = await getServerSupabase()
        .from('profiles')
        .insert({
          user_id: userId,
          currency: 'EUR', // Default currency
          theme_preference: 'system',
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        // Don't fail the whole seeding if profile creation fails
      }
    }

    // 3. Check if user already has accounts
    const { data: existingAccounts, error: checkError } = await getServerSupabase()
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing accounts:', checkError)
      return {
        success: false,
        error: 'Failed to check existing accounts',
      }
    }

    // If user already has accounts, do nothing
    if (existingAccounts && existingAccounts.length > 0) {
      return {
        success: true,
        message: 'User already has accounts, skipping seed',
      }
    }

    // 3. Create default accounts
    const defaultAccounts = [
      {
        user_id: userId,
        name: 'Main Account',
        type: 'bank',
        initial_balance: '0.00',
      },
      {
        user_id: userId,
        name: 'Cash',
        type: 'cash',
        initial_balance: '0.00',
      },
    ]

    const { error: accountsError } = await getServerSupabase()
      .from('accounts')
      .insert(defaultAccounts)

    if (accountsError) {
      console.error('Error creating default accounts:', accountsError)
      return {
        success: false,
        error: 'Failed to create default accounts',
      }
    }

    // 4. Create default categories (system categories with translation keys)
    const defaultCategories = [
      // Income categories
      {
        user_id: userId,
        translation_key: 'category.salary',
        icon: 'Briefcase',
        color: '#10b981', // Green
        type: 'income',
      },
      {
        user_id: userId,
        translation_key: 'category.freelance',
        icon: 'Laptop',
        color: '#3b82f6', // Blue
        type: 'income',
      },
      // Expense categories
      {
        user_id: userId,
        translation_key: 'category.groceries',
        icon: 'ShoppingCart',
        color: '#f59e0b', // Amber
        type: 'expense',
      },
      {
        user_id: userId,
        translation_key: 'category.rent',
        icon: 'Home',
        color: '#ef4444', // Red
        type: 'expense',
      },
      {
        user_id: userId,
        translation_key: 'category.transport',
        icon: 'Car',
        color: '#8b5cf6', // Purple
        type: 'expense',
      },
      {
        user_id: userId,
        translation_key: 'category.eatingOut',
        icon: 'Utensils',
        color: '#ec4899', // Pink
        type: 'expense',
      },
      {
        user_id: userId,
        translation_key: 'category.entertainment',
        icon: 'Film',
        color: '#06b6d4', // Cyan
        type: 'expense',
      },
      {
        user_id: userId,
        translation_key: 'category.health',
        icon: 'Heart',
        color: '#14b8a6', // Teal
        type: 'expense',
      },
      {
        user_id: userId,
        translation_key: 'category.shopping',
        icon: 'ShoppingBag',
        color: '#f97316', // Orange
        type: 'expense',
      },
    ]

    const { error: categoriesError } = await getServerSupabase()
      .from('categories')
      .insert(defaultCategories)

    if (categoriesError) {
      console.error('Error creating default categories:', categoriesError)
      return {
        success: false,
        error: 'Failed to create default categories',
      }
    }

    return {
      success: true,
      message: 'Default accounts and categories created successfully',
    }
  } catch (error) {
    console.error('Unexpected error in seedUserDefaults:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}

/**
 * Gets the current user's profile
 */
export async function getUserProfile() {
  try {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { data, error } = await getServerSupabase()
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      // Return default profile if fetch fails
      return {
        user_id: userId,
        currency: 'EUR',
        theme_preference: 'system',
        created_at: new Date().toISOString(),
      }
    }

    return data
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    throw error
  }
}
