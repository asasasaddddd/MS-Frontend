import type { ChangeItemSubmitRequest, ChangeItemVO, ChangeOrderVO, ChangeType } from '@/types/change'
import type { DeviceVO } from '@/types/device'
import type { EntityId } from '@/types/periodic'
import type { RoleCode } from '@/types/common'

export interface ChangeTypeMeta {
  value: ChangeType
  label: string
  title: string
  applyTitle: string
  primaryField: string
  color: 'blue' | 'green' | 'orange' | 'red' | 'cyan'
}

export interface ChangeTaskRow {
  key: string
  taskId?: EntityId
  nodeCode?: string
  nodeName?: string
  order: ChangeOrderVO
}

export const changeTypeMetas: ChangeTypeMeta[] = [
  { value: 'seal', label: '封存', title: '设备封存', applyTitle: '设备封存申请', primaryField: '封存原因', color: 'red' },
  { value: 'enable', label: '启用', title: '设备启用', applyTitle: '设备启用申请', primaryField: '启用原因', color: 'green' },
  { value: 'transfer', label: '设备转移', title: '设备转移', applyTitle: '设备转移申请', primaryField: '转移原因', color: 'blue' },
  {
    value: 'category',
    label: '管理类别调整',
    title: '管理类别调整',
    applyTitle: '管理类别调整申请',
    primaryField: '调整后管理类别',
    color: 'blue'
  },
  {
    value: 'cycle',
    label: '检定周期调整',
    title: '检定周期调整',
    applyTitle: '检定周期调整申请',
    primaryField: '调整后检定周期',
    color: 'orange'
  },
  { value: 'scrap', label: '非正常报废', title: '非正常报废', applyTitle: '非正常报废申请', primaryField: '报废原因', color: 'red' },
  { value: 'precheck', label: '用前检定', title: '用前检定', applyTitle: '用前检定申请', primaryField: '检定原因', color: 'cyan' }
]

export function normalizeChangeType(value?: string): ChangeType | string | undefined {
  return value
}

export function getChangeTypeMeta(value?: string) {
  const normalized = normalizeChangeType(value)
  return changeTypeMetas.find((item) => item.value === normalized)
}

export function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export function formatDate(value?: string) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 10)
}

export function formatDateTime(value?: string) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}

export function formatCycleMonth(value?: number) {
  return value ? `${value}个月` : '-'
}

export function normalizeCategory(value?: string) {
  if (!value) return '-'
  if (value === 'A' || value === 'A类') return 'A类'
  if (value === 'B' || value === 'B类') return 'B类'
  if (value === 'C' || value === 'C类') return 'C类'
  return value
}

export function normalizeCategoryCode(value?: string) {
  if (!value) return undefined
  if (value.includes('A')) return 'A'
  if (value.includes('B')) return 'B'
  if (value.includes('C')) return 'C'
  return value
}

export function deviceStatusName(value?: string) {
  const map: Record<string, string> = {
    in_use: '在用',
    sealed: '封存',
    pending_enable: '待启用',
    scrapped: '已报废',
    repairing: '维修中',
    delayed: '缓检中',
    pending_scrap: '待报废'
  }
  return value ? map[value] || value : '-'
}

export function verificationMethodName(value?: string) {
  const map: Record<string, string> = {
    self: '自检',
    self_check: '自检',
    send_out: '外委',
    external: '外委',
    external_commission: '外委'
  }
  return value ? map[value] || value : '-'
}

export function changeTypeName(value?: string) {
  return getChangeTypeMeta(value)?.label || value || '-'
}

export function changeTypeTitle(value?: string) {
  return getChangeTypeMeta(value)?.title || changeTypeName(value)
}

export function changeTypeApplyTitle(value?: string) {
  return getChangeTypeMeta(value)?.applyTitle || `${changeTypeName(value)}申请`
}

export function changeStatusName(value?: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    processing: '处理中',
    returned: '已退回',
    approved: '已通过',
    completed: '已完成',
    rejected: '已驳回',
    cancelled: '已取消',
    running: '流转中'
  }
  return value ? map[value] || value : '-'
}

export function changeNodeName(value?: string) {
  const map: Record<string, string> = {
    submit: '变更申请',
    dept_leader_approve: '部门主管审批',
    measure_leader_review: '计量领导审核',
    responsible_engineer_review: '责任工程师审核',
    receive_dept_leader_confirm: '接收部门主管确认',
    receive_admin_confirm: '接收管理员确认',
    verifier_handle: '检定员处理'
  }
  return value ? map[value] || value : '-'
}

export function matchesChangeVerifierRole(order: ChangeOrderVO, roleCode?: RoleCode) {
  if (roleCode !== 'VERIFIER_SELF' && roleCode !== 'VERIFIER_EXTERNAL') return true
  const requiresExternalVerifier =
    normalizeChangeType(order.changeType) === 'scrap' ||
    Boolean(order.items?.some((item) => item.sendOutRequired === 1))
  return roleCode === 'VERIFIER_EXTERNAL' ? requiresExternalVerifier : !requiresExternalVerifier
}

export function changeTagColor(value?: string): ChangeTypeMeta['color'] {
  return getChangeTypeMeta(value)?.color || 'blue'
}

export function statusTagColor(value?: string) {
  const text = String(value || '').toLowerCase()
  if (text.includes('reject') || text.includes('cancel') || text.includes('return')) return 'red'
  if (text.includes('complete') || text.includes('approved')) return 'green'
  if (text.includes('process') || text.includes('running')) return 'blue'
  return 'orange'
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function deviceRowKey(device: DeviceVO) {
  return String(device.id ?? device.deviceCode ?? '')
}

export function changeOrderRowKey(order: ChangeOrderVO) {
  return String(order.id)
}

export function buildDeviceSnapshotRemark(device: DeviceVO, extra?: string) {
  const snapshot = [
    `设备编号:${display(device.deviceCode)}`,
    `设备名称:${display(device.deviceName)}`,
    `规格型号:${display(device.modelSpec)}`,
    `使用部门:${display(device.deptName)}`,
    `出厂编号:${display(device.factoryCode)}`
  ].join('；')
  return extra ? `${snapshot}；备注:${extra}` : snapshot
}

export function resolveItemSnapshot(item: ChangeItemVO) {
  const remark = item.remark || ''
  const parts = remark.split(/[；;]/)
  const pick = (label: string) => {
    const part = parts.find((value) => value.startsWith(`${label}:`))
    return part?.slice(label.length + 1)
  }
  return {
    deviceCode: item.deviceCode || pick('设备编号'),
    deviceName: item.deviceName || pick('设备名称'),
    modelSpec: item.modelSpec || pick('规格型号'),
    deptName: item.deptName || pick('使用部门'),
    factoryCode: item.factoryCode || pick('出厂编号')
  }
}

export function buildBaseChangeItem(device: DeviceVO, extra?: Partial<ChangeItemSubmitRequest>): ChangeItemSubmitRequest {
  return {
    deviceId: device.id,
    deviceCode: device.deviceCode,
    remark: buildDeviceSnapshotRemark(device, extra?.remark),
    ...extra
  }
}
