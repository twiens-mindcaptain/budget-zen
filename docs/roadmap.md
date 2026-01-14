# ROADMAP.md - Sprint Plan

## Project Context

- **Current State:** Functional Dashboard with Transaction List, Summary Cards, and Category Management.
- **Visual Status:** Clean styling with proper icons, multilingual support, and currency formatting.
- **Tech Stack:** Next.js 14, Supabase, Clerk, Tailwind, shadcn/ui, next-intl.
- **Goal:** Transform from "Working Prototype" to "Sellable MVP".

---

## Phase 1: Data Management & Settings ✅ COMPLETED

**Objective:** Enable user customization and fix visual glitches (Icons).

### 1.1 Category & Icon System Overhaul ✅ COMPLETED

- ✅ Created icon mapper in `lib/icon-mapper.ts` that maps string names to `lucide-react` components
- ✅ Updated all components to render actual SVG icons using `getCategoryIcon()`
- ✅ Created `app/[locale]/settings/page.tsx` with tabbed interface
- ✅ Implemented Category Tab with full CRUD operations
- ✅ Added icon picker with 50+ financial icons from Lucide
- ✅ Added color picker for category customization
- ✅ Implemented system categories with multilingual support (translation_key)
- ✅ User categories maintain their original names
- ✅ Database migration with `translation_key` column and check constraint
- ✅ Created helper function `getCategoryDisplayName()` in `lib/i18n-helpers.ts`
- ✅ Updated all UI components to use translated category names

### 1.2 Currency Formatting ✅ COMPLETED

- ✅ Implemented locale-aware currency formatting using `Intl.NumberFormat`
- ✅ German (de-DE): 1.234,56 € (dot for thousands, comma for decimals)
- ✅ English (en-US): 1,234.56 € (comma for thousands, dot for decimals)
- ✅ Created `getFullLocale()` helper for locale mapping
- ✅ Support for 20+ currencies with correct symbol placement

### 1.3 Keyboard Shortcuts ✅ COMPLETED

- ✅ Formatted all keyboard shortcuts with `<kbd>` tags
- ✅ Consistent monospace font styling across all shortcuts
- ✅ Translated shortcut descriptions (no hardcoded English)
- ✅ Added translation keys for Press, to save and close, or, to save and add another

### 1.4 Account Management ✅ COMPLETED

- ✅ Created Settings > Accounts tab with full CRUD operations
- ✅ Account types: Cash, Bank, Credit Card, Savings
- ✅ Initial balance configuration with decimal precision
- ✅ Current balance calculation (initial_balance + sum of transactions)
- ✅ Account creation dialog with form validation (Zod)
- ✅ Edit account functionality
- ✅ Delete confirmation with safety warning
- ✅ Negative balance display with red color and minus prefix
- ✅ Server actions use service role key to bypass RLS
- ✅ Multilingual account type labels

### 1.5 Budget Features ✅ COMPLETED

- ✅ Database migration adding budget fields to categories table
- ✅ Three budget types: Variable (no budget), Fixed Recurring, Sinking Fund
- ✅ Target amount configuration with decimal precision
- ✅ Frequency options: Monthly, Quarterly, Semi-Annual, Annual
- ✅ Automatic monthly_target calculation based on frequency
- ✅ Conditional form fields in category dialog (shown only for fixed/sinking_fund)
- ✅ Database function `calculate_monthly_target()` for consistency
- ✅ Budget settings fully integrated into category CRUD

### 1.6 Safe-to-Spend Dashboard ✅ COMPLETED

- ✅ Implemented Safe-to-Spend calculation (Total Liquid - Monthly Committed)
- ✅ Replaced main balance card with Safe-to-Spend display
- ✅ Total Liquid: Sum of all account balances
- ✅ Monthly Committed: Sum of monthly_target for fixed/sinking_fund categories
- ✅ Color-coded display (green for positive, red for negative)
- ✅ Breakdown showing calculation components
- ✅ Real-time updates based on accounts and budget settings

---

## Phase 2: Navigation & Visualization ⏳ IN PROGRESS

**Objective:** Make the dashboard feel alive and navigable.

### 2.1 Date Navigation (The Time Machine) 📋 PLANNED

- **UI:** Add a "Month Picker" or `< ChevronLeft > Month Year < ChevronRight >` control above summary cards
- **State:** Manage state via URL Search Params (`?month=2026-01`)
- **Backend:** Update `getMonthlyStats` and `getRecentTransactions` to accept `startDate` and `endDate`
- **Logic:** Filter Supabase queries by date range
- **UX:** Smooth transitions between months
- **Default:** Show current month on initial load

### 2.2 Transaction Management 📋 PLANNED

- **Feature:** Edit existing transactions
- **Feature:** Delete transactions with confirmation dialog
- **Feature:** Duplicate transaction (useful for recurring expenses)
- **UI:** Add edit/delete buttons to transaction list items
- **Keyboard:** Shortcuts for edit (E) and delete (Del) when hovering transaction

### 2.3 Visual Insights (The "Zen" Factor) 📋 PLANNED

