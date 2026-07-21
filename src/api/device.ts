import { request } from '@/api/request'
import type { PageResult } from '@/types/common'
import type {
  BusinessCaseDetailVO,
  DeviceBusinessEventVO,
  DeviceLedgerUpdateRequest,
  DevicePageQuery,
  DeviceStorageLocationUpdateRequest,
  DeviceVO
} from '@/types/device'

export function listDevicePage(query: DevicePageQuery = {}) {
  const { current = 1, size = 10, ...filters } = query
  return request<PageResult<DeviceVO>>({
    url: '/device/page',
    method: 'GET',
    params: {
      current,
      size,
      ...filters
    }
  })
}

export function getDeviceByCode(deviceCode: string) {
  return request<DeviceVO>({
    url: `/device/${encodeURIComponent(deviceCode)}`,
    method: 'GET'
  })
}

export function updateDeviceLedger(deviceId: string | number, data: DeviceLedgerUpdateRequest) {
  return request<void>({
    url: `/device/ledger/${encodeURIComponent(String(deviceId))}`,
    method: 'PUT',
    data
  })
}

export function updateDeviceStorageLocation(
  deviceId: string | number,
  data: DeviceStorageLocationUpdateRequest
) {
  return request<void>({
    url: `/device/ledger/${encodeURIComponent(String(deviceId))}/storage-location`,
    method: 'PUT',
    data
  })
}

export function listDeviceBusinessEvents(deviceCode: string) {
  return request<DeviceBusinessEventVO[]>({
    url: `/devices/${encodeURIComponent(deviceCode)}/business-events`,
    method: 'GET'
  })
}

export function getBusinessCaseDetail(caseId: string | number) {
  return request<BusinessCaseDetailVO>({
    url: `/business-cases/${encodeURIComponent(String(caseId))}`,
    method: 'GET'
  })
}
