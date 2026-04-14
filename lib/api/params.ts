export type TokenIdRange = {
  min?: number
  max?: number
}

export type LimitOptions = {
  defaultLimit?: number
  maxLimit?: number
  minLimit?: number
}

export type PositiveIntParamOptions = {
  defaultValue?: number
  min?: number
  max?: number
}

export type CsvPositiveIntListOptions = {
  maxItems?: number
}

export function parseTokenIdParam(value: string, range: TokenIdRange = {}): number | null {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return null
  if (range.min !== undefined && parsed < range.min) return null
  if (range.max !== undefined && parsed > range.max) return null
  return parsed
}

export function parsePositiveIntParam(
  value: string | null,
  options: PositiveIntParamOptions = {}
): number | null {
  const raw = value?.trim()
  if (!raw) return options.defaultValue ?? null

  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) return null

  const min = options.min ?? 1
  if (parsed < min) return null
  if (options.max !== undefined && parsed > options.max) return null

  return parsed
}

export function parseEnumParam<T extends string>(
  value: string | null,
  allowed: readonly T[],
  defaultValue: T
): T | null {
  if (value === null || value === '') return defaultValue

  return (allowed as readonly string[]).includes(value) ? (value as T) : null
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

export function parseCsvPositiveIntList(
  value: string | null,
  options: CsvPositiveIntListOptions = {}
): { values: number[]; error?: string } {
  const values = value ? parseCsvNumberList(value, { min: 1 }) : []

  if (options.maxItems !== undefined && values.length > options.maxItems) {
    return {
      values,
      error: `Maximum ${options.maxItems} token IDs per request`,
    }
  }

  return { values }
}
