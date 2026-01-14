# Budget Zen 💸

A minimalist, keyboard-first expense tracker built with modern web technologies. Track your finances with speed, privacy, and an "Excel-soul in an App-body" experience.

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://github.com/yourusername/budget-zen)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Features

### Core Functionality
- 💰 **Quick Transaction Entry** - Add expenses/income in seconds with keyboard shortcuts
- 📊 **Dashboard** - Overview with balance, income, expenses, and safe-to-spend
- 🏦 **Account Management** - Track multiple bank accounts, cash, and credit cards
- 📋 **Budget Items** - Manage monthly bills and sinking funds (savings goals)
- 💸 **Safe to Spend** - Smart calculation: Total Cash - Pending Bills - Sinking Contributions
- ✅ **Bills Checklist** - Track which monthly bills have been paid
- 🐷 **Sinking Funds Progress** - Visual progress bars for savings goals
- 🏷️ **Category Management** - Full CRUD operations with custom icons and colors
- 🌍 **Multilingual** - Full English and German support
- 💱 **Smart Currency Formatting** - Locale-aware formatting (1.234,56 € vs 1,234.56 €)
- ⌨️ **Keyboard-First Design** - Press `N` to quickly add transactions
- 🎨 **Icon & Color Picker** - Customize categories with 50+ icons

### Technical Highlights
- 🚀 **Server Components** - Fast, SEO-friendly rendering
- 🔒 **Type-Safe** - Full TypeScript with Zod validation
- 🎯 **Decimal Precision** - No float errors with decimal(12,2) for amounts
- 🔐 **Secure Auth** - Clerk authentication with RLS
- 🌐 **i18n Ready** - next-intl v3 with automatic locale routing

## 🛠️ Tech Stack

### Framework & Core
- **Next.js 14+** (App Router) with TypeScript
- **React 18+** with Server Components
- **next-intl v3** for internationalization

### Styling & UI
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for interactive components
- **lucide-react** for icons (50+ financial icons)
- **country-flag-icons** for SVG flag components

### Backend & Services
- **Supabase** (PostgreSQL) with Row Level Security
- **Clerk** for authentication
- **Zod** for schema validation
- **react-hook-form** for form state management
- **date-fns** for date handling

## 📁 Project Structure

```
budget_zen/
├── app/
│   ├── [locale]/              # Locale-based routing
│   │   ├── page.tsx           # Dashboard
│   │   ├── settings/          # Settings page
│   │   └── layout.tsx         # Root layout
│   └── actions/               # Server Actions
│       ├── transaction.ts     # Transaction CRUD + Bills/Sinking Funds
│       ├── categories.ts      # Category CRUD
│       ├── accounts.ts        # Account CRUD
│       ├── budget-items.ts    # Budget Items CRUD
│       └── seed.ts            # Database seeding
├── components/
│   ├── transactions/          # Transaction components
│   │   └── quick-add-dialog.tsx
│   ├── settings/              # Settings components
│   │   ├── settings-tabs.tsx
│   │   ├── categories-tab.tsx
│   │   ├── accounts-tab.tsx
│   │   ├── budget-items-tab.tsx
│   │   ├── budget-item-dialog.tsx
│   │   ├── icon-picker.tsx
│   │   └── color-picker.tsx
│   ├── dashboard/             # Dashboard components
│   │   ├── summary-cards.tsx
│   │   ├── bills-checklist.tsx
│   │   ├── sinking-funds-progress.tsx
│   │   └── transaction-list.tsx
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── types.ts               # TypeScript types + Zod schemas
│   ├── currency.ts            # Currency formatting
│   ├── i18n-helpers.ts        # i18n helper functions
│   └── icon-mapper.ts         # Icon name to component mapping
├── i18n/
│   ├── routing.ts             # Routing configuration
│   └── request.ts             # Request-scoped i18n config
├── messages/
│   ├── en.json                # English translations
│   └── de.json                # German translations
├── docs/                      # Documentation
│   ├── implementation-status.md
│   ├── roadmap.md
│   └── translation-implementation.md
├── middleware.ts              # Clerk + next-intl middleware
└── CLAUDE.md                  # Project rules and conventions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Supabase account
- A Clerk account

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/budget-zen.git
cd budget-zen
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-publishable-key
CLERK_SECRET_KEY=your-secret-key
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL from `migration-add-translation-key.sql` in the Supabase SQL Editor
3. Seed initial data (categories, accounts) via the app or SQL

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
npm start
```

## 📖 Usage

### Adding Transactions (Keyboard-First!)

1. Press `N` anywhere on the page (or click "Add Transaction")
2. Enter amount (auto-focused, supports +/- prefix for income/expense)
3. Select account and category (category filtered by type)
4. Adjust date/time if needed
5. Add optional note
6. Press `Enter` to save and close
7. Press `Cmd+Enter` / `Ctrl+Enter` to save and add another

