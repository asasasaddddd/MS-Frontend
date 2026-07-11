import type { DeviceHistoryVO, DeviceVO } from '@/types/device'

export type LedgerTagColor = 'red' | 'orange' | 'green' | 'blue' | 'default'

export interface DeviceLedgerRow {
  key: string
  source: DeviceVO
  deviceCode: string
  deviceName: string
  modelSpec: string
  factoryCode: string
  deptName: string
  manufacturer: string
  categoryText: string
  categoryColor: LedgerTagColor
  statusText: string
  statusColor: LedgerTagColor
  mandatoryText: string
  methodText: string
  cycleText: string
  lastVerificationDate: string
  nextVerificationDate: string
  overdue: boolean
}

export interface DeviceHistoryRow {
  key: string
  typeText: string
  sourceNo: string
  dateText: string
  color: LedgerTagColor
  title?: string
  summary?: string
  operator?: string
  amount?: string
}

export function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export function formatDate(value?: string) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 10)
}

export function formatChineseDate(value?: string) {
  const date = formatDate(value)
  if (date === '-') return '-'
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return date
  return `${year}年${month}月${day}日`
}

export function deviceCategoryText(value?: string) {
  if (!value) return '-'
  if (value.includes('A')) return 'A类'
  if (value.includes('B')) return 'B类'
  if (value.includes('C')) return 'C类'
  return value
}

export function deviceCategoryColor(value?: string): LedgerTagColor {
  const text = deviceCategoryText(value)
  if (text === 'A类') return 'red'
  if (text === 'B类') return 'orange'
  if (text === 'C类') return 'blue'
  return 'default'
}

export function deviceStatusText(value?: string) {
  const map: Record<string, string> = {
    in_use: '在用',
    sealed: '封存',
    scrapped: '已报废',
    repairing: '维修中',
    delayed: '缓检中',
    pending_enable: '待启用',
    pending_scrap: '待报废',
    disabled: '停用'
  }
  return value ? map[value] || value : '-'
}

const deviceStatusAliases: Record<string, string[]> = {
  pending_verification: ['pending_verification', '\u5f85\u68c0\u5b9a'],
  in_use: ['in_use', '\u5728\u7528'],
  sealed: ['sealed', '\u5c01\u5b58'],
  pending_enable: ['pending_enable', '\u5f85\u542f\u7528'],
  stopped: ['stopped', '\u505c\u7528'],
  repair: ['repair', 'repairing', '\u7ef4\u4fee\u4e2d'],
  scrapped: ['scrapped', '\u5df2\u62a5\u5e9f', '\u62a5\u5e9f'],
  delayed: ['delayed', '\u7f13\u68c0\u4e2d', '\u7f13\u68c0']
}

export function normalizeDeviceStatus(value?: string) {
  const text = String(value || '').trim()
  if (!text) return ''
  const lowerText = text.toLowerCase()
  for (const [code, aliases] of Object.entries(deviceStatusAliases)) {
    if (aliases.some((alias) => alias.toLowerCase() === lowerText || alias === text)) {
      return code
    }
  }
  return lowerText
}

export function matchesDeviceStatus(value?: string, selectedStatus = 'all') {
  if (!selectedStatus || selectedStatus === 'all') return true
  return normalizeDeviceStatus(value) === normalizeDeviceStatus(selectedStatus)
}

export function deviceStatusColor(value?: string): LedgerTagColor {
  const text = normalizeDeviceStatus(value)
  if (text.includes('scrap') || text.includes('disabled')) return 'red'
  if (text.includes('seal') || text.includes('delay') || text.includes('repair') || text.includes('pending')) return 'orange'
  if (text.includes('in_use')) return 'green'
  return 'default'
}

export function verificationMethodText(value?: string) {
  const map: Record<string, string> = {
    self: '自检',
    self_check: '自检',
    send_out: '外委',
    external: '外委',
    external_commission: '外委'
  }
  return value ? map[value] || value : '-'
}

export function formatCycle(value?: number) {
  if (value === null || value === undefined) return '-'
  return `${value}个月`
}

