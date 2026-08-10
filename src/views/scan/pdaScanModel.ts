import type { UnifiedScanInboxItem } from '@/types/scan'
import { isUnifiedScanActionAllowed } from '@/views/scan/scanModel'

export type PdaScanMatch =
  | { kind: 'match'; raw: string; code: string; row: UnifiedScanInboxItem }
  | { kind: 'none'; raw: string; code: string }
  | { kind: 'ambiguous'; raw: string; code: string; rows: UnifiedScanInboxItem[] }

function rowCodes(row: UnifiedScanInboxItem) {
  return [row.scanCode, row.deviceCode, row.taskNo, row.orderNo]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

export function matchPdaScan(raw: string, rows: readonly UnifiedScanInboxItem[]): PdaScanMatch {
  const code = raw.trim()
  if (!code) return { kind: 'none', raw, code }

  const matches = rows.filter((row) => (
    row.scanned !== true
    && isUnifiedScanActionAllowed(row)
    && rowCodes(row).includes(code)
  ))
  if (matches.length === 1) return { kind: 'match', raw, code, row: matches[0]! }
  if (matches.length > 1) return { kind: 'ambiguous', raw, code, rows: matches }
  return { kind: 'none', raw, code }
}
