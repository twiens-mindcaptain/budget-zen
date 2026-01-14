'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
}

// Predefined color palette
const COLORS = [
  // Greens
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Teal', hex: '#14b8a6' },

  // Blues
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },

  // Purples
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Fuchsia', hex: '#d946ef' },
  { name: 'Pink', hex: '#ec4899' },

  // Reds/Oranges
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },

  // Yellows/Ambers
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Lime', hex: '#84cc16' },

  // Neutrals
  { name: 'Slate', hex: '#64748b' },
  { name: 'Gray', hex: '#6b7280' },
  { name: 'Zinc', hex: '#71717a' },
]

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(value)

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    onChange(color)
  }

  return (
    <div className="space-y-3">
      {/* Selected Color Display */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-lg border-2 border-zinc-200"
          style={{ backgroundColor: selectedColor }}
        />
        <div className="text-sm text-zinc-600">
          Selected: <span className="font-medium text-zinc-900">{selectedColor}</span>
        </div>
      </div>

      {/* Color Grid */}
      <div className="grid grid-cols-9 gap-2">
        {COLORS.map(({ name, hex }) => {
          const isSelected = selectedColor === hex

          return (
            <Button
              key={hex}
              type="button"
              variant="ghost"
              className="h-10 w-full p-0 relative hover:scale-110 transition-transform"
              onClick={() => handleColorSelect(hex)}
              title={name}
            >
              <div
                className={`w-full h-full rounded-md ${
                  isSelected ? 'ring-2 ring-zinc-900 ring-offset-2' : ''
                }`}
                style={{ backgroundColor: hex }}
              >
                {isSelected && (
                  <div className="w-full h-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-lg" />
                  </div>
                )}
              </div>
            </Button>
          )
        })}
      </div>

      {/* Custom Color Input */}
      <div className="pt-2">
        <label className="text-xs text-zinc-600 mb-1.5 block">
          Or enter custom color:
        </label>
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => handleColorSelect(e.target.value)}
          className="w-full h-10 rounded-md border border-zinc-200 cursor-pointer"
        />
      </div>
    </div>
  )
}
