/**
 * Internationalization helpers for user-generated content
 */

interface Category {
  id: string
  name?: string | null
  icon?: string | null
  color?: string | null
  type: string // ZBB type: FIX, VARIABLE, SF1, SF2, INCOME
}

/**
 * Get the display name for a category
 * Simply returns the name or 'Unnamed' as fallback
 */
export function getCategoryDisplayName(
  category: Category,
  _t?: (key: string) => string // t param kept for backwards compatibility but not used
): string {
  return category.name || 'Unnamed'
}
