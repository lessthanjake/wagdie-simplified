import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

type SupabaseClientOptions = {
  admin?: boolean
  clientOptions?: Parameters<typeof createClient>[2]
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    return JSON.parse(base64UrlDecode(parts[1]))
  } catch {
    return null
  }
}

export function createSupabaseClient(options: SupabaseClientOptions = {}) {
  const supabaseUrl =
    typeof window === 'undefined'
      ? process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      : process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  // Server-side: prefer runtime env vars over build-time NEXT_PUBLIC_ vars
  // Client-side: only NEXT_PUBLIC_ vars are available
  const anonKey =
    typeof window === 'undefined'
      ? process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    ''

  const useAdmin = options.admin && typeof window === 'undefined'
  const selectedKey = useAdmin ? serviceRoleKey : anonKey

  if (!supabaseUrl || !selectedKey) {
    const missing: string[] = []
    if (!supabaseUrl) {
      missing.push('Supabase URL (set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)')
    }
    if (!selectedKey) {
      missing.push(
        useAdmin
          ? 'Supabase service role key (set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY)'
          : 'Supabase anon key (set NEXT_PUBLIC_SUPABASE_ANON_KEY)'
      )
    }
    console.warn(`Supabase client not initialized: ${missing.join('; ')}`)
    return null
  }

  // Helpful guard: local demo keys will fail against remote Supabase.
  const payload = decodeJwtPayload(selectedKey)
  // Note: don't assume non-local URLs are hosted Supabase (cloudflared tunnels are common).
  // We keep this as a soft guard for the common hosted Supabase URL format.
  if (payload?.iss === 'supabase-demo' && /\.supabase\.co\b/.test(supabaseUrl)) {
    console.warn(
      `Supabase key issuer is "supabase-demo" but URL looks hosted (${supabaseUrl}). ` +
        'If this is a hosted Supabase project, update your anon/service role keys.'
    )
  }

  return createClient<Database>(supabaseUrl, selectedKey, options.clientOptions)
}

export function createSupabaseAdminClient() {
  return createSupabaseClient({
    admin: true,
    clientOptions: {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  })
}

// Browser-safe anon client
export const supabase = createSupabaseClient()
// Server-only admin client (requires service role key)
export const supabaseAdmin = createSupabaseAdminClient()

type SupabaseClientInstance = ReturnType<typeof createSupabaseClient>

let supabaseClient: SupabaseClientInstance | null = null
let supabaseAdminClient: SupabaseClientInstance | null = null

export function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient()
  }
  return supabaseClient
}

export function getSupabaseAdmin() {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createSupabaseAdminClient()
  }
  return supabaseAdminClient
}
