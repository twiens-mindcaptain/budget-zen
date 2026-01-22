/**
 * Smart category suggestions based on name keywords
 * Suggests appropriate icons and colors for common category names
 */

import type { ZBBCategoryType } from '@/lib/types'

interface CategorySuggestion {
  icon: string
  color: string
}

// Keyword to icon/color mapping (case-insensitive)
const KEYWORD_SUGGESTIONS: Record<string, CategorySuggestion> = {
  // Streaming & Entertainment
  netflix: { icon: 'Tv', color: '#e50914' },
  spotify: { icon: 'Music', color: '#1db954' },
  youtube: { icon: 'Youtube', color: '#ff0000' },
  disney: { icon: 'Tv', color: '#113ccf' },
  prime: { icon: 'Tv', color: '#00a8e1' },
  hbo: { icon: 'Tv', color: '#5822b4' },
  apple: { icon: 'Apple', color: '#555555' },
  musik: { icon: 'Music', color: '#1db954' },
  music: { icon: 'Music', color: '#1db954' },
  kino: { icon: 'Clapperboard', color: '#8b5cf6' },
  cinema: { icon: 'Clapperboard', color: '#8b5cf6' },
  film: { icon: 'Clapperboard', color: '#8b5cf6' },
  movie: { icon: 'Clapperboard', color: '#8b5cf6' },

  // Housing
  miete: { icon: 'Home', color: '#6366f1' },
  rent: { icon: 'Home', color: '#6366f1' },
  wohnung: { icon: 'Home', color: '#6366f1' },
  apartment: { icon: 'Home', color: '#6366f1' },
  haus: { icon: 'Home', color: '#6366f1' },
  house: { icon: 'Home', color: '#6366f1' },
  mortgage: { icon: 'Home', color: '#6366f1' },
  hypothek: { icon: 'Home', color: '#6366f1' },

  // Utilities
  strom: { icon: 'Zap', color: '#eab308' },
  electricity: { icon: 'Zap', color: '#eab308' },
  gas: { icon: 'Flame', color: '#f97316' },
  wasser: { icon: 'Droplets', color: '#0ea5e9' },
  water: { icon: 'Droplets', color: '#0ea5e9' },
  heizung: { icon: 'Thermometer', color: '#ef4444' },
  heating: { icon: 'Thermometer', color: '#ef4444' },
  nebenkosten: { icon: 'Receipt', color: '#64748b' },
  utilities: { icon: 'Receipt', color: '#64748b' },

  // Internet & Phone
  internet: { icon: 'Wifi', color: '#3b82f6' },
  wifi: { icon: 'Wifi', color: '#3b82f6' },
  telefon: { icon: 'Phone', color: '#22c55e' },
  phone: { icon: 'Phone', color: '#22c55e' },
  handy: { icon: 'Smartphone', color: '#22c55e' },
  mobile: { icon: 'Smartphone', color: '#22c55e' },

  // Transportation
  auto: { icon: 'Car', color: '#64748b' },
  car: { icon: 'Car', color: '#64748b' },
  benzin: { icon: 'Fuel', color: '#f97316' },
  fuel: { icon: 'Fuel', color: '#f97316' },
  tanken: { icon: 'Fuel', color: '#f97316' },
  versicherung: { icon: 'Shield', color: '#3b82f6' },
  insurance: { icon: 'Shield', color: '#3b82f6' },
  kfz: { icon: 'Car', color: '#64748b' },
  bus: { icon: 'Bus', color: '#0ea5e9' },
  bahn: { icon: 'Train', color: '#dc2626' },
  train: { icon: 'Train', color: '#dc2626' },
  öpnv: { icon: 'Train', color: '#0ea5e9' },
  transport: { icon: 'Train', color: '#0ea5e9' },
  taxi: { icon: 'Car', color: '#fbbf24' },
  uber: { icon: 'Car', color: '#000000' },

  // Food & Groceries
  lebensmittel: { icon: 'ShoppingCart', color: '#22c55e' },
  groceries: { icon: 'ShoppingCart', color: '#22c55e' },
  einkauf: { icon: 'ShoppingCart', color: '#22c55e' },
  supermarkt: { icon: 'ShoppingCart', color: '#22c55e' },
  aldi: { icon: 'ShoppingCart', color: '#00457c' },
  lidl: { icon: 'ShoppingCart', color: '#0050aa' },
  rewe: { icon: 'ShoppingCart', color: '#cc0000' },
  edeka: { icon: 'ShoppingCart', color: '#ffe600' },
  restaurant: { icon: 'Utensils', color: '#f97316' },
  essen: { icon: 'Utensils', color: '#f97316' },
  food: { icon: 'Utensils', color: '#f97316' },
  cafe: { icon: 'Coffee', color: '#78350f' },
  kaffee: { icon: 'Coffee', color: '#78350f' },
  coffee: { icon: 'Coffee', color: '#78350f' },
  starbucks: { icon: 'Coffee', color: '#00704a' },

  // Health
  gesundheit: { icon: 'Heart', color: '#ef4444' },
  health: { icon: 'Heart', color: '#ef4444' },
  arzt: { icon: 'Stethoscope', color: '#ef4444' },
  doctor: { icon: 'Stethoscope', color: '#ef4444' },
  apotheke: { icon: 'Pill', color: '#22c55e' },
  pharmacy: { icon: 'Pill', color: '#22c55e' },
  medikamente: { icon: 'Pill', color: '#22c55e' },
  medicine: { icon: 'Pill', color: '#22c55e' },
  krankenversicherung: { icon: 'HeartPulse', color: '#ef4444' },
  fitness: { icon: 'Dumbbell', color: '#8b5cf6' },
  gym: { icon: 'Dumbbell', color: '#8b5cf6' },
  sport: { icon: 'Dumbbell', color: '#8b5cf6' },

  // Children & Family
  kind: { icon: 'Baby', color: '#ec4899' },
  kinder: { icon: 'Baby', color: '#ec4899' },
  child: { icon: 'Baby', color: '#ec4899' },
  children: { icon: 'Baby', color: '#ec4899' },
  schule: { icon: 'GraduationCap', color: '#6366f1' },
  school: { icon: 'GraduationCap', color: '#6366f1' },
  kindergarten: { icon: 'Baby', color: '#ec4899' },
  kita: { icon: 'Baby', color: '#ec4899' },
  nanny: { icon: 'Baby', color: '#ec4899' },
  babysitter: { icon: 'Baby', color: '#ec4899' },
  tanzen: { icon: 'Music2', color: '#ec4899' },
  turnen: { icon: 'Dumbbell', color: '#8b5cf6' },

  // Income
  gehalt: { icon: 'Banknote', color: '#22c55e' },
  salary: { icon: 'Banknote', color: '#22c55e' },
  lohn: { icon: 'Banknote', color: '#22c55e' },
  einkommen: { icon: 'Banknote', color: '#22c55e' },
  income: { icon: 'Banknote', color: '#22c55e' },
  freelance: { icon: 'Laptop', color: '#0ea5e9' },
  selbständig: { icon: 'Laptop', color: '#0ea5e9' },
  bonus: { icon: 'Gift', color: '#22c55e' },
  dividende: { icon: 'TrendingUp', color: '#22c55e' },
  dividend: { icon: 'TrendingUp', color: '#22c55e' },
  zinsen: { icon: 'TrendingUp', color: '#22c55e' },
  interest: { icon: 'TrendingUp', color: '#22c55e' },
  kapital: { icon: 'TrendingUp', color: '#22c55e' },

  // Savings & Investment
  sparen: { icon: 'PiggyBank', color: '#8b5cf6' },
  savings: { icon: 'PiggyBank', color: '#8b5cf6' },
  notgroschen: { icon: 'PiggyBank', color: '#22c55e' },
  emergency: { icon: 'PiggyBank', color: '#22c55e' },
  rücklage: { icon: 'PiggyBank', color: '#8b5cf6' },
  investieren: { icon: 'TrendingUp', color: '#22c55e' },
  investment: { icon: 'TrendingUp', color: '#22c55e' },
  aktien: { icon: 'TrendingUp', color: '#22c55e' },
  stocks: { icon: 'TrendingUp', color: '#22c55e' },
  etf: { icon: 'TrendingUp', color: '#22c55e' },
  urlaub: { icon: 'Plane', color: '#0ea5e9' },
  vacation: { icon: 'Plane', color: '#0ea5e9' },
  reise: { icon: 'Plane', color: '#0ea5e9' },
  travel: { icon: 'Plane', color: '#0ea5e9' },

  // Shopping & Lifestyle
  kleidung: { icon: 'Shirt', color: '#ec4899' },
  clothes: { icon: 'Shirt', color: '#ec4899' },
  shopping: { icon: 'ShoppingBag', color: '#ec4899' },
  amazon: { icon: 'Package', color: '#ff9900' },
  geschenk: { icon: 'Gift', color: '#ec4899' },
  gift: { icon: 'Gift', color: '#ec4899' },
  hobby: { icon: 'Gamepad2', color: '#8b5cf6' },
  gaming: { icon: 'Gamepad2', color: '#8b5cf6' },
  bücher: { icon: 'BookOpen', color: '#78350f' },
  books: { icon: 'BookOpen', color: '#78350f' },

  // Services & Subscriptions
  abo: { icon: 'CreditCard', color: '#6366f1' },
  subscription: { icon: 'CreditCard', color: '#6366f1' },
  mitgliedschaft: { icon: 'CreditCard', color: '#6366f1' },
  membership: { icon: 'CreditCard', color: '#6366f1' },
  cloud: { icon: 'Cloud', color: '#0ea5e9' },
  software: { icon: 'Laptop', color: '#6366f1' },

  // Misc
  haushalt: { icon: 'Home', color: '#64748b' },
  household: { icon: 'Home', color: '#64748b' },
  reinigung: { icon: 'Sparkles', color: '#0ea5e9' },
  cleaning: { icon: 'Sparkles', color: '#0ea5e9' },
  haustier: { icon: 'PawPrint', color: '#f97316' },
  pet: { icon: 'PawPrint', color: '#f97316' },
  hund: { icon: 'Dog', color: '#78350f' },
  dog: { icon: 'Dog', color: '#78350f' },
  katze: { icon: 'Cat', color: '#64748b' },
  cat: { icon: 'Cat', color: '#64748b' },
  bildung: { icon: 'GraduationCap', color: '#6366f1' },
  education: { icon: 'GraduationCap', color: '#6366f1' },
  kurs: { icon: 'GraduationCap', color: '#6366f1' },
  course: { icon: 'GraduationCap', color: '#6366f1' },
  spende: { icon: 'Heart', color: '#ef4444' },
  donation: { icon: 'Heart', color: '#ef4444' },
  steuer: { icon: 'Receipt', color: '#64748b' },
  tax: { icon: 'Receipt', color: '#64748b' },
}

