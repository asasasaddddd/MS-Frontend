import { request } from '@/api/request'
import type { PageResult } from '@/types/common'
import type { DeviceHistoryVO, DevicePageQuery, DeviceVO } from '@/types/device'

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

export function getDeviceHistory(deviceCode: string) {
  return request<DeviceHistoryVO[]>({
    url: `/device/${encodeURIComponent(deviceCode)}/history`,
    method: 'GET'
  })
}