export function mandatoryText(value?: number) {
  if (value === 1) return '是'
  if (value === 0) return '否'
  return '-'
}

export function isDeviceOverdue(device: DeviceVO, today = new Date().toISOString().slice(0, 10)) {
  const dueDate = formatDate(device.nextVerificationDate || device.validUntil)
  return dueDate !== '-' && dueDate < today
}

export function deviceRowKey(device: DeviceVO) {
  return String(device.id ?? device.deviceCode ?? '')
}

export function mapDeviceLedgerRow(device: DeviceVO, today?: string): DeviceLedgerRow {
  return {
    key: deviceRowKey(device),
    source: device,
    deviceCode: displayValue(device.deviceCode),
    deviceName: displayValue(device.deviceName),
    modelSpec: displayValue(device.modelSpec),
    factoryCode: displayValue(device.factoryCode),
    deptName: displayValue(device.deptName),
    manufacturer: displayValue(device.manufacturer),
    categoryText: deviceCategoryText(device.manageCategory),
    categoryColor: deviceCategoryColor(device.manageCategory),
    statusText: deviceStatusText(device.deviceStatus),
    statusColor: deviceStatusColor(device.deviceStatus),
    mandatoryText: mandatoryText(device.isMandatory),
    methodText: verificationMethodText(device.verificationMethod),
    cycleText: formatCycle(device.verificationCycleMonth),
    lastVerificationDate: formatDate(device.lastVerificationDate),
    nextVerificationDate: formatDate(device.nextVerificationDate || device.validUntil),
    overdue: isDeviceOverdue(device, today)
  }
}

export function sourceTypeText(value?: string) {
  const map: Record<string, string> = {
    first_check: '首检',
    FIRST_CHECK: '首检',
    firstcheck: '首检',
    periodic: '周检',
    PERIODIC: '周检',
    change: '状态变更',
    CHANGE: '状态变更',
    periodic_task: '周检'
  }
  return value ? map[value] || value : '首检'
}

export function historyColor(value?: string): LedgerTagColor {
  const normalized = String(value || '').toLowerCase()
  if (normalized.includes('cost')) return 'orange'
  if (normalized.includes('label')) return 'green'
  if (normalized.includes('status')) return 'blue'
  if (normalized.includes('verification')) return 'green'
  return 'default'
}

export function formatHistoryAmount(value?: string | number, currency = 'CNY') {
  if (value === null || value === undefined || value === '') return ''
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return ''
  const prefix = currency === 'CNY' || !currency ? '¥' : `${currency} `
  return `${prefix}${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export function mapDeviceHistoryRow(history: DeviceHistoryVO, index = 0): DeviceHistoryRow {
  return {
    key: String(history.key || `${history.historyType || 'history'}-${history.sourceNo || index}`),
    typeText: displayValue(history.historyTypeName || sourceTypeText(history.sourceType)),
    sourceNo: displayValue(history.sourceNo || history.sourceId),
    dateText: formatChineseDate(history.eventTime),
    color: historyColor(history.historyType),
    title: displayValue(history.title),
    summary: displayValue(history.summary),
    operator: displayValue(history.operatorName || history.operatorId),
    amount: formatHistoryAmount(history.amount, history.currency)
  }
}

export function buildDeviceHistoryRows(device: DeviceVO, histories: DeviceHistoryVO[] = []): DeviceHistoryRow[] {
  if (histories.length > 0) {
    return histories.map((history, index) => mapDeviceHistoryRow(history, index))
  }
  const date = device.lastVerificationDate || device.factoryDate || device.validUntil || device.nextVerificationDate
  if (!date) return []

  const typeText = sourceTypeText(device.sourceType)
  return [
    {
      key: `${deviceRowKey(device)}-${typeText}`,
      typeText,
      sourceNo: displayValue(device.sourceOrderId || device.deviceCode),
      dateText: formatChineseDate(date),
      color: typeText === '首检' ? 'green' : 'blue'
    }
  ]
}
