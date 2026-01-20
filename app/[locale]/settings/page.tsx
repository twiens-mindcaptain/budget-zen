import { SignedIn } from '@clerk/nextjs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { SettingsTabs } from '@/components/settings/settings-tabs'
import { getUserCategories } from '@/app/actions/categories'

export default async function SettingsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const t = await getTranslations()

  // Fetch categories server-side
  const categories = await getUserCategories()

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

          <SettingsTabs categories={categories} />
        </div>
      </SettingsLayout>
    </SignedIn>
  )
}
