'use client'

import { useState } from 'react'
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
      <ScrollArea className="h-[280px] w-full rounded-lg border border-zinc-200 p-3">
        <div className="grid grid-cols-6 gap-2">
          {COMMON_ICONS.map((iconName) => {
            const IconComponent = getIconComponent(iconName)
            const isSelected = selectedIcon === iconName

            return (
              <Button
                key={iconName}
                type="button"
                variant="ghost"
                className={`h-12 w-full p-0 relative hover:bg-zinc-100 ${
                  isSelected ? 'bg-zinc-100 ring-2 ring-zinc-900' : ''
                }`}
                onClick={() => handleIconSelect(iconName)}
                title={iconName}
              >
                <IconComponent className="w-5 h-5 text-zinc-700" />
                {isSelected && (
                  <div className="absolute top-0.5 right-0.5">
                    <Check className="w-3 h-3 text-zinc-900" />
                  </div>
                )}
              </Button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
