import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function PaymentSuccessPage() {
  const { userId } = await auth()
  const t = await getTranslations()
  const locale = await getLocale()

  if (!userId) {
    redirect(`/${locale}`)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-md w-full">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">
          {t('payment.success.title')}
        </h1>
        <p className="text-lg text-zinc-600 mb-8">
          {t('payment.success.subtitle')}
        </p>

        {/* CTA */}
        <Link href={`/${locale}`}>
          <Button size="lg" className="w-full text-lg py-6 h-auto">
            {t('payment.success.goToDashboard')}
          </Button>
        </Link>
      </div>
    </div>
  )
}
