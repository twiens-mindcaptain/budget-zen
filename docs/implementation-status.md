# Budget Zen - Implementation Status & Documentation

## Project Overview

**Budget Zen** is a minimalist, keyboard-first expense tracker designed for speed, privacy, and an "Excel-soul in an App-body" experience.

### Core Philosophy
- **Keyboard-First**: All main actions accessible via shortcuts
- **Optimistic UI**: Instant feedback using `useOptimistic` hook
- **Server Components**: Leverage Next.js App Router for optimal performance
- **Type Safety**: Full TypeScript with Zod validation, no `any` types

## Tech Stack

### Framework & Core
- **Next.js 14+** (App Router)
  - Server Components by default
  - Server Actions for mutations
  - Dynamic route segments for i18n
- **TypeScript** (strict mode)
- **React 18+**

### Styling & UI
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for all interactive components (buttons, dialogs, inputs, dropdown menus)
- **lucide-react** for icons
- **country-flag-icons** (v6+) for SVG flag components

### Internationalization
- **next-intl v3+** with new routing API
  - `defineRouting` configuration pattern
  - Request-scoped configuration with `getRequestConfig`
  - `localePrefix: 'always'` mode - all routes include locale prefix
  - Supported locales: English (`en`), German (`de`)

### Backend & Services
- **Supabase** (PostgreSQL database)
  - Standard SQL queries
  - Supabase JS Client for data access
- **Clerk** for authentication
  - `<SignedIn>`, `<SignedOut>` components
  - `auth()` helper for server-side auth
  - Middleware integration for route protection

### Data Management & Validation
- **Zod** for schema validation (all forms)
- **react-hook-form** for form state management
- **date-fns** for date handling
- **URL search params** for global state management
- **useOptimistic** for immediate UI updates

### Key Dependencies
```json
{
  "@clerk/nextjs": "^5.x",
  "next-intl": "^3.x",
  "country-flag-icons": "^1.x",
  "zod": "^3.x",
  "react-hook-form": "^7.x",
  "date-fns": "^3.x",
  "lucide-react": "^0.x"
}
```

## Architecture

### Directory Structure
```
budget_zen/
├── app/
│   └── [locale]/              # Locale-based routing
│       ├── layout.tsx         # Root layout with html/body tags
│       ├── page.tsx           # Dashboard page
│       ├── icon.tsx           # Favicon (must be in locale folder)
│       ├── sign-in/           # Clerk sign-in routes
│       └── sign-up/           # Clerk sign-up routes
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── language-switcher.tsx # Locale switcher with SVG flags
│   └── transactions/          # Transaction-related components
│       └── quick-add-dialog.tsx
├── i18n/
│   ├── routing.ts             # Routing configuration (defineRouting)
│   └── request.ts             # Request-scoped config (getRequestConfig)
├── messages/
│   ├── en.json                # English translations
│   └── de.json                # German translations
├── lib/
│   └── types.ts               # Zod schemas and TypeScript types
├── middleware.ts              # Clerk + next-intl middleware chain
├── next.config.js             # Next.js config with next-intl plugin
└── CLAUDE.md                  # Project rules and context
```

### Key Architecture Decisions

#### 1. No Root Layout
- **Decision**: No `app/layout.tsx` file exists
- **Reason**: With `localePrefix: 'always'`, all routes go through `[locale]` segment
- **Impact**: Prevents hydration errors and 404s

#### 2. Middleware Chaining
```typescript
// middleware.ts
const intlMiddleware = createMiddleware(routing)

export default clerkMiddleware((auth, request: NextRequest) => {
  if (!isPublicRoute(request)) {
    auth.protect()
  }
  return intlMiddleware(request)
})
```
- Clerk authentication runs first
- next-intl middleware handles locale routing
- Public routes: sign-in, sign-up pages

#### 3. Server Actions Over API Routes
- No `/pages/api` directory
- All mutations use Server Actions (`'use server'`)
- No `useEffect` for data fetching
- Data fetched directly in Server Components

