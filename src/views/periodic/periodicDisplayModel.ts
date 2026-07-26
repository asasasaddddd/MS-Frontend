import type { EntityId, PeriodicDisplayRow, PeriodicTaskVO } from '../../types/periodic'

export type PeriodicTableRole = 'admin' | 'verifier' | 'confirmer' | 'externalOperator'
export type PeriodicTagColor = 'blue' | 'cyan' | 'orange' | 'green' | 'red'
export type PeriodicTaskAction =
  | 'submit-exception'
  | 'verifier-receive'
  | 'verify'
  | 'external-send-out'
  | 'send-out-return'
  | 'supplier-fill'
  | 'external-verify'
  | 'judgement'
  | 'scrap-disposal'
  | 'manager-forward'
  | 'confirm'
  | 'exception-dispose'

export interface PeriodicTableColumn {
  title: string
  key: keyof PeriodicDisplayRow | 'action'
  dataIndex?: keyof PeriodicDisplayRow
  width?: number
  fixed?: 'left' | 'right'
}

export interface PeriodicPlanTodoGroup {
  planId: string
  tasks: PeriodicTaskVO[]
  deviceCount: number
}

export type PeriodicDisplayRowWithMeta = PeriodicDisplayRow & {
  tagColor: PeriodicTagColor
}

/** 周检判定弹窗所需的角色与轮次展示信息。 */
export interface PeriodicJudgementDisplay {
  roleCode: 'VERIFIER_EXTERNAL' | 'RESPONSIBLE_ENGINEER'
  roleName: '外委检定员' | '责任工程师'
  round: 2 | 3 | 4
}

/** 各多轮判定节点对应的权威展示信息。 */
const periodicJudgementDisplays: Readonly<Record<string, PeriodicJudgementDisplay>> = {
  verifier_second_judge: { roleCode: 'VERIFIER_EXTERNAL', roleName: '外委检定员', round: 2 },
  responsible_second_judge: { roleCode: 'RESPONSIBLE_ENGINEER', roleName: '责任工程师', round: 2 },
  responsible_third_judge: { roleCode: 'RESPONSIBLE_ENGINEER', roleName: '责任工程师', round: 3 },
  verifier_third_judge: { roleCode: 'VERIFIER_EXTERNAL', roleName: '外委检定员', round: 3 },
  responsible_fourth_judge: { roleCode: 'RESPONSIBLE_ENGINEER', roleName: '责任工程师', round: 4 }
}

/**
 * 读取当前周检判定节点的角色与轮次。
 *
 * @param nodeCode 当前后端待办节点编码。
 */
export function getPeriodicJudgementDisplay(nodeCode?: string) {
  return nodeCode ? periodicJudgementDisplays[nodeCode] : undefined
}

type PeriodicActionTask = Pick<PeriodicTaskVO, 'currentNode' | 'allowedActions'>

const periodicNodeActionMap: Readonly<Record<string, { code: string; action: PeriodicTaskAction }>> = {
  plan_confirm: { code: 'SUBMIT_EXCEPTION', action: 'submit-exception' },
  self_verify: { code: 'SUBMIT', action: 'verify' },
  verification_record: { code: 'SUBMIT', action: 'verify' },
  supplier_fill_info: { code: 'SUBMIT', action: 'supplier-fill' },
  verifier_fill_info: { code: 'SUBMIT', action: 'external-verify' },
  verifier_second_judge: { code: 'JUDGE', action: 'judgement' },
  responsible_second_judge: { code: 'JUDGE', action: 'judgement' },
  responsible_third_judge: { code: 'JUDGE', action: 'judgement' },
  verifier_third_judge: { code: 'JUDGE', action: 'judgement' },
  responsible_fourth_judge: { code: 'JUDGE', action: 'judgement' },
  verifier_scrap_disposal: { code: 'SUBMIT', action: 'scrap-disposal' },
  manager_forward_confirm: { code: 'SUBMIT', action: 'manager-forward' },
  confirmer_confirm: { code: 'APPROVE_REJECT', action: 'confirm' },
  exception_disposal: { code: 'SUBMIT', action: 'exception-dispose' }
}

export function resolvePeriodicTaskAction(task: PeriodicActionTask): PeriodicTaskAction | undefined {
  const allowed = new Set((task.allowedActions || []).map((action) => String(action).toUpperCase()))
  if (allowed.has('RECEIVE')) return 'verifier-receive'
  if (allowed.has('SEND_OUT_RETURN')) return 'send-out-return'
  if (allowed.has('SEND_OUT')) return 'external-send-out'

  const mapping = periodicNodeActionMap[String(task.currentNode || '')]
  return mapping && allowed.has(mapping.code) ? mapping.action : undefined
}

