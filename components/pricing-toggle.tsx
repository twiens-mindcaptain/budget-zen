'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

interface PricingToggleProps {
  defaultPlan?: 'monthly' | 'yearly'
  onPlanChange?: (plan: 'monthly' | 'yearly') => void
}

export function PricingToggle({ defaultPlan = 'monthly', onPlanChange }: PricingToggleProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(defaultPlan)

  const handlePlanChange = (plan: 'monthly' | 'yearly') => {
    setSelectedPlan(plan)
    onPlanChange?.(plan)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Toggle Pills */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          onClick={() => handlePlanChange('monthly')}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            selectedPlan === 'monthly'
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => handlePlanChange('yearly')}
          className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
            selectedPlan === 'yearly'
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          Yearly
          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
            Save 17%
          </span>
        </button>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Monthly Plan */}
        <div
          onClick={() => handlePlanChange('monthly')}
          className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
            selectedPlan === 'monthly'
              ? 'border-zinc-900 bg-zinc-50'
              : 'border-zinc-200 bg-white hover:border-zinc-300'
          }`}
        >
          {selectedPlan === 'monthly' && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-zinc-900 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="text-sm text-zinc-600 mb-2">Monthly</div>
          <div className="text-3xl font-bold text-zinc-900 mb-1">€4.99</div>
          <div className="text-xs text-zinc-500">per month</div>
        </div>

        {/* Yearly Plan */}
        <div
          onClick={() => handlePlanChange('yearly')}
          className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
            selectedPlan === 'yearly'
              ? 'border-zinc-900 bg-zinc-50'
              : 'border-zinc-200 bg-white hover:border-zinc-300'
          }`}
        >
          {selectedPlan === 'yearly' && (
            <div className="absolute top-3 right-3 w-6 h-6 bg-zinc-900 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="text-sm text-zinc-600 mb-2">Yearly</div>
          <div className="text-3xl font-bold text-zinc-900 mb-1">€49.99</div>
          <div className="text-xs text-zinc-500">
            €4.17/month
            <span className="ml-1 text-green-600 font-medium">(save €9.89)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
