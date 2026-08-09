import type { EntityId } from '@/types/common'

export interface CostRecordQueryRequest {
  sourceType?: string
  sourceId?: EntityId
  sourceItemId?: EntityId
  costStatus?: string
  deviceCode?: string
  deptId?: string
  startDate?: string
  endDate?: string
}

export interface CostSummaryQueryRequest {
  sourceType?: string
  deptId?: string
  costStatus?: string
  startDate?: string
  endDate?: string
}

export interface CostManualCreateRequest {
  deviceCode?: string
  deviceName?: string
  modelSpec?: string
  deptId?: string
  deptName?: string
  costType?: string
  quantity?: number | string
  unitPrice?: number | string
  amount: number | string
  currency?: string
  occurredAt?: string
  remark?: string
}

export interface CostRecordUpdateRequest {
  recordId: EntityId
  amount?: number | string
  quantity?: number | string
  unitPrice?: number | string
  currency?: string
  occurredAt?: string
  remark?: string
}

export interface CostCancelRequest {
  recordId: EntityId
  reason: string
}

export interface CostRecordVO {
  id: EntityId
  costNo?: string
  sourceType?: string
  sourceName?: string
  sourceId?: EntityId
  sourceItemId?: EntityId
  originNode?: string
  deviceCode?: string
  deviceName?: string
  modelSpec?: string
  deptName?: string
  costType?: string
  quantity?: number | string
  unitPrice?: number | string
  amount?: number | string
  currency?: string
  costStatus?: string
  occurredAt?: string
  cancelReason?: string
  remark?: string
}

export interface CostStatistics {
  totalAmount: number
  totalCount: number
  avgAmount: number
  byType: Array<{
    costType: string
    amount: number
    count: number
  }>
}

export interface CostSummaryItemVO {
  code?: string
  name?: string
  count?: number
  amount?: number | string
}

export interface CostSummaryVO {
  totalCount?: number
  totalAmount?: number | string
  pendingAmount?: number | string
  cancelledAmount?: number | string
  bySource?: CostSummaryItemVO[]
  byCostType?: CostSummaryItemVO[]
  byDept?: CostSummaryItemVO[]
}
