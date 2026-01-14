'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type InsertAccountInput } from '@/lib/types'
import { createAccount, updateAccount } from '@/app/actions/accounts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, Wallet, CreditCard, Landmark, PiggyBank } from 'lucide-react'
import { toast } from 'sonner'

interface Account {
  id: string
  name: string
  type: 'cash' | 'bank' | 'credit' | 'savings'
  initial_balance: string
  current_balance?: string
}

interface AccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account
  onSuccess: (account: Account & { current_balance: string }) => void
  currency: string
}

const accountTypeIcons = {
  cash: Wallet,
  bank: Landmark,
  credit: CreditCard,
  savings: PiggyBank,
}

// Form schema without transform for client-side validation
const formSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['cash', 'bank', 'credit', 'savings']),
  initial_balance: z.string(),
})

type FormData = z.infer<typeof formSchema>

export function AccountDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
  currency,
}: AccountDialogProps) {
  const t = useTranslations()
  const locale = useLocale()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!account

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: account?.name || '',
      type: account?.type || 'bank',
      initial_balance: account?.initial_balance || '0.00',
    },
  })

  // Reset form when account changes
  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        type: account.type,
        initial_balance: account.initial_balance,
      })
    } else {
      form.reset({
        name: '',
        type: 'bank',
        initial_balance: '0.00',
      })
    }
  }, [account, form])

  async function onSubmit(data: FormData) {
    setIsSubmitting(true)

    try {
      const result = isEditing
        ? await updateAccount(account.id, data)
        : await createAccount(data)

      if (result.success) {
        toast.success(
          isEditing
            ? t('settings.accounts.updateSuccess')
            : t('settings.accounts.createSuccess')
        )
        // Pass the account with current_balance (use existing or initial_balance for new accounts)
        onSuccess({
          ...result.data,
          current_balance: account?.current_balance || result.data.initial_balance,
        })
        form.reset()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('settings.accounts.editAccount')
              : t('settings.accounts.createAccount')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('settings.accounts.editDescription')
              : t('settings.accounts.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Account Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.accounts.name')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('settings.accounts.namePlaceholder')}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.accounts.type')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-3"
                    >
                      {(['bank', 'cash', 'credit', 'savings'] as const).map((type) => {
                        const Icon = accountTypeIcons[type]
                        return (
                          <label
                            key={type}
                            htmlFor={type}
                            className={`flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                              field.value === type
                                ? 'border-zinc-900 bg-zinc-50'
                                : 'border-zinc-200 hover:border-zinc-300'
                            }`}
                          >
                            <RadioGroupItem value={type} id={type} className="sr-only" />
                            <Icon className="w-5 h-5 text-zinc-600" />
                            <span className="text-sm font-medium">
                              {t(`settings.accounts.types.${type}`)}
                            </span>
                          </label>
                        )
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Initial Balance */}
            <FormField
              control={form.control}
              name="initial_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.accounts.initialBalance')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pr-12"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                        {currency}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('transaction.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('settings.accounts.save') : t('settings.accounts.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
