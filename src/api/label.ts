import { httpClient, request } from '@/api/request'
import { useSessionStore } from '@/stores/session'
import type { LabelPrintRecord } from '@/types/label'

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

export function listSupplierFirstCheckUnprintedLabels() {
  return request<LabelPrintRecord[]>({
    url: '/label/supplier/firstcheck/unprinted',
    method: 'GET'
  })
}

export function listSupplierFirstCheckPrintedLabels() {
  return request<LabelPrintRecord[]>({
    url: '/label/supplier/firstcheck/printed',
    method: 'GET'
  })
}

export function printLabelRecord(recordId: string | number) {
  return request<void>({
    url: `/label/print/${recordId}`,
    method: 'POST'
  })
}

export async function downloadLabelPdf(recordId: string | number) {
  const response = await httpClient.get<Blob>(`/label/pdf/${encodeURIComponent(String(recordId))}`, {
    responseType: 'blob',
    headers: labelDownloadHeaders()
  })
  return response.data
}
