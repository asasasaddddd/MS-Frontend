import type { UnifiedScanInboxItem } from '@/types/scan'

export interface ScanRouteQuery {
  module?: string
  businessType?: string
  action?: string
  taskId?: string
  orderId?: string
  view?: string
}

export function matchesScanRouteList(
  row: Pick<UnifiedScanInboxItem, 'businessType' | 'scanAction'>,
  query: ScanRouteQuery
) {
  const module = query.module || query.businessType
  if (module && row.businessType !== module) return false
  if (query.action && row.scanAction !== query.action) return false
  return true
}

export function shouldFocusScanRoute(query: ScanRouteQuery) {
  if (query.view === 'list') return false
  return Boolean(query.taskId || query.orderId)
}