#### 4. Optimistic UI Pattern
```typescript
const [optimisticTransactions, addOptimisticTransaction] = useOptimistic(
  transactions,
  (state, newTransaction) => [newTransaction, ...state]
)
```
- Updates UI immediately
- Server action completes in background
- Automatic revalidation

## Internationalization Implementation

### Configuration Files

#### i18n/routing.ts
```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  localePrefix: 'always'
})
```

#### i18n/request.ts
```typescript
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  }
})
```

### URL Structure
- All routes include locale prefix
- English: `/en/dashboard`, `/en/sign-in`
- German: `/de/dashboard`, `/de/sign-in`
- Root redirects to default locale: `/` → `/en`

### Language Switcher
- **Component**: [components/language-switcher.tsx](../components/language-switcher.tsx)
- **Implementation**: SVG flags from `country-flag-icons/react/3x2`
- **Cross-platform**: Works on Windows, Linux, macOS (no emoji dependency)
- **Performance**: No `router.refresh()` - automatic updates
- **UI**: Dropdown menu with flag icons and checkmark for active locale

```typescript
const languages = [
  { code: 'en', name: 'English', Flag: US },
  { code: 'de', name: 'Deutsch', Flag: DE },
]

const switchLanguage = (newLocale: string) => {
  const pathnameWithoutLocale = pathname.replace(`/${locale}`, '') || '/'
  router.push(`/${newLocale}${pathnameWithoutLocale}`)
}
```

## Implemented Features

### 1. Authentication System
- **Provider**: Clerk
- **Status**: ✅ Fully implemented
- **Features**:
  - Sign-in / Sign-up flows
  - Protected routes via middleware
  - Public routes: `/en`, `/de`, sign-in/up pages
  - Server-side auth with `auth()` helper
  - Client-side auth with `<SignedIn>` / `<SignedOut>` components

### 2. Internationalization
- **Provider**: next-intl v3+
- **Status**: ✅ Fully implemented
- **Features**:
  - English and German language support
  - URL-based locale routing (`/en/*`, `/de/*`)
  - Server-side translation loading
  - Language switcher with SVG flags
  - Automatic locale detection
  - Locale-specific metadata
  - Multilingual system categories with `translation_key` support
  - Locale-aware currency formatting (Intl.NumberFormat)
  - All UI text properly translated (no hardcoded English)

### 3. Quick Add Transaction Dialog
- **Component**: [components/transactions/quick-add-dialog.tsx](../components/transactions/quick-add-dialog.tsx)
- **Status**: ✅ Fully implemented
- **Features**:
  - Global keyboard shortcut trigger (Press `N`)
  - Auto-focus on amount field
  - Zod validation with decimal input support
  - react-hook-form integration
  - Account selection dropdown
  - Category selection (filtered by income/expense type)
  - Note field (optional)
  - Date/time picker (datetime-local)
  - Transaction type detection (+/- prefix)
  - Multiple save options (Enter = save & close, Cmd/Ctrl+Enter = save & add another)
  - Formatted keyboard shortcuts with `<kbd>` tags
  - Multilingual interface
  - Server Action submission
  - Form reset after successful submission

### 4. Dashboard
- **Route**: [app/\[locale\]/page.tsx](../app/[locale]/page.tsx)
- **Status**: ✅ Fully implemented
- **Features**:
  - Summary cards (Balance, Total Income, Total Expenses, Net Flow)
  - Locale-aware currency formatting (de-DE: 4.273,00 €, en-US: 4,273.00)
  - Transaction list with category icons and colors
  - Server Component data fetching
  - Locale-aware date formatting
  - Keyboard shortcut hint for quick add
  - Consistent page width with Settings page (max-w-4xl)

