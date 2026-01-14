import { LucideIcon } from 'lucide-react'
import {
  // Money & Finance
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  // Work & Income
  Briefcase,
  Laptop,
  Building,
  GraduationCap,
  // Shopping & Groceries
  ShoppingCart,
  ShoppingBag,
  Store,
  Gift,
  // Food & Dining
  Utensils,
  Coffee,
  Pizza,
  Wine,
  IceCream,
  // Transportation
  Car,
  Train,
  Plane,
  Bus,
  Bike,
  Fuel,
  // Home & Living
  Home,
  Zap,
  Droplet,
  Wifi,
  Smartphone,
  Tv,
  // Entertainment
  Film,
  Music,
  Gamepad2,
  Camera,
  Ticket,
  // Health & Wellness
  Heart,
  Activity,
  Pill,
  Dumbbell,
  // Education & Learning
  BookOpen,
  Newspaper,
  School,
  // Miscellaneous
  Sparkles,
  Star,
  Sun,
  Moon,
  Cloud,
  Umbrella,
  Shirt,
  Scissors,
  Wrench,
  Package,
  HelpCircle,
} from 'lucide-react'

/**
 * Maps icon name strings to actual Lucide React components
 * Direct mapping for better performance and reliability
 */

// Icon name to component mapping
const ICON_MAP: Record<string, LucideIcon> = {
  // Money & Finance
  Wallet,
  CreditCard,
  Banknote,
  Coins,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  // Work & Income
  Briefcase,
  Laptop,
  Building,
  GraduationCap,
  // Shopping & Groceries
  ShoppingCart,
  ShoppingBag,
  Store,
  Gift,
  // Food & Dining
  Utensils,
  Coffee,
  Pizza,
  Wine,
  IceCream,
  // Transportation
  Car,
  Train,
  Plane,
  Bus,
  Bike,
  Fuel,
  // Home & Living
  Home,
  Zap,
  Droplet,
  Wifi,
  Smartphone,
  Tv,
  // Entertainment
  Film,
  Music,
  Gamepad2,
  Camera,
  Ticket,
  // Health & Wellness
  Heart,
  Activity,
  Pill,
  Dumbbell,
  // Education & Learning
  BookOpen,
  Newspaper,
  School,
  // Miscellaneous
  Sparkles,
  Star,
  Sun,
  Moon,
  Cloud,
  Umbrella,
  Shirt,
  Scissors,
  Wrench,
  Package,
  HelpCircle,
}

// Fallback icon
const FallbackIcon = HelpCircle

/**
 * Get a Lucide icon component by name
 * @param iconName - The name of the icon (e.g., 'ShoppingCart', 'Film')
 * @returns The icon component or fallback icon if not found
 */
export function getIconComponent(iconName: string | null | undefined): LucideIcon {
  if (!iconName) {
    return FallbackIcon
  }

  // Direct lookup
  const IconComponent = ICON_MAP[iconName]

  if (IconComponent) {
    return IconComponent
  }

  console.warn(`Icon "${iconName}" not found in icon map. Available icons:`, Object.keys(ICON_MAP).slice(0, 10).join(', '))
  return FallbackIcon
}

/**
 * Render an icon by name with optional className
 */
export interface IconProps {
  name: string | null | undefined
  className?: string
  size?: number
}

export function Icon({ name, className, size }: IconProps) {
  const IconComponent = getIconComponent(name)
  return <IconComponent className={className} size={size} />
}

/**
 * Common icons used in Budget Zen for category selection
 */
export const COMMON_ICONS = Object.keys(ICON_MAP).filter(name => name !== 'HelpCircle')

/**
 * Get icon component for a category icon name
 * This is a convenience wrapper for getIconComponent
 */
export function getCategoryIcon(iconName: string | null | undefined): LucideIcon {
  return getIconComponent(iconName)
}

// Export icon type
export type IconName = keyof typeof ICON_MAP
