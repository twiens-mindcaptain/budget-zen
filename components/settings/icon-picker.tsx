'use client'

import { useState, useEffect } from 'react'
import { COMMON_ICONS, getIconComponent } from '@/lib/icon-mapper'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check } from 'lucide-react'

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [selectedIcon, setSelectedIcon] = useState(value)

  // Sync internal state when value prop changes (e.g., from smart suggestions)
  useEffect(() => {
    setSelectedIcon(value)
  }, [value])

  const handleIconSelect = (iconName: string) => {
    setSelectedIcon(iconName)
    onChange(iconName)
  }

  const SelectedIcon = getIconComponent(selectedIcon)

  return (
    <div className="space-y-3">
      {/* Selected Icon Display */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center">
          <SelectedIcon className="w-6 h-6 text-zinc-700" />
        </div>
        <div className="text-sm text-zinc-600">
          Selected: <span className="font-medium text-zinc-900">{selectedIcon}</span>
        </div>
      </div>

      {/* Icon Grid */}
      <ScrollArea className="h-[200px] w-full rounded-lg border border-zinc-200">
        <div className="flex flex-wrap gap-1 p-2">
          {COMMON_ICONS.map((iconName) => {
            const IconComponent = getIconComponent(iconName)
            const isSelected = selectedIcon === iconName

            return (
              <button
                key={iconName}
                type="button"
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors hover:bg-zinc-100 ${
                  isSelected ? 'bg-emerald-100 ring-2 ring-emerald-500' : ''
                }`}
                onClick={() => handleIconSelect(iconName)}
                title={iconName}
              >
                <IconComponent className={`w-5 h-5 ${isSelected ? 'text-emerald-700' : 'text-zinc-700'}`} />
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
