// Shared Etherscan Rate Limiter
// Coordinates API calls across multiple indexer processes to stay under rate limits

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

// Etherscan free tier: 3 calls/sec
// We use 2 calls/sec globally to leave headroom and handle timing jitter
const GLOBAL_RATE_LIMIT_MS = 500 // 2 calls per second max
const LOCK_FILE = process.env.RATE_LIMIT_LOCK_FILE || '/app/data/etherscan-rate-limit.lock'
const MAX_RETRIES = 5
const BASE_RETRY_DELAY_MS = 1000

interface LockState {
  lastCallTime: number
  lockHolder?: string
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function readLockState(): LockState {
  try {
    if (existsSync(LOCK_FILE)) {
      const content = readFileSync(LOCK_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // File doesn't exist or is corrupted, start fresh
  }
  return { lastCallTime: 0 }
}

function writeLockState(state: LockState): void {
  ensureDir(LOCK_FILE)
  writeFileSync(LOCK_FILE, JSON.stringify(state))
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface RateLimitedFetchResult<T> {
  data: T
  rateLimited: boolean
  retryCount: number
}

/**
 * Acquire a rate-limited slot for an Etherscan API call.
 * This coordinates across multiple processes using a shared lock file.
 */
export async function acquireRateSlot(callerId: string): Promise<void> {
  const now = Date.now()
  const state = readLockState()

  const timeSinceLastCall = now - state.lastCallTime

  if (timeSinceLastCall < GLOBAL_RATE_LIMIT_MS) {
    const waitTime = GLOBAL_RATE_LIMIT_MS - timeSinceLastCall
    await delay(waitTime)
  }

  // Update lock state
  writeLockState({
    lastCallTime: Date.now(),
    lockHolder: callerId,
  })
}

/**
 * Execute a fetch with rate limiting and automatic retry on rate limit errors.
 * Handles Etherscan's "Max calls per sec rate limit reached" error.
 */
export async function rateLimitedFetch<T>(
  callerId: string,
  fetchFn: () => Promise<T>,
  isRateLimitError: (error: unknown) => boolean = defaultIsRateLimitError
): Promise<RateLimitedFetchResult<T>> {
  let retryCount = 0

  while (retryCount < MAX_RETRIES) {
    await acquireRateSlot(callerId)

    try {
      const data = await fetchFn()
      return { data, rateLimited: false, retryCount }
    } catch (error) {
      if (isRateLimitError(error)) {
        retryCount++
        const backoffDelay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount - 1)
        console.log(`[${callerId}] Rate limited, backing off for ${backoffDelay}ms (attempt ${retryCount}/${MAX_RETRIES})`)
        await delay(backoffDelay)
        continue
      }
      throw error
    }
  }

  throw new Error(`[${callerId}] Max retries exceeded due to rate limiting`)
}

function defaultIsRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('rate limit') ||
           error.message.includes('Max calls per sec')
  }
  return false
}

/**
 * Check if an Etherscan API response indicates a rate limit error.
 */
export function isEtherscanRateLimitResponse(response: { status: string; message: string; result: unknown }): boolean {
  if (response.status !== '1' && typeof response.result === 'string') {
    return response.result.includes('rate limit') ||
           response.result.includes('Max calls per sec')
  }
  return false
}

/**
 * Calculate startup delay for an indexer based on its name.
 * This staggers startup to prevent all indexers hitting the API at once.
 */
export function getStartupDelay(indexerName: string): number {
  const delays: Record<string, number> = {
    'transfer-indexer': 0,
    'staking-indexer': 5000,
    'infection-indexer': 10000,
    'searing-indexer': 15000,
    'concord-indexer': 20000,
  }
  return delays[indexerName] ?? 0
}
