import { request } from '@/api/request'
import type { PageResult } from '@/types/common'
import type { BusinessCaseDetailVO, DeviceBusinessEventVO, DevicePageQuery, DeviceVO } from '@/types/device'

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