### 5. Settings & Category Management
- **Route**: [app/\[locale\]/settings/page.tsx](../app/[locale]/settings/page.tsx)
- **Status**: ✅ Fully implemented
- **Features**:
  - Tabbed interface (Categories, Accounts)
  - Category CRUD operations (Create, Read, Update, Delete)
  - System categories with multilingual support
  - User categories with custom names
  - Icon picker with lucide-react icons
  - Color picker for category colors
  - Separate lists for income/expense categories
  - Delete confirmation dialog
  - Form validation with Zod
  - Category display with translated names via `getCategoryDisplayName()`
  - Budget settings for categories (variable, fixed, sinking fund)
  - Target amount and frequency configuration

### 6. Multilingual Category System
- **Status**: ✅ Fully implemented
- **Database**: Migration with `translation_key` column
- **Helper**: [lib/i18n-helpers.ts](../lib/i18n-helpers.ts)
- **Features**:
  - System categories use `translation_key` (e.g., "category.groceries")
  - User categories use direct `name` field
  - Automatic translation in all UI components
  - Edit form loads translated names correctly
  - 16 predefined system categories (salary, freelance, groceries, rent, etc.)
  - Check constraint ensures data integrity (name OR translation_key required)
  - Database index on `translation_key` for performance

### 7. Account Management
- **Routes**: [app/\[locale\]/settings/page.tsx](../app/[locale]/settings/page.tsx)
- **Server Actions**: [app/actions/accounts.ts](../app/actions/accounts.ts)
- **Status**: ✅ Fully implemented
- **Features**:
  - Full CRUD operations (Create, Read, Update, Delete)
  - Account types: Cash, Bank, Credit Card, Savings
  - Initial balance configuration
  - Current balance calculation (initial_balance + sum of transactions)
  - Negative balance display with red color and minus prefix
  - Account dialog with form validation (Zod)
  - Delete confirmation with safety warning
  - Server actions use service role key to bypass RLS
  - Multilingual account type labels

### 8. Budget Features
- **Database**: Migration with budget fields on categories
- **Status**: ✅ Fully implemented
- **Features**:
  - Three budget types:
    - **Variable**: No budget tracking (default)
    - **Fixed Recurring**: Regular expenses (rent, subscriptions)
    - **Sinking Fund**: Savings goals (vacation, car, emergency)
  - Target amount configuration with decimal precision
  - Frequency options: Monthly, Quarterly, Semi-Annual, Annual
  - Automatic monthly_target calculation based on frequency
  - Conditional form fields (shown only for fixed/sinking_fund)
  - Database function `calculate_monthly_target()` for consistency
  - Budget fields fully integrated into category CRUD

### 9. Safe-to-Spend Dashboard
- **Component**: [components/dashboard/summary-cards.tsx](../components/dashboard/summary-cards.tsx)
- **Server Action**: [app/actions/transaction.ts](../app/actions/transaction.ts) `getSafeToSpend()`
- **Status**: ✅ Fully implemented
- **Formula**: `Safe to Spend = Total Liquid Cash - Monthly Committed`
- **Features**:
  - Prominent display on dashboard (replaces main balance card)
  - Total Liquid: Sum of all account balances (initial + transactions)
  - Monthly Committed: Sum of monthly_target for fixed/sinking_fund categories
  - Color-coded: Green for positive, Red for negative
  - Breakdown display showing calculation components
  - Real-time updates based on accounts and budget settings

### 10. Currency Formatting
- **File**: [lib/currency.ts](../lib/currency.ts)
- **Status**: ✅ Fully implemented
- **Features**:
  - Locale-aware number formatting using Intl.NumberFormat
  - German (de-DE): 1.234,56 € (dot for thousands, comma for decimals)
  - English (en-US): 1,234.56 € (comma for thousands, dot for decimals)
  - Support for 20+ currencies with correct symbol placement
  - Helper function `getFullLocale()` for locale mapping
  - Currency symbol position (before/after) based on currency type

### 11. Type System
- **File**: [lib/types.ts](../lib/types.ts)
- **Status**: ✅ Fully implemented
- **Features**:
  - Zod schemas for all forms
  - Type inference from schemas
  - Database type definitions
  - Category interface with `translation_key` and budget fields support
  - Account types and schemas
  - Budget types (BudgetType, BudgetFrequency)
  - Strict type safety (no `any` types)

