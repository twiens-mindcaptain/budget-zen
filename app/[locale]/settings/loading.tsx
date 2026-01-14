import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header Skeleton */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="h-6 w-32 bg-zinc-200 rounded animate-pulse" />
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-zinc-200 rounded animate-pulse" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-100 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-zinc-200 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-zinc-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
