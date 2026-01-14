import createMiddleware from 'next-intl/middleware'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const isPublicRoute = createRouteMatcher([
  '/en',
  '/de',
  '/en/sign-in(.*)',
  '/en/sign-up(.*)',
  '/de/sign-in(.*)',
  '/de/sign-up(.*)'
])

export default clerkMiddleware((auth, request: NextRequest) => {
  // Check if the route should be protected
  if (!isPublicRoute(request)) {
    auth.protect()
  }

  // Apply intl middleware for locale routing
  return intlMiddleware(request)
})

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)']
}