### Transaction Schema Example
```typescript
export const insertTransactionSchema = z.object({
  account_id: z.string().uuid('Please select a valid account'),
  category_id: z.string().optional(),
  amount: z.string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(parseFloat(val)), 'Must be a valid number')
    .refine((val) => parseFloat(val) !== 0, 'Amount cannot be zero'),
  description: z.string().optional(),
  date: z.date()
})
```

## Database Schema

### Key Tables

#### transactions
User expense/income records:
- `id` (UUID, primary key)
- `user_id` (text, Clerk user ID)
- `account_id` (UUID, foreign key)
- `category_id` (UUID, foreign key, nullable)
- `amount` (decimal/numeric - never float)
- `note` (text, nullable)
- `date` (timestamp with time zone)
- `created_at`, `updated_at`

#### accounts
User bank accounts/wallets with current balance tracking:
- `id` (UUID, primary key)
- `user_id` (text, Clerk user ID)
- `name` (text)
- `type` (enum: cash, bank, credit, savings)
- `initial_balance` (decimal/numeric) - Starting balance
- `created_at`
- **Note**: Current balance calculated dynamically (initial_balance + sum of transactions)

#### categories
Transaction categories with multilingual support and budget tracking:
- `id` (UUID, primary key)
- `user_id` (text, Clerk user ID)
- `name` (text, nullable) - For user-created categories
- `translation_key` (text, nullable) - For system categories (e.g., "category.groceries")
- `icon` (text) - Lucide icon name
- `color` (text) - Hex color code
- `type` (enum: income, expense)
- `budget_type` (text) - Budget tracking mode: variable, fixed, sinking_fund
- `target_amount` (decimal, nullable) - Target amount for budgeting
- `frequency` (text) - Frequency: monthly, quarterly, semi_annual, annual
- `monthly_target` (decimal, nullable) - Calculated monthly target amount
- `created_at`
- **Constraint**: `name` OR `translation_key` must be set (CHECK constraint)
- **Index**: On `translation_key` for performance
- **Function**: `calculate_monthly_target(target_amount, frequency)` for automatic calculation

### Currency Handling
- **Critical Rule**: NEVER use `float` or JavaScript `number` for currency
- Store as `DECIMAL` or `NUMERIC` in database
- Handle as strings in frontend for precision
- Convert carefully for calculations
- Use `Intl.NumberFormat` for locale-aware display

## Component Patterns

### Server Components (Default)
```typescript
// app/[locale]/page.tsx
export default async function DashboardPage() {
  const { userId } = await auth()
  const transactions = await fetchTransactions(userId)

  return <TransactionList transactions={transactions} />
}
```

### Client Components (When Needed)
```typescript
'use client'

export function QuickAddDialog() {
  const [open, setOpen] = useState(false)

  // Interactive features: forms, state, events
}
```

### Server Actions
```typescript
'use server'

export async function createTransaction(formData: FormData) {
  const { userId } = await auth()

  // Validate with Zod
  const validatedData = insertTransactionSchema.parse(data)

  // Insert to database
  await db.insert(transactions).values(validatedData)

  // Revalidate
  revalidatePath('/[locale]', 'layout')
}
```

## Known Issues & Solutions

### Issue: Hydration Errors (RESOLVED)
- **Problem**: React hydration mismatch with root layout
- **Solution**: Removed `app/layout.tsx`, only use `app/[locale]/layout.tsx`

### Issue: Favicon 404 (RESOLVED)
- **Problem**: Icon not loading from `app/icon.tsx`
- **Solution**: Moved to `app/[locale]/icon.tsx`

### Issue: Slow Language Switching (RESOLVED)
- **Problem**: `router.refresh()` causing full page reload
- **Solution**: Removed `router.refresh()` - Next.js handles updates automatically

