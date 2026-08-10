const scanCodeKeys = ['deviceCode', 'scanCode', 'temporaryCode', 'taskNo', 'orderNo'] as const

export interface ParsedScanContent {
  raw: string
  normalizedCode: string
}

function scalarCode(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim()
  }
  return ''
}

function knownCode(source: Record<string, unknown>) {
  for (const key of scanCodeKeys) {
    const code = scalarCode(source[key])
    if (code) return code
  }
  return ''
}

function jsonCode(value: string) {
  if (!value.startsWith('{')) return ''
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return knownCode(parsed as Record<string, unknown>)
    }
  } catch {
    return ''
  }
  return ''
}

function urlCode(value: string) {
  if (!/^https?:\/\//i.test(value)) return ''
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    const queryValues = Object.fromEntries(
      scanCodeKeys.map((key) => [key, parsed.searchParams.get(key)])
    )
    const queryCode = knownCode(queryValues)
    if (queryCode) return queryCode
    const pathSegments = parsed.pathname.split('/').filter(Boolean)
    const lastSegment = pathSegments.at(-1)
    if (!lastSegment) return ''
    try {
      return decodeURIComponent(lastSegment).trim()
    } catch {
      return lastSegment.trim()
    }
  } catch {
    return ''
  }
}

export function parseScanContent(raw: string): ParsedScanContent {
  const trimmed = raw.trim()
  if (!trimmed) return { raw, normalizedCode: '' }
  return {
    raw,
    normalizedCode: jsonCode(trimmed) || urlCode(trimmed) || trimmed
  }
}
