import type { DeviceVO } from '@/types/device'
import {
  resolveDeviceCurrentStatus,
  type DeviceCurrentStatusColor
} from './deviceCurrentStatusModel.ts'

export type LedgerTagColor = DeviceCurrentStatusColor

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

export function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export function formatDate(value?: string) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 10)
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
  return resolveDeviceCurrentStatus({ deviceStatus: value }).text
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
  return resolveDeviceCurrentStatus({ deviceStatus: value }).color
}

export function currentDeviceStatusText(device: DeviceVO) {
  return resolveDeviceCurrentStatus(device).text
}

export function currentDeviceStatusColor(device: DeviceVO): LedgerTagColor {
  return resolveDeviceCurrentStatus(device).color
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
    statusText: currentDeviceStatusText(device),
    statusColor: currentDeviceStatusColor(device),
    mandatoryText: mandatoryText(device.isMandatory),
    methodText: verificationMethodText(device.verificationMethod),
    cycleText: formatCycle(device.verificationCycleMonth),
    lastVerificationDate: formatDate(device.lastVerificationDate),
    nextVerificationDate: formatDate(device.nextVerificationDate || device.validUntil),
    overdue: isDeviceOverdue(device, today)
  }
}