### Issue: Emoji Flags Not Cross-Platform (RESOLVED)
- **Problem**: Flag emojis don't render consistently on Windows/Linux
- **Solution**: Switched to SVG flags from `country-flag-icons` package

### Issue: Zod Type Inference (RESOLVED)
- **Problem**: Complex `z.preprocess` causing type errors with `category_id`
- **Solution**: Simplified to `z.string().optional()`, handle empty strings in server action

### Issue: SQL Migration NOT NULL Constraint Violation (RESOLVED)
- **Problem**: Migration failed with "null value in column 'name' violates not-null constraint"
- **Solution**: Added `ALTER COLUMN name DROP NOT NULL` before migrating data

### Issue: Empty Category Name in Edit Form (RESOLVED)
- **Problem**: System categories showed empty name in edit form
- **Solution**: Use `getCategoryDisplayName()` when loading form defaults

### Issue: Inconsistent Page Width (RESOLVED)
- **Problem**: Dashboard used `max-w-2xl` while Settings used `max-w-4xl`
- **Solution**: Standardized both pages to `max-w-4xl`

### Issue: Hardcoded English Text in Shortcuts (RESOLVED)
- **Problem**: Keyboard shortcut descriptions were hardcoded in English
- **Solution**: Added translation keys (transaction.press, transaction.toSaveAndClose, etc.) and updated DialogDescription to use them

### Issue: Currency Formatting (RESOLVED)
- **Problem**: No thousands separator or locale-specific decimal formatting
- **Solution**: Implemented `Intl.NumberFormat` with locale parameter (de-DE: 1.234,56 / en-US: 1,234.56)

### Issue: RLS Policy Violation on Account Creation (RESOLVED)
- **Problem**: "new row violates row-level security policy for table 'accounts'"
- **Root Cause**: Server Actions were using client-side `supabase` instead of `getServerSupabase()`
- **Solution**: Changed all imports in `app/actions/accounts.ts` to use `getServerSupabase()` which bypasses RLS using service role key (safe because Clerk handles authentication)

### Issue: NextIntl Context in Tabs (RESOLVED)
- **Problem**: "Failed to call `useTranslations` because the context from `NextIntlClientProvider` was not found"
- **Cause**: Mixing async server components with Suspense inside client Tabs component
- **Solution**: Refactored settings page to load all data server-side, created `SettingsTabs` client component that receives data as props

### Issue: TypeScript insertAccountSchema Type Mismatch (RESOLVED)
- **Problem**: "Type 'string | undefined' is not assignable to type 'string'"
- **Cause**: `initial_balance` field had `.default('0.00')` without `.optional()`
- **Solution**: Added `.optional()` before `.default()` in schema definition

### Issue: Negative Balance Display (RESOLVED)
- **Problem**: Negative account balances displayed in black without minus sign
- **Solution**: Added conditional styling with red color (`text-red-600`) and minus prefix using `Math.abs()` with `formatCurrency()`

## Development Guidelines

### Adding a New Feature
1. **Plan**: Determine if Server or Client Component
2. **Types**: Define Zod schema in `lib/types.ts`
3. **UI**: Use shadcn/ui components from `components/ui/`
4. **Data**: Create Server Action for mutations
5. **Optimistic UI**: Use `useOptimistic` for immediate feedback
6. **i18n**: Add translations to `messages/en.json` and `messages/de.json`

### Adding a New Locale
1. Create `messages/{locale}.json`
2. Add locale to `i18n/routing.ts` in `locales` array
3. Update `isPublicRoute` in `middleware.ts`
4. Add flag component to `language-switcher.tsx`

### Common Commands
```bash
# Add shadcn component
npx shadcn@latest add [component-name]

# Database migrations (Supabase)
npx supabase db push

# Development server
npm run dev

# Type checking
npm run type-check

# Build
npm run build
```

## File Size & Performance

### Optimizations Implemented
- Server Components for static content
- SVG flags instead of emoji (smaller bundle)
- No unnecessary `router.refresh()` calls
- Optimistic UI reduces perceived latency
- Minimal client-side JavaScript

