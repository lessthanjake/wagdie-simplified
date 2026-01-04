export type TokenIdRange = {
  min?: number
  max?: number
}

export type LimitOptions = {
  defaultLimit?: number
  maxLimit?: number
  minLimit?: number
}

export function parseTokenIdParam(value: string, range: TokenIdRange = {}): number | null {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return null
  if (range.min !== undefined && parsed < range.min) return null
  if (range.max !== undefined && parsed > range.max) return null
  return parsed
}

export function parseLimitParam(value: string | null, options: LimitOptions = {}): number {
  const defaultLimit = options.defaultLimit ?? 50
  const maxLimit = options.maxLimit ?? 100
  const minLimit = options.minLimit ?? 1

  if (!value) return defaultLimit

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return defaultLimit

  return Math.min(Math.max(parsed, minLimit), maxLimit)
}

export function parseOffsetParam(value: string | null, defaultOffset = 0): number {
  if (!value) return defaultOffset

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0) return defaultOffset

  return parsed
}

export function parseLimitOffsetParams(
  searchParams: URLSearchParams,
  options: LimitOptions & { defaultOffset?: number } = {}
): { limit: number; offset: number } {
  return {
    limit: parseLimitParam(searchParams.get('limit'), options),
    offset: parseOffsetParam(searchParams.get('offset'), options.defaultOffset ?? 0),
  }
}

export function parseCsvNumberList(value: string, options: { min?: number } = {}): number[] {
  const min = options.min ?? Number.NEGATIVE_INFINITY

  return value
    .split(',')
    .map(item => Number.parseInt(item.trim(), 10))
    .filter(item => !Number.isNaN(item) && item >= min)
}