// Default suggestions based on ZBB category type
const TYPE_DEFAULTS: Record<ZBBCategoryType, CategorySuggestion> = {
  INCOME: { icon: 'Banknote', color: '#22c55e' },
  FIX: { icon: 'Receipt', color: '#3b82f6' },
  VARIABLE: { icon: 'ShoppingCart', color: '#f97316' },
  SF1: { icon: 'PiggyBank', color: '#8b5cf6' },
  SF2: { icon: 'Target', color: '#ec4899' },
}

/**
 * Get icon and color suggestions based on category name and type
 * Checks keywords in name against known mappings, falls back to type defaults
 */
export function getCategorySuggestion(
  name: string,
  type: ZBBCategoryType
): CategorySuggestion {
  const nameLower = name.toLowerCase().trim()

  // Check each keyword
  for (const [keyword, suggestion] of Object.entries(KEYWORD_SUGGESTIONS)) {
    if (nameLower.includes(keyword)) {
      return suggestion
    }
  }

  // Fall back to type-based defaults
  return TYPE_DEFAULTS[type] || TYPE_DEFAULTS.VARIABLE
}

/**
 * Check if a name contains any known keywords
 */
export function hasKnownKeyword(name: string): boolean {
  const nameLower = name.toLowerCase().trim()
  return Object.keys(KEYWORD_SUGGESTIONS).some((keyword) =>
    nameLower.includes(keyword)
  )
}