### Bundle Analysis
- Core UI components from shadcn/ui (tree-shakeable)
- next-intl adds ~15kb gzipped
- country-flag-icons: ~2kb per flag (lazy loaded)

## Security Considerations

### Authentication
- All non-public routes protected via middleware
- Server Actions validate user ownership
- Clerk handles session management

### Data Validation
- **Input**: All forms validated with Zod before submission
- **Server**: Server Actions re-validate all data
- **SQL**: Using parameterized queries via Supabase client

### Potential Vulnerabilities Addressed
- ✅ XSS: React escapes by default
- ✅ SQL Injection: Using ORM/query builder
- ✅ CSRF: Server Actions use built-in protection
- ✅ Auth: Clerk handles security best practices

## Future Enhancements

### Planned Features
- [ ] Budget alerts and notifications (when exceeding targets)
- [ ] Recurring transactions (auto-create monthly bills)
- [ ] Data export (CSV, Excel)
- [ ] Advanced filtering and search
- [ ] Charts and visualizations (spending by category, trends over time)
- [ ] Dark mode
- [ ] Date navigation (month/year picker)
- [ ] Transaction editing and deletion
- [ ] Bulk operations (delete multiple transactions)
- [ ] Search transactions
- [ ] Filter by date range, account, category
- [ ] Budget progress tracking (spent vs. target for current month)
- [ ] Recurring transaction templates

### Completed Features
- [x] Categories management UI (CRUD operations)
- [x] Multilingual system categories
- [x] Locale-aware currency formatting
- [x] Icon picker for categories
- [x] Color picker for categories
- [x] Keyboard shortcuts with proper formatting
- [x] Accounts management UI (create, edit, delete accounts)
- [x] Budget tracking (variable, fixed, sinking fund)
- [x] Safe-to-Spend calculation and display
- [x] Account balance tracking (initial + transactions)
- [x] Budget target amounts with frequency configuration
- [x] Monthly target calculation based on frequency

### Technical Improvements
- [ ] Unit tests (Jest + React Testing Library)
- [ ] E2E tests (Playwright)
- [ ] Error boundary components
- [ ] Loading states with Suspense
- [ ] Database indexes optimization
- [ ] API rate limiting
- [ ] Audit logging

## Resources

### Documentation
- [Next.js App Router](https://nextjs.org/docs/app)
- [next-intl Routing](https://next-intl.dev/docs/routing)
- [Clerk Next.js Integration](https://clerk.com/docs/nextjs)
- [shadcn/ui](https://ui.shadcn.com)
- [Zod](https://zod.dev)

### Project Files
- [CLAUDE.md](../CLAUDE.md) - Project rules and context
- [middleware.ts](../middleware.ts) - Authentication + i18n routing
- [i18n/routing.ts](../i18n/routing.ts) - Locale configuration

---

**Last Updated**: 2026-01-13
**Version**: 1.2.0
**Status**: Active Development

**Recent Updates (v1.2.0)**:
- ✅ Complete account management system with CRUD operations
- ✅ Budget tracking features (variable, fixed recurring, sinking fund)
- ✅ Safe-to-Spend calculation and dashboard display
- ✅ Target amount configuration with frequency options
- ✅ Automatic monthly_target calculation based on frequency
- ✅ Current balance tracking for accounts (initial + transactions)
- ✅ Negative balance display with red color and minus prefix
- ✅ Service role key pattern for RLS bypass in server actions
- ✅ Settings page with functional Accounts tab
- ✅ 40+ new i18n translations for accounts and budget features

**Previous Updates (v1.1.0)**:
- ✅ Complete category management system with CRUD operations
- ✅ Multilingual system categories with translation_key support
- ✅ Locale-aware currency formatting (Intl.NumberFormat)
- ✅ Keyboard shortcuts with proper translation and formatting
- ✅ Settings page with tabbed interface
- ✅ Icon and color pickers for categories
- ✅ Consistent page width across Dashboard and Settings
