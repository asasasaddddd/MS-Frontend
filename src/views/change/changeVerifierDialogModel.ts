import type { ChangeOrderVO, ChangeType, ChangeVerifierHandleRequest } from '@/types/change'
import type { EntityId } from '@/types/periodic'

export type ChangeVerifierResult = 'qualified' | 'scrap' | 'repair'

export interface ChangeVerifierDialogConfig {
  type: ChangeType
  title: string
  sectionTitle: string
  reasonLabel: string
  reasonPlaceholder: string
  showApplicationMeta: boolean
  showVerification: boolean
  showVerificationDecision?: boolean
  validUntilRequired: boolean
  showCategoryTransition?: boolean
  showCycleTransition?: boolean
  showNewCycle?: boolean
}

export interface ChangeVerifierFormState {
  reason: string
  verificationRequired?: 0 | 1
  verificationDate: string
  validUntil: string
  result: ChangeVerifierResult
  responsibleEngineerId?: string
  responsibleEngineerName?: string
  newCycleMonth?: number
  opinion: string
  certificateAttachmentGroupId?: EntityId
}

const externalVerificationMethodCodes = new Set([
  'send_out',
  'external',
  'external_commission',
  '外委',
  '外送',
  '外委检定',
  '外送检定',
  '送检'
])
const externalReturnReceivedPhysicalStatuses = new Set(['send_out_return_received', 'sendout_return_received'])
const externalReadyForSendOutPhysicalStatuses = new Set(['wait_external_send_out'])
const verificationDecisionChangeTypes = new Set(['category', 'cycle'])

const fullForm = {
  showApplicationMeta: true,
  showVerification: true,
  validUntilRequired: true
} as const

const configs: Record<ChangeType, ChangeVerifierDialogConfig> = {
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
    validUntilRequired: false
  },
  transfer: {
    type: 'transfer',
    title: '设备转移接收确认',
    sectionTitle: '设备转移接收信息',
    reasonLabel: '接收意见',
    reasonPlaceholder: '请填写设备转移接收意见',
    showApplicationMeta: false,
    showVerification: false,
    validUntilRequired: false
  },
  scrap: {
    type: 'scrap',
    title: '确认报废 / 实物入库',
    sectionTitle: '确认报废 / 实物入库信息',
    reasonLabel: '报废原因',
    reasonPlaceholder: '请填写非正常报废原因及说明',
    showApplicationMeta: false,
    showVerification: false,
    validUntilRequired: false
  },
  category: {
    type: 'category',
    title: '管理类别调整填写',
    sectionTitle: '管理类别调整信息',
    reasonLabel: '调整原因',
    reasonPlaceholder: '请填写管理类别调整原因及说明',
    ...fullForm,
    showCategoryTransition: true,
    showVerificationDecision: true,
    showNewCycle: false,
    validUntilRequired: false
  },
  cycle: {
    type: 'cycle',
    title: '检定周期调整填写',
    sectionTitle: '检定周期调整信息',
    reasonLabel: '调整原因',
    reasonPlaceholder: '请填写检定周期调整原因及说明',
    showCycleTransition: true,
    showVerificationDecision: true,
    ...fullForm
  },
  precheck: {
    type: 'precheck',
    title: '用前检定填写弹窗',
    sectionTitle: '用前检定信息',
    reasonLabel: '用前检定原因',
    reasonPlaceholder: '请填写用前检定原因及说明',
    ...fullForm
  },
  defer: {
    type: 'defer',
    title: '缓检确认',
    sectionTitle: '缓检信息',
    reasonLabel: '缓检原因',
    reasonPlaceholder: '请填写缓检原因及说明',
    showApplicationMeta: false,
    showVerification: false,
    validUntilRequired: false
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
  { label: '报废', value: 'scrap' },
  { label: '维修', value: 'repair' }
] as const

export function resolveChangeVerifierDialog(order?: ChangeOrderVO | null): ChangeVerifierDialogConfig {
  const type = order?.changeType as ChangeType | undefined
  const isPeriodicScrapReturn = type === 'scrap' && order?.items?.some((item) => item.scrapType === 'normal')
  const baseConfig = isPeriodicScrapReturn
    ? periodicScrapReturn
    : type && configs[type]
      ? configs[type]
      : configs.precheck
  const items = order?.items || []
  const oneTimeVerification = items.length > 0 && items.every((item) => item.confirmInterval === '一次检定')
  return oneTimeVerification && baseConfig.showVerification
    ? { ...baseConfig, validUntilRequired: false, showNewCycle: false }
    : baseConfig
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
    case 'defer':
      return item?.verificationReason || order.reason || ''
    default:
      return order?.reason || ''
  }
}