### Managing Categories

1. Go to Settings (gear icon)
2. Navigate to Categories tab
3. Create, edit, or delete categories
4. Choose from 50+ icons and custom colors
5. System categories are automatically translated

### Language Switching

Click the language switcher in the header to toggle between English and German. All system categories and UI text will update automatically.

## 🌍 Internationalization

Budget Zen supports multiple languages out of the box:

- **English** (`/en/*`)
- **German** (`/de/*`)

### Features:
- System categories auto-translate based on user's language
- User-created categories maintain their original name
- Locale-aware currency formatting
- All UI text and keyboard shortcuts translated
- SVG flag icons (cross-platform compatible)

## 💱 Currency Formatting

Currency amounts are formatted according to locale:

- **German (de-DE)**: 4.273,00 € (dot for thousands, comma for decimals)
- **English (en-US)**: 4,273.00 € (comma for thousands, dot for decimals)

Supports 20+ currencies with correct symbol placement (before/after amount).

## 🗂️ Database Schema

### Main Tables

- **profiles** - User preferences (currency, language)
- **accounts** - Bank accounts, cash, credit cards
  - `initial_balance` - Starting balance
  - Current balance calculated as: `initial_balance + sum(transactions)`
- **categories** - Income/expense categories with multilingual support
  - `name` (text, nullable) - For user-created categories
  - `translation_key` (text, nullable) - For system categories (e.g., "category.groceries")
  - `icon` (text) - Lucide icon name
  - `color` (text) - Hex color code
  - Constraint: Either `name` OR `translation_key` must be set
- **budget_items** - Monthly bills and sinking funds
  - `name` - Item name (e.g., "Netflix", "Emergency Fund")
  - `amount` - Full amount (e.g., $1200 for annual)
  - `frequency` - monthly, quarterly, semi_annual, annual
  - `monthly_impact` - Normalized to monthly (auto-calculated)
  - `saved_balance` - Progress toward sinking fund goal (user-entered)
  - Linked to a category for organization and display
- **transactions** - Core transaction data
  - Amounts stored as `decimal(12,2)` for precision
  - Linked to accounts and categories

All tables have Row Level Security (RLS) enabled for user isolation.

## 🎯 Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the complete roadmap.

### Completed ✅
- Authentication system
- Internationalization (EN/DE)
- Dashboard with transaction list and split view
- Category management (CRUD)
- Account management (CRUD)
- Budget Items management (CRUD)
- Bills checklist (track monthly bill payments)
- Sinking funds progress tracking
- Safe-to-Spend calculation
- Multilingual system categories
- Currency formatting
- Keyboard shortcuts

### In Progress ⏳
- Transaction editing/deletion

### Planned 📋
- Date navigation (month/year picker)
- Charts and visualizations
- Search and filtering
- Data export (CSV, PDF)
- Bulk operations
- Dark mode
- Mobile optimization

## 📚 Documentation

- [Implementation Status](docs/implementation-status.md) - Detailed feature documentation
- [Roadmap](docs/roadmap.md) - Sprint plan and future features
- [Translation Implementation](docs/translation-implementation.md) - Multilingual system details
- [CLAUDE.md](CLAUDE.md) - Project rules and coding conventions

## 🧪 Architecture Decisions

### Why Server Components?
- Faster page loads (less JavaScript)
- Better SEO
- Direct database access without API routes

### Why Decimal for Currency?
JavaScript's `number` type uses float, which causes precision errors with currency. We use `decimal(12,2)` in the database and string handling in the frontend.

### Why next-intl v3?
- Server-side translation loading (faster)
- Built-in locale routing
- Type-safe translation keys
- Automatic locale detection

### Why System Categories with translation_key?
- Professional: System categories correctly translated
- Simple: Users create categories in their language
- Transparent: What you enter is what you see
- Performant: No API calls or complex translation logic

## 🤝 Contributing

Contributions are welcome! Please read the [contribution guidelines](CONTRIBUTING.md) first.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Hosted on [Vercel](https://vercel.com/)

---

**Version**: 1.3.0
**Last Updated**: January 14, 2026
**Status**: Active Development

**Latest Features (v1.3.0)**:
- ✅ Budget Items system (monthly bills + sinking funds)
- ✅ Bills checklist with payment tracking
- ✅ Sinking funds progress visualization
- ✅ Safe-to-Spend calculation (Total Cash - Pending Bills - Sinking Contributions)
- ✅ Full CRUD for budget items with frequency options
- ✅ Manual savings progress tracking for sinking funds

Built with ❤️ using modern web technologies.
