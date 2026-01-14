'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageSwitcher } from '@/components/language-switcher'
import { Home, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  const pathname = usePathname()

  // Extract locale from pathname
  const locale = pathname.split('/')[1]

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">
            {t('app.name')}
          </h1>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}`}
              className="text-zinc-500 hover:text-zinc-900 transition-colors"
              title="Back to Dashboard"
            >
              <Home className="w-5 h-5" />
            </Link>
            <div className="text-zinc-300 cursor-not-allowed" title="Settings (current page)">
              <Settings className="w-5 h-5" />
            </div>
            <LanguageSwitcher />
            <UserButton afterSignOutUrl={`/${locale}`} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
