/**
 * Internationalization helpers for user-generated content
 */

interface Category {
  id: string
  name?: string | null
  translation_key?: string | null
  icon?: string | null
  color?: string | null
  type: 'income' | 'expense'
}

interface Account {
  id: string
  name: string
}

/**
 * Get the display name for a category in the current locale
 *
 * Logic:
 * - If category has translation_key (system category), use i18n
 * - Otherwise, use the raw name (user-created category)
 */
export function getCategoryDisplayName(
  category: Category,
  t: (key: string) => string
): string {
  // System category with translation key
  if (category.translation_key) {
    return t(category.translation_key)
  }

  // User-created category - show as-is
  return category.name || 'Unnamed'
}

/**
 * Get the display name for an account
 *
 * Accounts are typically proper nouns (bank names, etc.)
 * and don't need translation
 */
export function getAccountDisplayName(account: Account): string {
  return account.name
}

/**
 * Best practices for multilingual user content:
 *
 * 1. SYSTEM CATEGORIES (pre-seeded):
 *    - Use translation_key: "category.groceries"
 *    - Add translations to messages/en.json and messages/de.json
 *    - Example:
 *      {
 *        translation_key: "category.groceries",
 *        icon: "ShoppingCart",
 *        color: "#10b981"
 *      }
 *
 * 2. USER CATEGORIES (created by users):
 *    - Store the name as-is in the user's current language
 *    - No translation_key
 *    - Example:
 *      {
 *        name: "Autowäsche",
 *        icon: "Car",
 *        color: "#3b82f6"
 *      }
 *    - When displayed: Shows "Autowäsche" regardless of locale
 *
 * 3. ACCOUNTS:
 *    - Always store name as-is (typically proper nouns)
 *    - No translation needed
 *    - Example: "Chase Checking", "Sparkasse Girokonto"
 *
 * WHY THIS APPROACH?
 * - Simple: Users only enter one name
 * - Transparent: What you type is what you see
 * - No overhead: No translation APIs or complex UIs
 * - Professional: System categories are properly translated
 * - Practical: Most users use one language consistently
 */