export function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function isDualHandoverTask(task: PeriodicTaskVO) {
  return (
    task.currentNode === 'plan_confirm' &&
    task.taskStatus === 'pending' &&
    task.physicalStatus === 'wait_verifier_receive'
  )
}

function formatDate(value: unknown, length = 10) {
  const text = displayValue(value)
  if (text === '-') return text
  return text.replace('T', ' ').slice(0, length)
}

function verificationCycleName(month?: number) {
  if (month === null || month === undefined) return '-'
  return `${month}个月`
}

function verificationMethodName(value?: string) {
  const map: Record<string, string> = {
    self: '自检',
    self_check: '自检',
    internal: '自检',
    send_out: '外委',
    external: '外委',
    external_commission: '外委'
  }
  return value ? map[value] || value : '-'
}

function isCommonName(value?: number) {
  if (value === 1) return '是'
  if (value === 0) return '否'
  return '-'
}

function resultName(value?: string) {
  const map: Record<string, string> = {
    qualified: '合格',
    unqualified: '不合格',
    repair: '维修',
    scrap: '报废'
  }
  return value ? map[value] || value : '-'
}

/**
 * 返回任务表格和详情回退使用的周检节点名称。
 *
 * @param value 周检节点编码。
 */
function nodeDisplayName(value?: string) {
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
    verifier_second_judge: '外委检定员二次判定',
    responsible_second_judge: '责任工程师二次判定',
    responsible_third_judge: '责任工程师三次判定',
    verifier_third_judge: '外委检定员三次判定',
    responsible_fourth_judge: '责任工程师四次判定',
    verifier_scrap_disposal: '外委检定员报废处置',
    manager_forward_confirm: '管理员转办确认员',
    confirmer_confirm: '确认员判定',
    exception_disposal: '异常处置',
    completed: '已完成'
  }
  return value ? map[value] || value : '-'
}

