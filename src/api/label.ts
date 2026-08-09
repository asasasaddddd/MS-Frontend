import { httpClient, request } from '@/api/request'
import { useSessionStore } from '@/stores/session'
import type { LabelPrintRecord } from '@/types/label'
import type { EntityId } from '@/types/common'

function labelDownloadHeaders() {
  const session = useSessionStore()
  const user = session.user
  const headers: Record<string, string> = {}

  if (session.token) {
    headers.Authorization = `Bearer ${session.token}`
  }
  if (user) {
    headers['X-User-Id'] = user.employeeId
    headers['X-User-Name'] = encodeURIComponent(user.employeeName)
    headers['X-User-Role'] = user.roleCode
    headers['X-User-Dept-Id'] = user.deptId || ''
    headers['X-User-Dept-Name'] = encodeURIComponent(user.deptName || '')
  }
  return headers
}

export function listUnprintedLabels(sourceType?: string, signal?: AbortSignal) {
  return request<LabelPrintRecord[]>({
    url: '/label/unprintedList',
    method: 'GET',
    params: sourceType ? { sourceType } : undefined,
    signal
  })
}

export function listPrintedLabels(sourceType?: string, signal?: AbortSignal) {
  return request<LabelPrintRecord[]>({
    url: '/label/printedList',
    method: 'GET',
    params: sourceType ? { sourceType } : undefined,
    signal
  })
}

export function listSupplierFirstCheckUnprintedLabels(signal?: AbortSignal) {
  return request<LabelPrintRecord[]>({
    url: '/label/supplier/firstcheck/unprinted',
    method: 'GET',
    signal
  })
}

export function listSupplierFirstCheckPrintedLabels(signal?: AbortSignal) {
  return request<LabelPrintRecord[]>({
    url: '/label/supplier/firstcheck/printed',
    method: 'GET',
    signal
  })
}

export function printLabelRecord(recordId: EntityId) {
  return request<void>({
    url: `/label/print/${recordId}`,
    method: 'POST'
  })
}

export async function downloadLabelPdf(recordId: EntityId) {
  const response = await httpClient.get<Blob>(`/label/pdf/${encodeURIComponent(String(recordId))}`, {
    responseType: 'blob',
    headers: labelDownloadHeaders()
  })
  return response.data
}
