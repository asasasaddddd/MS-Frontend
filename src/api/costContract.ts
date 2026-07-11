import type { CostCancelRequest, CostManualCreateRequest, CostRecordUpdateRequest } from '@/types/cost'

const costEndpoints = {
  records: '/cost/records',
  summary: '/cost/summary',
  manual: '/cost/manual',
  update: '/cost/update',
  cancel: '/cost/cancel'
} as const

export type CostEndpointKey = keyof typeof costEndpoints

export function costEndpoint(key: CostEndpointKey) {
  return costEndpoints[key]
}

export function buildCostUpdateRequest(input: CostRecordUpdateRequest) {
  return {
    recordId: input.recordId,
    amount: input.amount,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    currency: input.currency,
    occurredAt: input.occurredAt,
    remark: input.remark
  }
}

export function buildCostCancelRequest(input: CostCancelRequest) {
  return {
    recordId: input.recordId,
    reason: input.reason
  }
}

export function buildCostManualRequest(input: CostManualCreateRequest) {
  return {
    deviceCode: input.deviceCode,
    deviceName: input.deviceName,
    modelSpec: input.modelSpec,
    deptId: input.deptId,
    deptName: input.deptName,
    costType: input.costType || 'other',
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    amount: input.amount,
    currency: input.currency || 'CNY',
    occurredAt: input.occurredAt,
    remark: input.remark
  }
}
