import { request } from '@/api/request'
import type { LabelPrintRecord } from '@/types/label'

export function listUnprintedLabels(sourceType?: string) {
  return request<LabelPrintRecord[]>({
    url: '/label/unprintedList',
    method: 'GET',
    params: sourceType ? { sourceType } : undefined
  })
}

export function listPrintedLabels(sourceType?: string) {
  return request<LabelPrintRecord[]>({
    url: '/label/printedList',
    method: 'GET',
    params: sourceType ? { sourceType } : undefined
  })
}

export function printLabelRecord(recordId: string | number) {
  return request<void>({
    url: `/label/print/${recordId}`,
    method: 'POST'
  })
}
