import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Icon component - minimalist wallet icon for Budget Zen
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: '#0f172a', // slate-900
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f8fafc', // slate-50
          borderRadius: '6px',
          fontWeight: 700,
        }}
      >
        ¥
      </div>
    ),
    {
      ...size,
    }
  )
}
