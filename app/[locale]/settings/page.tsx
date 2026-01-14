import { SignedIn } from '@clerk/nextjs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { Suspense } from 'react'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { CategoriesTab } from '@/components/settings/categories-tab'
import { getUserCategories } from '@/app/actions/categories'
import { Loader2 } from 'lucide-react'

// Loading component for categories
function CategoriesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    </div>
  )
}

// Async component for categories
async function CategoriesContent() {
  const categories = await getUserCategories()
  return <CategoriesTab initialCategories={categories} />
}

export default async function SettingsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const t = await getTranslations()

  return (
    <SignedIn>
      <SettingsLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {t('settings.title')}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {t('settings.description')}
            </p>
          </div>

          <Suspense fallback={<CategoriesLoading />}>
            <CategoriesContent />
          </Suspense>
        </div>
      </SettingsLayout>
    </SignedIn>
  )
}
