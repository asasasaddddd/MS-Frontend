import type { ChangeItemSubmitRequest, ChangeItemVO, ChangeOrderVO, ChangeType } from '@/types/change'
import type { DeviceVO } from '@/types/device'
import type { AllowedOrganizationNodeVO } from '@/types/nodePermission'
import type { EntityId, RowVersion } from '@/types/common'
import { resolveDeviceCurrentStatus } from '../device/deviceCurrentStatusModel.ts'

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
  taskId: EntityId
  rowVersion: RowVersion
  allowedActions: string[]
  nodeCode?: string
  nodeName?: string
  order: ChangeOrderVO
}

/** 状态变更审批节点的统一操作编码。 */
export const CHANGE_APPROVE_ACTION = 'APPROVE_REJECT'

/** 状态变更检定节点的统一操作编码。 */
export const CHANGE_VERIFY_ACTION = 'SUBMIT_REJECT'

/** 管理员处理退回修订节点的统一操作编码。 */
export const CHANGE_REVISE_ACTION = 'RESUBMIT'

/** 判断后端是否允许当前身份执行指定节点操作。 */
export function hasChangeAction(row: ChangeTaskRow, action: string) {
  return row.allowedActions.includes(action)
}

/** 所有后端状态变更类型的展示元数据，包括只能由其他业务发起的类型。 */
export const changeTypeDisplayMetas: ChangeTypeMeta[] = [
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
  { value: 'precheck', label: '用前检定', title: '用前检定', applyTitle: '用前检定申请', primaryField: '检定原因', color: 'cyan' },
  { value: 'defer', label: '缓检', title: '缓检', applyTitle: '缓检申请', primaryField: '缓检原因', color: 'orange' }
]

/** 状态变更页面允许管理员手工发起的类型；缓检只能从周检流程发起。 */
export const changeTypeMetas = changeTypeDisplayMetas.filter(({ value }) => value !== 'defer')

export function normalizeChangeType(value?: string): ChangeType | string | undefined {
  return value
}

export function getChangeTypeMeta(value?: string) {
  const normalized = normalizeChangeType(value)
  return changeTypeDisplayMetas.find((item) => item.value === normalized)
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

const categoryOptions = [
  { label: 'A类', value: 'A类' },
  { label: 'B类', value: 'B类' },
  { label: 'C类', value: 'C类' }
]

export function categoryTargetOptions(currentCategory?: string) {
  const currentCode = normalizeCategoryCode(currentCategory)
  return categoryOptions.filter((option) => normalizeCategoryCode(option.value) !== currentCode)
}

export function haveUniformOriginalCategory(devices: Array<Pick<DeviceVO, 'manageCategory'>>) {
  const categories = new Set(devices.map((device) => normalizeCategoryCode(device.manageCategory) || ''))
  return categories.size <= 1
}

export function deviceStatusName(value?: string) {
  return resolveDeviceCurrentStatus({ deviceStatus: value }).text
}

export function currentDeviceStatusName(device: DeviceVO) {
  return resolveDeviceCurrentStatus(device).text
}

export function currentDeviceStatusColor(device: DeviceVO) {
  return resolveDeviceCurrentStatus(device).color
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
    manager_revise: '管理员退回修订',
    dept_leader_approve: '部门主管审批',
    measure_leader_review: '计量领导审核',
    responsible_engineer_review: '责任工程师审核',
    receive_dept_leader_confirm: '接收部门主管确认',
    receive_admin_confirm: '接收管理员确认',
    verifier_handle: '检定员处理',
    manager_forward_confirm: '管理员转办确认员',
    confirmer_confirm: '确认员确认',
    label_print: '检定员打印标签',
    admin_take_back: '管理员取回'
  }
  return value ? map[value] || value : '-'
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

export function buildTransferDepartmentOptions(
  organizations: AllowedOrganizationNodeVO[]
): Array<{ label: string, value: string }> {
  const options: Array<{ label: string, value: string }> = []
  for (const organization of organizations || []) {
    if (organization.orgType === 'DEPARTMENT' && organization.orgId) {
      options.push({
        label: organization.orgName || organization.orgId,
        value: organization.orgId
      })
    }
    options.push(...buildTransferDepartmentOptions(organization.children || []))
  }
  return options
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