- **Library:** Install `recharts` (standard for React)
- **Component:** `components/dashboard/spending-chart.tsx`
- **Visual:** Minimal Donut/Pie Chart showing spending by category
- **Features:**
  - Top 5 categories shown individually
  - Remaining categories grouped as "Others"
  - Use category colors from database
  - Show percentage and amount on hover
- **Placement:**
  - **Desktop:** 2-column layout (transactions left, chart right)
  - **Mobile:** Stack chart above transaction list
- **Alternative:** Bar chart showing income vs expenses over time

---

## Phase 3: Enhanced Features 📋 PLANNED

**Objective:** Improve user experience and functionality.

### 3.1 Search & Filtering

- **Feature:** Search transactions by note/description
- **Feature:** Filter by account
- **Feature:** Filter by category
- **Feature:** Filter by date range
- **Feature:** Filter by amount range
- **UI:** Search bar and filter dropdowns above transaction list
- **State:** Manage via URL search params for shareable filtered views

### 3.2 Bulk Operations

- **Feature:** Select multiple transactions
- **Feature:** Bulk delete
- **Feature:** Bulk edit (change category, account)
- **Feature:** Bulk export
- **UI:** Checkbox selection mode with action toolbar

### 3.3 Data Export

- **Format:** CSV export for Excel/Google Sheets
- **Format:** PDF export for reports
- **Options:** Export filtered view or all transactions
- **Options:** Select date range
- **Options:** Include/exclude specific columns

---

## Phase 4: Monetization & Limits 📋 PLANNED

**Objective:** Implement the "Freemium" gatekeeper.

### 4.1 The Limit Logic

- **File:** `lib/limits.ts`
- **Rules:**
  - Free User: Max 50 transactions/month OR Max 5 custom categories
  - Pro User: Unlimited
- **Implementation:** Check limits in `createTransaction` and `createCategory` Server Actions
- **Error:** Throw `LIMIT_REACHED` error code when limit exceeded

### 4.2 The Paywall UI

- **Component:** `components/premium/upgrade-dialog.tsx`
- **Trigger:** Show dialog when `LIMIT_REACHED` is caught
- **Content:** "Unlock Budget Zen Pro" with feature list
- **Features:**
  - Unlimited transactions
  - Unlimited categories
  - Advanced charts
  - Data export
  - Priority support
- **Action:** Stripe Payment Link or LemonSqueezy integration

---

## Phase 5: Launch Polish 📋 PLANNED

**Objective:** Production readiness.

### 5.1 Landing Page (Unauthenticated State)

- **Logic:** Show landing page when `!userId` in root page
- **Design:** Hero section with value proposition
- **Content:**
  - Headline: "Stop fighting Excel. Start living."
  - Feature highlights (keyboard-first, multilingual, privacy)
  - Screenshot/demo
  - "Get Started" CTA button
  - Pricing section (Free vs Pro)

### 5.2 Mobile Optimization

- **Touch Targets:** Ensure all buttons have `min-h-[44px]`
- **Dialogs:** Test "Add Transaction" dialog on mobile keyboards
- **Layout:** Verify responsive breakpoints work correctly
- **Navigation:** Test mobile menu and navigation
- **Performance:** Optimize for mobile networks (lazy loading, code splitting)

### 5.3 Error Handling & Loading States

- **Component:** Add error boundary components
- **Suspense:** Add loading states with Suspense boundaries
- **Toast:** Implement toast notifications for success/error feedback
- **Validation:** User-friendly error messages for all forms
- **Offline:** Handle offline state gracefully

---

## Phase 6: Performance & Testing 📋 FUTURE

**Objective:** Ensure quality and reliability.

### 6.1 Testing

- **Unit Tests:** Jest + React Testing Library
- **E2E Tests:** Playwright for critical user flows
- **Coverage:** Aim for 80%+ coverage on business logic

### 6.2 Performance

- **Database:** Add indexes on frequently queried columns
- **Caching:** Implement caching strategy for read-heavy operations
- **Bundle:** Analyze and optimize bundle size
- **Images:** Optimize images and implement lazy loading

### 6.3 SEO & Meta

- **Meta Tags:** Proper Open Graph and Twitter Card tags
- **Sitemap:** Generate sitemap.xml
- **Robots:** Configure robots.txt
- **Analytics:** Set up analytics (privacy-focused)

---

## Progress Summary

### ✅ Completed (Phase 1)
- Authentication system (Clerk)
- Internationalization (next-intl v3)
- Dashboard with transaction list
- Summary cards with Safe-to-Spend
- Quick add transaction dialog
- Category management (CRUD)
- Multilingual system categories
- Currency formatting
- Icon and color pickers
- Keyboard shortcuts
- Account management (CRUD)
- Budget tracking features
- Safe-to-Spend calculation
- Monthly target calculation
- Settings page with tabs

### ⏳ In Progress (Phase 2)
- Transaction editing/deletion
- Date navigation
- Charts and visualizations

### 📋 Planned (Phase 3+)
- Search and filtering
- Bulk operations
- Data export
- Budget alerts
- Recurring transactions
- Monetization/limits
- Landing page
- Mobile optimization
- Error handling improvements
- Testing suite
