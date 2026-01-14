import { ClerkProvider } from '@clerk/nextjs'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Inter } from 'next/font/google'
import { routing } from '@/i18n/routing'
import { Toaster } from 'sonner'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return {
    title: 'Budget Zen - Expense Tracker',
    description: locale === 'de'
      ? 'Minimalistischer, tastaturgesteuerter Ausgabentracker'
      : 'Minimalist, keyboard-first expense tracker',
  }
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Validate locale
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  // Fetch messages for the locale
  const messages = await getMessages()

  return (
    <ClerkProvider>
      <html lang={locale}>
        <body className={inter.className}>
          <NextIntlClientProvider messages={messages}>
            {children}
            <Toaster position="top-center" richColors />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