function normalizeText(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function isExternalVerificationMethod(value?: string | null) {
  return externalVerificationMethodCodes.has(normalizeText(value))
}

function isExternalDecisionItem(candidate: NonNullable<ChangeOrderVO['items']>[number]) {
  const method = candidate.oldVerificationMethod || candidate.newVerificationMethod
  return isExternalVerificationMethod(method) || candidate.sendOutRequired === 1
}

export function isExternalDecisionBeforeReturn(order?: ChangeOrderVO | null) {
  if (!verificationDecisionChangeTypes.has(normalizeText(order?.changeType))) return false
  const items = order?.items || []
  if (items.length === 0) return false
  return items.some((candidate) => {
    if (!isExternalDecisionItem(candidate)) return false
    return !externalReturnReceivedPhysicalStatuses.has(normalizeText(candidate.physicalStatus))
  })
}

export function isExternalDecisionReadyForSendOut(order?: ChangeOrderVO | null) {
  if (!verificationDecisionChangeTypes.has(normalizeText(order?.changeType))) return false
  const externalItems = (order?.items || []).filter(isExternalDecisionItem)
  return externalItems.length > 0
    && externalItems.every((candidate) =>
      externalReadyForSendOutPhysicalStatuses.has(normalizeText(candidate.physicalStatus))
    )
}

export function shouldShowChangeVerifierInspectionFields(
  config: ChangeVerifierDialogConfig,
  form: ChangeVerifierFormState,
  order?: ChangeOrderVO | null
) {
  const verificationRequired = config.showVerificationDecision
    ? form.verificationRequired === 1
    : config.showVerification
  return verificationRequired && !isExternalDecisionBeforeReturn(order)
}

export function validateChangeVerifierForm(
  config: ChangeVerifierDialogConfig,
  form: ChangeVerifierFormState,
  order?: ChangeOrderVO | null
) {
  if (!form.reason.trim()) return `请填写${config.reasonLabel}`
  if (config.showVerificationDecision && form.verificationRequired !== 0 && form.verificationRequired !== 1) {
    return '请选择是否检定'
  }
  if (config.showVerificationDecision
      && form.verificationRequired === 1
      && isExternalDecisionBeforeReturn(order)
      && !isExternalDecisionReadyForSendOut(order)) {
    return '外委设备需送回扫码后再填写检定信息'
  }
  if (!shouldShowChangeVerifierInspectionFields(config, form, order)) return ''
  if (!form.verificationDate) return '请选择检定日期'
  if (config.validUntilRequired && !form.validUntil) return '请选择有效期'
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
  const config = resolveChangeVerifierDialog(order)
  const verificationRequired = config.showVerificationDecision
    ? form.verificationRequired
    : config.showVerification
      ? 1
      : 0
  if (verificationRequired !== 0 && verificationRequired !== 1) {
    throw new Error('请选择是否检定')
  }
  const baseRequest: ChangeVerifierHandleRequest = {
    orderId: order.id,
    taskId: order.taskId,
    rowVersion: order.rowVersion,
    verificationRequired,
    reason: form.reason.trim(),
    opinion: form.opinion.trim() || undefined
  }
  if (verificationRequired === 0) {
    return baseRequest
  }
  if (isExternalDecisionBeforeReturn(order)) {
    return baseRequest
  }
  return {
    ...baseRequest,
    verificationResult: form.result,
    verificationDate: form.verificationDate || undefined,
    ...(config.validUntilRequired && form.validUntil ? { validUntil: form.validUntil } : {}),
    certificateAttachmentGroupId: form.certificateAttachmentGroupId,
    responsibleEngineerId: form.responsibleEngineerId,
    responsibleEngineerName: form.responsibleEngineerName,
    ...(config.showNewCycle && form.newCycleMonth ? { newCycleMonth: form.newCycleMonth } : {})
  }
}