function statusDisplayName(value?: string) {
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

/**
 * 返回周检节点或任务状态对应的标签颜色。
 *
 * @param nodeOrStatus 节点编码或任务状态编码。
 */
export function periodicTagColor(nodeOrStatus?: string): PeriodicTagColor {
  const value = String(nodeOrStatus || '').toLowerCase()
  if (['exception_disposal', 'exception', 'rejected', 'cancelled'].includes(value)) return 'red'
  if (['completed'].includes(value)) return 'green'
  if (
    [
      'plan_confirm',
      'manager_forward_confirm',
      'confirmer_confirm',
      'verifier_second_judge',
      'responsible_second_judge',
      'responsible_third_judge',
      'verifier_third_judge',
      'responsible_fourth_judge',
      'verifier_scrap_disposal',
      'wait_confirm',
      'pending',
      'processing'
    ].includes(value)
  ) {
    return 'orange'
  }
  return 'blue'
}

function dualHandoverDisplayName(task: PeriodicTaskVO, role?: PeriodicTableRole) {
  if (!isDualHandoverTask(task)) return undefined
  if (role === 'admin') return '待异常分流'
  if (role === 'verifier') return '待扫码接收'
  return undefined
}

export function mapPeriodicTaskRow(task: PeriodicTaskVO, role?: PeriodicTableRole): PeriodicDisplayRowWithMeta {
  const currentNodeName = dualHandoverDisplayName(task, role) || (
    task.currentNode === 'exception_disposal' && task.exceptionFlowName
      ? task.exceptionFlowName
      : task.currentNodeName || nodeDisplayName(task.currentNode)
  )
  const taskStatusName = task.taskStatusName || statusDisplayName(task.taskStatus)
  return {
    taskId: task.id,
    taskNo: displayValue(task.taskNo),
    planId: task.planId || '',
    currentNode: displayValue(task.currentNode),
    currentNodeName,
    taskStatus: displayValue(task.taskStatus),
    taskStatusName,
    deviceCode: displayValue(task.deviceCode),
    deviceName: displayValue(task.deviceName),
    materialCode: displayValue(task.materialCode),
    materialName: displayValue(task.materialName),
    modelSpec: displayValue(task.modelSpec),
    factoryCode: displayValue(task.factoryCode),
    deptName: displayValue(task.deptName),
    manageCategory: displayValue(task.manageCategory),
    verificationCycle: verificationCycleName(task.verificationCycleMonth),
    validUntil: formatDate(task.validUntil),
    assignedVerifierName: displayValue(task.assignedVerifierName),
    measureManagerName: displayValue(task.measureManagerName),
    verificationMethod: displayValue(task.verificationMethod),
    verificationMethodName: verificationMethodName(task.verificationMethod),
    isCommonName: isCommonName(task.isCommon),
    manufacturer: displayValue(task.manufacturer),
    deviceStatusName: displayValue(task.deviceStatusName || task.deviceStatus),
    subjectCategory: displayValue(task.subjectCategory),
    responsibleEngineerName: displayValue(task.responsibleEngineerName),
    requiredFinishTime: formatDate(task.requiredFinishTime, 16),
    verificationTime: formatDate(task.verificationTime, 16),
    newValidUntil: formatDate(task.newValidUntil),
    result: resultName(task.result),
    remark: displayValue(task.remark),
    tagColor: periodicTagColor(task.currentNode || task.taskStatus)
  }
}

export function buildPeriodicPlanTodoGroups(tasks: PeriodicTaskVO[]): PeriodicPlanTodoGroup[] {
  const groups = new Map<string, PeriodicTaskVO[]>()
  tasks.forEach((task) => {
    const planId = task.planId !== undefined && task.planId !== null && task.planId !== ''
      ? String(task.planId)
      : `task-${task.id}`
    const planTasks = groups.get(planId) || []
    planTasks.push(task)
    groups.set(planId, planTasks)
  })
  return Array.from(groups.entries()).map(([planId, planTasks]) => ({
    planId,
    tasks: planTasks,
    deviceCount: planTasks.length
  }))
}

const adminColumns: PeriodicTableColumn[] = [
  { title: '当前状态', key: 'currentNodeName', dataIndex: 'currentNodeName', width: 130 },
  { title: '计量编号', key: 'deviceCode', dataIndex: 'deviceCode', width: 230 },
  { title: '设备名称', key: 'deviceName', dataIndex: 'deviceName', width: 170 },
  { title: '规格型号', key: 'modelSpec', dataIndex: 'modelSpec', width: 150 },
  { title: '出厂编号', key: 'factoryCode', dataIndex: 'factoryCode', width: 130 },
  { title: '使用部门', key: 'deptName', dataIndex: 'deptName', width: 150 },
  { title: '类别', key: 'manageCategory', dataIndex: 'manageCategory', width: 90 },
  { title: '检定周期', key: 'verificationCycle', dataIndex: 'verificationCycle', width: 110 },
  { title: '有效日期', key: 'validUntil', dataIndex: 'validUntil', width: 120 },
  { title: '计量检定员', key: 'assignedVerifierName', dataIndex: 'assignedVerifierName', width: 130 },
  { title: '检定方式', key: 'verificationMethodName', dataIndex: 'verificationMethodName', width: 110 }
]

const verifierColumns: PeriodicTableColumn[] = [
  { title: '当前状态', key: 'currentNodeName', dataIndex: 'currentNodeName', width: 130 },
  { title: '计量编号', key: 'deviceCode', dataIndex: 'deviceCode', width: 230 },
  { title: '设备名称', key: 'deviceName', dataIndex: 'deviceName', width: 170 },
  { title: '规格型号', key: 'modelSpec', dataIndex: 'modelSpec', width: 150 },
  { title: '出厂编号', key: 'factoryCode', dataIndex: 'factoryCode', width: 130 },
  { title: '使用部门', key: 'deptName', dataIndex: 'deptName', width: 150 },
  { title: '类别', key: 'manageCategory', dataIndex: 'manageCategory', width: 90 },
  { title: '检定周期', key: 'verificationCycle', dataIndex: 'verificationCycle', width: 110 },
  { title: '有效日期', key: 'validUntil', dataIndex: 'validUntil', width: 120 },
  { title: '计量管理员', key: 'measureManagerName', dataIndex: 'measureManagerName', width: 130 },
  { title: '检定方式', key: 'verificationMethodName', dataIndex: 'verificationMethodName', width: 110 },
  { title: '是否通用', key: 'isCommonName', dataIndex: 'isCommonName', width: 110 },
  { title: '操作', key: 'action', fixed: 'right', width: 92 }
]

export function getPeriodicTableColumns(role: PeriodicTableRole): PeriodicTableColumn[] {
  if (role === 'admin') return adminColumns
  return verifierColumns
}

export function rowKeyOf(row: Pick<PeriodicDisplayRow, 'taskId'>): EntityId {
  return row.taskId
}
