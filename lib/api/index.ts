/**
 * API Layer
 * Exports API client and endpoint definitions
 */

// Client-side utilities
export * from './client'
export * from './endpoints'

// Note: Server-only utilities (responses, auth, errors) should be imported
// directly from their files in API routes, not from this index.
// e.g. import { requireAdmin } from '@/lib/api/auth'
