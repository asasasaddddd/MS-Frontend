import type { ChangeOrderVO, ChangeType, ChangeVerifierHandleRequest } from '@/types/change'
import type { EntityId } from '@/types/periodic'

export type ChangeVerifierResult = 'qualified' | 'unqualified' | 'scrap' | 'repair'

export interface ChangeVerifierDialogConfig {
  type: ChangeType
  title: string
  sectionTitle: string
  reasonLabel: string
  reasonPlaceholder: string
  showApplicationMeta: boolean
  showVerification: boolean
  showNeedSend: boolean
  showCategoryTransition?: boolean
  showCycleTransition?: boolean
  showNewCycle?: boolean
}

export interface ChangeVerifierFormState {
  reason: string
  needSend: boolean
  verificationDate: string
  validUntil: string
  result: ChangeVerifierResult
  responsibleEngineerId?: string
  responsibleEngineerName?: string
  newCycleMonth?: number
  opinion: string
  certificateAttachmentGroupId?: EntityId
}

const fullForm = {
  showApplicationMeta: true,
  showVerification: true,
  showNeedSend: true
} as const

const configs: Record<Exclude<ChangeType, 'transfer'>, ChangeVerifierDialogConfig> = {
  enable: {
    type: 'enable',
    title: '启用信息填写',
    sectionTitle: '启用信息',
    reasonLabel: '启用原因',
    reasonPlaceholder: '请填写设备启用原因及说明',
    ...fullForm
  },
  seal: {
    type: 'seal',
    title: '封存确认',
    sectionTitle: '封存信息',
    reasonLabel: '封存原因',
    reasonPlaceholder: '请填写封存原因及说明',
    showApplicationMeta: false,
    showVerification: false,
    showNeedSend: false
  },
  scrap: {
    type: 'scrap',
    title: '非正常报废确认',
    sectionTitle: '非正常报废信息',
    reasonLabel: '报废原因',
    reasonPlaceholder: '请填写非正常报废原因及说明',
    showApplicationMeta: false,
    showVerification: false,
    showNeedSend: false
  },
  category: {
    type: 'category',
    title: '管理类别调整填写',
    sectionTitle: '管理类别调整信息',
    reasonLabel: '调整原因',
    reasonPlaceholder: '请填写管理类别调整原因及说明',
    showCategoryTransition: true,
    showNewCycle: true,
    ...fullForm
  },
  cycle: {
    type: 'cycle',
    title: '检定周期调整填写',
    sectionTitle: '检定周期调整信息',
    reasonLabel: '调整原因',
    reasonPlaceholder: '请填写检定周期调整原因及说明',
    showCycleTransition: true,
    ...fullForm
  },
  precheck: {
    type: 'precheck',
    title: '用前检定填写弹窗',
    sectionTitle: '用前检定信息',
    reasonLabel: '用前检定原因',
    reasonPlaceholder: '请填写用前检定原因及说明',
    ...fullForm
  }
}

const periodicScrapReturn: ChangeVerifierDialogConfig = {
  type: 'scrap',
  title: '周检报废退回',
  sectionTitle: '周检报废退回信息',
  reasonLabel: '周检报废退回原因',
  reasonPlaceholder: '请填写周检报废退回原因及说明',
  ...fullForm
}

export const verifierResultOptions = [
  { label: '合格', value: 'qualified' },
  { label: '不合格', value: 'unqualified' },
  { label: '报废', value: 'scrap' },
  { label: '维修', value: 'repair' }
] as const

export function resolveChangeVerifierDialog(order?: ChangeOrderVO | null): ChangeVerifierDialogConfig {
  const type = order?.changeType as ChangeType | undefined
  const isPeriodicScrapReturn = type === 'scrap' && order?.items?.some((item) => item.scrapType === 'normal')
  if (isPeriodicScrapReturn) return periodicScrapReturn
  if (type && type !== 'transfer' && configs[type]) return configs[type]
  return configs.precheck
}

export function changeVerifierReason(order?: ChangeOrderVO | null) {
  const item = order?.items?.[0]
  switch (order?.changeType) {
    case 'seal':
      return item?.sealReason || order.reason || ''
    case 'enable':
      return item?.enableReason || order.reason || ''
    case 'category':
    case 'cycle':
      return item?.adjustmentReason || order.reason || ''
    case 'scrap':
      return item?.scrapReason || order.reason || ''
    case 'precheck':
      return item?.verificationReason || order.reason || ''
    default:
      return order?.reason || ''
  }
}

export function validateChangeVerifierForm(config: ChangeVerifierDialogConfig, form: ChangeVerifierFormState) {
  if (!form.reason.trim()) return `请填写${config.reasonLabel}`
  if (!config.showVerification) return ''
  if (!form.verificationDate) return '请选择检定日期'
  if (!form.validUntil) return '请选择有效期'
  if (!form.result) return '请选择结果判定'
  if (config.showNewCycle && !form.newCycleMonth) return '请选择新检定周期'
  if ((form.result === 'scrap' || form.result === 'repair') && !form.responsibleEngineerId) {
    return '请选择责任工程'
  }
  return ''
}

export function buildChangeVerifierHandleRequest(
  order: ChangeOrderVO,
  form: ChangeVerifierFormState
): ChangeVerifierHandleRequest {
  if (order.taskId === undefined || order.rowVersion === undefined) {
    throw new Error('状态变更任务身份不完整，请刷新后重试')
  }
  return {
    orderId: order.id,
    taskId: order.taskId,
    rowVersion: order.rowVersion,
    verificationResult: form.result,
    verificationDate: form.verificationDate || undefined,
    validUntil: form.validUntil || undefined,
    certificateAttachmentGroupId: form.certificateAttachmentGroupId,
    reason: form.reason.trim(),
    sendOutRequired: form.needSend ? 1 : 0,
    responsibleEngineerId: form.responsibleEngineerId,
    responsibleEngineerName: form.responsibleEngineerName,
    newCycleMonth: form.newCycleMonth,
    opinion: form.opinion.trim() || undefined
  }
}
