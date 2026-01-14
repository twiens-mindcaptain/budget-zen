'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { US, DE } from 'country-flag-icons/react/3x2'

const languages = [
  { code: 'en', name: 'English', Flag: US },
  { code: 'de', name: 'Deutsch', Flag: DE },
]

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0]
  const CurrentFlag = currentLanguage.Flag

  const switchLanguage = (newLocale: string) => {
    // Remove current locale from pathname
    const pathnameWithoutLocale = pathname.replace(`/${locale}`, '') || '/'

    // Navigate to new locale path (always includes locale prefix)
    router.push(`/${newLocale}${pathnameWithoutLocale}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0">
          <CurrentFlag className="h-5 w-5 rounded-sm" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => {
          const Flag = language.Flag
          return (
            <DropdownMenuItem
              key={language.code}
              onClick={() => switchLanguage(language.code)}
              className="cursor-pointer gap-2"
            >
              <Flag className="h-4 w-4 rounded-sm" />
              <span>{language.name}</span>
              {language.code === locale && (
                <span className="ml-auto text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
