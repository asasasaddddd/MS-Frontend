import type {
  PeriodicJudgementRequest,
  PeriodicJudgementResult,
  PeriodicScanRequest,
  PeriodicScrapDisposalRequest,
  PeriodicNodeCode,
  PeriodicVerificationRecordRequest
} from '@/types/periodic'

const PERIODIC_NODE_CODES = new Set<PeriodicNodeCode>([
  'system_issue',
  'admin_exception_route',
  'self_verify',
  'external_common_fill',
  'verifier_second_judge',
  'responsible_second_judge',
  'responsible_third_judge',
  'verifier_third_judge',
  'responsible_fourth_judge',
  'verifier_scrap_disposal',
  'external_uncommon_fill',
  'manager_forward_confirm',
  'confirmer_confirm',
  'admin_take_back'
])

/** 将统一任务节点收窄为周检权威节点，拒绝跨业务和历史节点。 */
export function parsePeriodicNodeCode(value?: string): PeriodicNodeCode | undefined {
  return value && PERIODIC_NODE_CODES.has(value as PeriodicNodeCode)
    ? value as PeriodicNodeCode
    : undefined
}

/** 周检后端接口路径表。 */
const periodicEndpoints = {
  generatePlan: '/periodic/plans/generate',
  generateTestPlan: '/periodic/plans/generate-test-one',
  generateMonthPlan: '/periodic/plans/generate-month',
  generateBeforeUsePlan: '/periodic/pre-use/plans/generate',
  planDetail: '/periodic/plans',
  planTasks: '/periodic/plans',
  taskDetail: '/periodic/tasks',
  verifierReceive: '/periodic/verifier-receive',
  externalSendOut: '/periodic/external-send-out',
  sendOutReturn: '/periodic/send-out-return',
  verificationRecord: '/periodic/self-verify',
  managerForwardConfirm: '/periodic/manager-forward-confirm',
  confirmerConfirm: '/periodic/confirmer-confirm',
  managerTakeBack: '/periodic/manager-take-back',
  exceptionChangeSubmit: '/periodic/exception-change/submit',
  supplierFillInfo: '/periodic/external-common-fill',
  verifierFillInfo: '/periodic/external-uncommon-fill',
  judgements: '/periodic/judgements',
  scrapDisposal: '/periodic/scrap-disposal'
} as const

/** 周检接口路径表支持的端点键。 */
export type PeriodicEndpointKey = keyof typeof periodicEndpoints

/**
 * 解析周检接口路径。
 *
 * @param key 接口键。
 * @param id 详情类接口的业务主键。
 */
export function periodicEndpoint(key: PeriodicEndpointKey, id?: string | number) {
  if (key === 'planDetail' && id !== undefined) return `${periodicEndpoints.planDetail}/${id}`
  if (key === 'planTasks' && id !== undefined) return `${periodicEndpoints.planTasks}/${id}/tasks`
  if (key === 'taskDetail' && id !== undefined) return `${periodicEndpoints.taskDetail}/${id}`
  return periodicEndpoints[key]
}

/**
 * 返回周检业务节点的展示名称。
 *
 * @param value 周检节点编码。
 */
export function periodicNodeName(value?: string) {
  const map: Record<string, string> = {
    system_issue: '系统下发',
    admin_exception_route: '管理员异常分流',
    self_verify: '自检检定',
    external_common_fill: '外扩账号填写通用设备检定信息',
    verifier_second_judge: '外委检定员二次判定',
    responsible_second_judge: '责任工程师二次判定',
    responsible_third_judge: '责任工程师三次判定',
    verifier_third_judge: '外委检定员三次判定',
    responsible_fourth_judge: '责任工程师四次判定',
    verifier_scrap_disposal: '外委检定员报废处置',
    external_uncommon_fill: '外委检定员填写否通用设备信息',
    manager_forward_confirm: '管理员转办确认员',
    confirmer_confirm: '确认员确认',
    admin_take_back: '管理员取回'
  }
  return value ? map[value] || value : '-'
}

export function periodicStatusName(value?: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    wait_scan: '待扫码',
    wait_verify: '待检定',
    wait_confirm: '待确认',
    exception: '异常',
    completed: '已完成',
    rejected: '已驳回',
    cancelled: '已取消'
  }
  return value ? map[value] || value : '-'
}

function optionalFlag(value: boolean | number | undefined) {
  if (value === undefined) return undefined
  if (typeof value === 'number') return value
  return value ? 1 : 0
}

function optionalLocalDateTime(value?: string) {
  if (!value) return undefined
  const normalized = value.trim().replace(' ', 'T').replace(/Z$/, '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T00:00:00`
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`
  }
  return normalized
}

function optionalDecimal(value?: string | number) {
  if (value === undefined || value === '') return undefined
  if (typeof value === 'number') return value
  const matched = value.trim().match(/-?\d+(\.\d+)?/)
  if (!matched) return undefined
  const parsed = Number(matched[0])
  return Number.isFinite(parsed) ? parsed : undefined
}

export function buildPeriodicScanRequest(input: PeriodicScanRequest): PeriodicScanRequest {
  const scanCode = input.scanCode.trim()
  return {
    ...input,
    scanCode,
    scanContent: input.scanContent || scanCode,
    scanLocation: input.scanLocation || '现场扫码'
  }
}

export function buildPeriodicVerificationRecordRequest(input: PeriodicVerificationRecordRequest) {
  return {
    ...input,
    verificationTime: optionalLocalDateTime(input.verificationTime),
    environmentTemp: optionalDecimal(input.environmentTemp),
    environmentHumidity: optionalDecimal(input.environmentHumidity),
    forceValidUntil: optionalFlag(input.forceValidUntil),
    confirmationRequired: optionalFlag(input.confirmationRequired)
  }
}

/**
 * 判断字符串是否为统一周检判定结果。
 *
 * @param value 待校验的结果编码。
 */
export function isPeriodicJudgementResult(value: string): value is PeriodicJudgementResult {
  return value === 'qualified' || value === 'unqualified'
}

/**
 * 构建统一周检判定请求并清理可选意见。
 *
 * @param input 判定表单数据。
 */
export function buildPeriodicJudgementRequest(input: PeriodicJudgementRequest): PeriodicJudgementRequest {
  if (!isPeriodicJudgementResult(input.judgeResult)) {
    throw new Error('判定结果只能是 qualified 或 unqualified')
  }
  return {
    ...input,
    opinion: input.opinion?.trim() || undefined
  }
}

/**
 * 构建外委检定员报废处置请求并校验报废原因。
 *
 * @param input 报废处置表单数据。
 */
export function buildPeriodicScrapDisposalRequest(
  input: PeriodicScrapDisposalRequest
): PeriodicScrapDisposalRequest {
  const scrapReason = input.scrapReason.trim()
  if (!scrapReason) {
    throw new Error('请填写报废原因')
  }
  return {
    ...input,
    scrapReason,
    opinion: input.opinion?.trim() || undefined
  }
}
