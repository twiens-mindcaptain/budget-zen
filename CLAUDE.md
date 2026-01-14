# CLAUDE.md - Project Context & Rules

## Project Overview

"Budget-Zen" is a minimalist, keyboard-first expense tracker.
Goal: Speed, privacy, and "Excel-soul in an App-body".
Stack: Next.js (App Router), TypeScript, Tailwind CSS, Supabase (DB), Clerk (Auth).

## Tech Stack & Libraries (Strict)

- **Framework:** Next.js 14+ (App Router). Use Server Components by default.
- **Styling:** Tailwind CSS. Use `shadcn/ui` for ALL interactive components (buttons, dialogs, inputs).
- **Icons:** `lucide-react` only.
- **Database:** Supabase (PostgreSQL). Use standard SQL queries or Supabase JS Client.
- **Auth:** Clerk. Use `<SignedIn>`, `<SignedOut>`, and `auth()` helper.
- **Validation:** Zod. ALL form submissions must be validated with Zod schemas.
- **Date Handling:** `date-fns`.
- **State Management:** URL search params for global state. `useOptimistic` for UI updates. No Redux/Zustand.

## Coding Rules

1. **Server Actions First:** Do NOT use API Routes (`/pages/api`) or `useEffect` for data fetching. Use Server Actions (`'use server'`) for all mutations (CREATE, UPDATE, DELETE).
2. **Type Safety:** No `any`. Generate types from DB schema if possible.
3. **Optimistic UI:** When creating a transaction, update the UI _immediately_ using `useOptimistic` before the server responds.
4. **Keyboard First:** All main actions must be accessible via shortcuts. The "Add Transaction" modal must auto-focus the amount field.
5. **Decimal Precision:** NEVER use `float` or `number` for currency. Treat monetary values as Strings or Decimals in backend, convert carefully in frontend.

## Architecture Patterns

- **Directory Structure:** `app/(dashboard)/...` for protected routes. `components/ui` for shadcn.
- **Data Fetching:** Fetch data directly in Server Components (`await db.query...`). Pass data to Client Components as props.
- **Forms:** Use `react-hook-form` combined with `zod`.

## Common Commands

- Generate shadcn component: `npx shadcn@latest add [component-name]`
- Database push: `npx supabase db push`
