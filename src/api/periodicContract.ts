import type {
  PeriodicScanRequest,
  PeriodicSecondJudgeDisposal,
  PeriodicSecondJudgeRequest,
  PeriodicTaskVO,
  PeriodicVerificationRecordRequest
} from '@/types/periodic'

const periodicEndpoints = {
  generatePlan: '/periodic/plans/generate',
  generateTestPlan: '/periodic/plans/generate-test-one',
  generateMonthPlan: '/periodic/plans/generate-month',
  generateBeforeUsePlan: '/periodic/pre-use/plans/generate',
  planDetail: '/periodic/plans',
  planTasks: '/periodic/plans',
  myTasks: '/periodic/my-tasks',
  myHistory: '/periodic/my-history',
  taskDetail: '/periodic/tasks',
  verifierReceive: '/periodic/verifier-receive',
  externalSendOut: '/periodic/external-send-out',
  sendOutReturn: '/periodic/send-out-return',
  verificationRecord: '/periodic/verification-record',
  managerForwardConfirm: '/periodic/manager-forward-confirm',
  confirmerConfirm: '/periodic/confirmer-confirm',
  exceptionDispose: '/periodic/exception-dispose',
  exceptionChangeSubmit: '/periodic/exception-change/submit',
  supplierFillInfo: '/periodic/supplier-fill-info',
  verifierFillInfo: '/periodic/verifier-fill-info',
  responsibleSecondJudge: '/periodic/responsible-second-judge',
  secondJudge: '/periodic/second-judge'
} as const

export type PeriodicEndpointKey = keyof typeof periodicEndpoints

export function periodicEndpoint(key: PeriodicEndpointKey, id?: string | number) {
  if (key === 'planDetail' && id !== undefined) return `${periodicEndpoints.planDetail}/${id}`
  if (key === 'planTasks' && id !== undefined) return `${periodicEndpoints.planTasks}/${id}/tasks`
  if (key === 'taskDetail' && id !== undefined) return `${periodicEndpoints.taskDetail}/${id}`
  return periodicEndpoints[key]
}

export function periodicNodeName(value?: string) {
  const map: Record<string, string> = {
    plan_issue: '计划下发',
    plan_confirm: '待实物交接',
    verifier_receive: '检定员扫码接收',
    self_verify: '自检检定',
    verification_record: '检定记录填写',
    send_out: '外委送出',
    send_out_return: '外委送回',
    supplier_fill_info: '外扩人员填写检定信息',
    verifier_fill_info: '外委检定员填写检定信息',
    responsible_second_judge: '责任工程师二次判定',
    external_third_judge: '外委检定员三次判定',
    manager_forward_confirm: '管理员转办确认员',
    confirmer_confirm: '确认员确认',
    exception_disposal: '异常处置',
    completed: '已完成'
  }
  return value ? map[value] || value : '-'
}

export function isPeriodicDualHandoverTask(
  task: Pick<PeriodicTaskVO, 'currentNode' | 'taskStatus' | 'physicalStatus'>
) {
  return (
    task.currentNode === 'plan_confirm' &&
    task.taskStatus === 'pending' &&
    task.physicalStatus === 'wait_verifier_receive'
  )
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

export function isPeriodicSecondJudgeDisposal(value: string): value is PeriodicSecondJudgeDisposal {
  return value === 'qualified' || value === 'repair' || value === 'scrap'
}

export function buildPeriodicSecondJudgeRequest(input: PeriodicSecondJudgeRequest) {
  if (!isPeriodicSecondJudgeDisposal(input.disposal)) {
    throw new Error('二次判定结果只能是 qualified、repair 或 scrap')
  }
  return input
}
