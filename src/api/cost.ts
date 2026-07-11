import { request } from '@/api/request'
import { buildCostCancelRequest, buildCostManualRequest, buildCostUpdateRequest, costEndpoint } from '@/api/costContract'
import type {
  CostCancelRequest,
  CostManualCreateRequest,
  CostRecordQueryRequest,
  CostRecordUpdateRequest,
  CostRecordVO,
  CostSummaryQueryRequest,
  CostSummaryVO,
  CostStatistics
} from '@/types/cost'

export function listCostRecords(params: CostRecordQueryRequest = {}) {
  return request<CostRecordVO[]>({
    url: costEndpoint('records'),
    method: 'GET',
    params
  })
}

export const listCosts = listCostRecords

export function getCostSummary(params: CostSummaryQueryRequest = {}) {
  return request<CostSummaryVO>({
    url: costEndpoint('summary'),
    method: 'GET',
    params
  })
}

export function createManualCostRecord(data: CostManualCreateRequest) {
  return request<string | number>({
    url: costEndpoint('manual'),
    method: 'POST',
    data: buildCostManualRequest(data)
  })
}

export function updateCostRecord(data: CostRecordUpdateRequest) {
  return request<void>({
    url: costEndpoint('update'),
    method: 'POST',
    data: buildCostUpdateRequest(data)
  })
}

export const updateCost = updateCostRecord

export function cancelCostRecord(data: CostCancelRequest) {
  return request<void>({
    url: costEndpoint('cancel'),
    method: 'POST',
    data: buildCostCancelRequest(data)
  })
}

export function cancelCost(recordId: string | number, reason: string) {
  return cancelCostRecord({ recordId, reason })
}

export function getCostStatistics(records: CostRecordVO[]): CostStatistics {
  const totalAmount = records.reduce((sum, record) => sum + Number(record.amount || 0), 0)
  const totalCount = records.length
  const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0
  const byTypeMap = new Map<string, { amount: number; count: number }>()

  records.forEach((record) => {
    const costType = record.costType || '-'
    const current = byTypeMap.get(costType) || { amount: 0, count: 0 }
    current.amount += Number(record.amount || 0)
    current.count += 1
    byTypeMap.set(costType, current)
  })

  return {
    totalAmount,
    totalCount,
    avgAmount,
    byType: Array.from(byTypeMap.entries()).map(([costType, item]) => ({
      costType,
      amount: item.amount,
      count: item.count
    }))
  }
}
