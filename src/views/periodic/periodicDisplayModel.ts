import type { EntityId, PeriodicDisplayRow, PeriodicTaskVO, PeriodicTodoPlanEntry } from '../../types/periodic'
import type { UnifiedScanInboxItem } from '../../types/scan'

export type PeriodicTableRole = 'admin' | 'verifier' | 'confirmer' | 'externalOperator'
export type PeriodicTagColor = 'blue' | 'cyan' | 'orange' | 'green' | 'red'
export type PeriodicTaskAction =
  | 'submit-exception'
  | 'scan-receive'
  | 'scan-send-out'
  | 'scan-send-out-return'
  | 'scan-take-back'
  | 'verify'
  | 'supplier-fill'
  | 'external-verify'
  | 'judgement'
  | 'scrap-disposal'
  | 'scrap-confirm'
  | 'scrap-tracking-decision'
  | 'manager-forward'
  | 'confirm'

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

export interface PeriodicPlanPickerItem {
  containerId: string
  containerNo: string
  totalItemCount: number
  myPendingItemCount: number
  myPendingActionCount: number
  currentNodeSummary: string
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

type PeriodicActionTask = Pick<PeriodicTaskVO, 'currentNode' | 'allowedActions' | 'physicalStatus' | 'scanAction'>

const periodicNodeActionMap: Readonly<Record<string, { code: string; action: PeriodicTaskAction }>> = {
  admin_exception_route: { code: 'SUBMIT_EXCEPTION', action: 'submit-exception' },
  self_verify: { code: 'SUBMIT', action: 'verify' },
  external_common_fill: { code: 'SUBMIT', action: 'supplier-fill' },
  verifier_second_judge: { code: 'JUDGE', action: 'judgement' },
  responsible_scrap_confirm: { code: 'APPROVE_REJECT', action: 'scrap-confirm' },
  responsible_scrap_tracking_decision: { code: 'JUDGE', action: 'scrap-tracking-decision' },
  responsible_second_judge: { code: 'JUDGE', action: 'judgement' },
  responsible_third_judge: { code: 'JUDGE', action: 'judgement' },
  verifier_third_judge: { code: 'JUDGE', action: 'judgement' },
  responsible_fourth_judge: { code: 'JUDGE', action: 'judgement' },
  verifier_scrap_disposal: { code: 'SUBMIT', action: 'scrap-disposal' },
  external_uncommon_fill: { code: 'SUBMIT', action: 'external-verify' },
  manager_forward_confirm: { code: 'SUBMIT', action: 'manager-forward' },
  confirmer_confirm: { code: 'APPROVE_REJECT', action: 'confirm' },
  admin_take_back: { code: 'TAKE_BACK', action: 'scan-take-back' }
}

const periodicScanActionMap: Readonly<Record<string, { code: string; action: PeriodicTaskAction }>> = {
  'periodic-verifier-receive': { code: 'RECEIVE', action: 'scan-receive' },
  'periodic-external-send-out': { code: 'SEND_OUT', action: 'scan-send-out' },
  'periodic-send-out-return': { code: 'SEND_OUT_RETURN', action: 'scan-send-out-return' },
  'periodic-manager-take-back': { code: 'TAKE_BACK', action: 'scan-take-back' }
}

const periodicPhysicalProjectionMap: Readonly<Record<string, {
  currentNode: NonNullable<PeriodicTaskVO['currentNode']>
  physicalStatus: string
  priority: number
}>> = {
  'periodic-verifier-receive': {
    currentNode: 'admin_exception_route',
    physicalStatus: 'wait_verifier_receive',
    priority: 1
  },
  'periodic-external-send-out': {
    currentNode: 'external_common_fill',
    physicalStatus: 'wait_external_receive',
    priority: 2
  },
  'periodic-send-out-return': {
    currentNode: 'external_uncommon_fill',
    physicalStatus: 'wait_sendout_return_receive',
    priority: 3
  },
  'periodic-manager-take-back': {
    currentNode: 'admin_take_back',
    physicalStatus: 'wait_manager_take_back',
    priority: 4
  }
}

function uniqueActionCodes(...groups: readonly (readonly string[] | undefined)[]) {
  return Array.from(new Set(
    groups.flatMap((actions) => actions || []).map((action) => String(action).toUpperCase())
  ))
}

function pendingPeriodicPhysicalProjection(row: UnifiedScanInboxItem) {
  if (String(row.businessType || '').toLowerCase() !== 'periodic' || row.scanned === true) return undefined
  const scanAction = String(row.scanAction || '')
  const action = periodicScanActionMap[scanAction]
  const projection = periodicPhysicalProjectionMap[scanAction]
  if (!action || !projection) return undefined
  const allowedActions = uniqueActionCodes(row.allowedActions)
  if (!allowedActions.includes(action.code)) return undefined
  return { scanAction, allowedActions, ...projection }
}

export function toPeriodicPhysicalTask(row: UnifiedScanInboxItem): PeriodicTaskVO | undefined {
  const projection = pendingPeriodicPhysicalProjection(row)
  const taskId = row.taskId ?? row.id
  if (!projection || taskId === undefined || taskId === null || taskId === '') return undefined
  return {
    id: taskId,
    planId: row.businessId,
    taskNo: row.taskNo || row.orderNo,
    currentNode: projection.currentNode,
    currentNodeName: row.currentNodeName,
    physicalStatus: projection.physicalStatus,
    physicalStatusName: row.currentNodeName,
    taskStatus: 'pending',
    allowedActions: projection.allowedActions,
    scanAction: projection.scanAction,
    isPhysicalScan: true,
    deviceCode: row.deviceCode || row.scanCode,
    deviceName: row.deviceName,
    materialCode: row.materialCode,
    deptName: row.useDeptName
  }
}

export function mergePeriodicTaskPhysicalActions(
  tasks: readonly PeriodicTaskVO[],
  scanRows: readonly UnifiedScanInboxItem[]
) {
  const mergedTasks: PeriodicTaskVO[] = tasks.map((task) => ({
    ...task,
    allowedActions: uniqueActionCodes(task.allowedActions)
  }))
  const taskIndex = new Map(mergedTasks.map((task, index) => [String(task.id), index]))

  scanRows.forEach((row) => {
    const physicalTask = toPeriodicPhysicalTask(row)
    if (!physicalTask) return
    const key = String(physicalTask.id)
    const existingIndex = taskIndex.get(key)
    if (existingIndex === undefined) {
      taskIndex.set(key, mergedTasks.length)
      mergedTasks.push(physicalTask)
      return
    }

    const existing = mergedTasks[existingIndex]
    if (!existing) return
    const existingPriority = periodicPhysicalProjectionMap[String(existing.scanAction || '')]?.priority || 0
    const physicalPriority = periodicPhysicalProjectionMap[String(physicalTask.scanAction || '')]?.priority || 0
    const activePhysicalTask = physicalPriority >= existingPriority ? physicalTask : existing
    mergedTasks[existingIndex] = {
      ...existing,
      planId: existing.planId ?? physicalTask.planId,
      taskNo: existing.taskNo ?? physicalTask.taskNo,
      physicalStatus: activePhysicalTask.physicalStatus,
      physicalStatusName: activePhysicalTask.physicalStatusName,
      scanAction: activePhysicalTask.scanAction,
      isPhysicalScan: true,
      allowedActions: uniqueActionCodes(existing.allowedActions, physicalTask.allowedActions),
      deviceCode: existing.deviceCode ?? physicalTask.deviceCode,
      deviceName: existing.deviceName ?? physicalTask.deviceName,
      materialCode: existing.materialCode ?? physicalTask.materialCode,
      deptName: existing.deptName ?? physicalTask.deptName
    }
  })

  return mergedTasks
}

export function resolvePeriodicTaskAction(task: PeriodicActionTask): PeriodicTaskAction | undefined {
  const allowed = new Set((task.allowedActions || []).map((action) => String(action).toUpperCase()))
  const scanMapping = periodicScanActionMap[String(task.scanAction || '')]
  if (scanMapping && allowed.has(scanMapping.code)) return scanMapping.action
  const mapping = periodicNodeActionMap[String(task.currentNode || '')]
  if (mapping && allowed.has(mapping.code)) return mapping.action
  return undefined
}

export function periodicScanRouteAction(action: PeriodicTaskAction) {
  const match = Object.entries(periodicScanActionMap)
    .find(([, config]) => config.action === action)
  return match?.[0]
}

export function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
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
    system_issue: '系统下发',
    admin_exception_route: '管理员异常分流',
    self_verify: '自检检定',
    responsible_scrap_confirm: '责任工程师确认正常报废',
    responsible_scrap_tracking_decision: '责任工程师判定是否进行不合格追踪',
    external_common_fill: '外扩账号填写通用设备检定信息',
    verifier_second_judge: '外委检定员二次判定',
    responsible_second_judge: '责任工程师二次判定',
    responsible_third_judge: '责任工程师三次判定',
    verifier_third_judge: '外委检定员三次判定',
    responsible_fourth_judge: '责任工程师四次判定',
    verifier_scrap_disposal: '外委检定员报废处置',
    external_uncommon_fill: '外委检定员填写否通用设备信息',
    manager_forward_confirm: '管理员转办确认员',
    confirmer_confirm: '确认员判定',
    admin_take_back: '管理员取回'
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

function physicalStatusDisplayName(value?: string) {
  const map: Record<string, string> = {
    wait_verifier_receive: '待接收',
    verifier_received: '检定员已接收',
    wait_external_receive: '待外扩接收',
    external_received: '外扩已接收',
    wait_sendout_return_receive: '待外委送回接收',
    sendout_return_received: '外委送回已接收',
    wait_manager_take_back: '待管理员取回',
    taken_back: '已取回'
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
  if (['verifier_scrap_disposal', 'exception', 'rejected', 'cancelled'].includes(value)) return 'red'
  if (['completed'].includes(value)) return 'green'
  if (
    [
      'admin_exception_route',
      'admin_take_back',
      'responsible_scrap_confirm',
      'responsible_scrap_tracking_decision',
      'external_common_fill',
      'external_uncommon_fill',
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

export function mapPeriodicTaskRow(task: PeriodicTaskVO, role?: PeriodicTableRole): PeriodicDisplayRowWithMeta {
  const physicalStatusName = task.physicalStatus === 'wait_verifier_receive'
    ? '待接收'
    : task.physicalStatusName || physicalStatusDisplayName(task.physicalStatus)
  const verifierHandover = role === 'verifier'
    && task.currentNode === 'admin_exception_route'
    && task.physicalStatus === 'wait_verifier_receive'
  const currentNodeName = verifierHandover
    ? physicalStatusName
    : task.currentNodeName || nodeDisplayName(task.currentNode)
  const taskStatusName = task.taskStatusName || statusDisplayName(task.taskStatus)
  return {
    taskId: task.id,
    taskNo: displayValue(task.taskNo),
    planId: task.planId || '',
    currentNode: displayValue(task.currentNode),
    currentNodeName,
    taskStatus: displayValue(task.taskStatus),
    taskStatusName,
    physicalStatus: displayValue(task.physicalStatus),
    physicalStatusName,
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

export function derivePeriodicPlanLabel(planId: string, tasks: PeriodicTaskVO[]) {
  const taskNo = tasks.find((task) => task.taskNo)?.taskNo?.trim()
  if (taskNo && taskNo.length > 4) {
    return taskNo.replace(/\d{4}$/, '') || taskNo
  }
  return planId.replace(/^task-/, '')
}

function periodicPlanNodeSummary(tasks: PeriodicTaskVO[]) {
  const nodes = Array.from(
    new Set(
      tasks
        .map((task) => task.currentNodeName || task.currentNode)
        .filter((value): value is string => Boolean(value))
    )
  )
  if (nodes.length === 0) return '-'
  return `${nodes.slice(0, 2).join(' / ')}${nodes.length > 2 ? ' 等' : ''}`
}

export function buildPeriodicPlanSubtitle(tasks: PeriodicTaskVO[]) {
  const deviceText = `共 ${tasks.length} 台设备`
  const nodeSummary = periodicPlanNodeSummary(tasks)
  return nodeSummary === '-' ? deviceText : `${deviceText} · ${nodeSummary}`
}

export function buildPeriodicPlanPickerItems(
  _tasks: PeriodicTaskVO[],
  todoPlans: readonly PeriodicTodoPlanEntry[]
): PeriodicPlanPickerItem[] {
  return todoPlans
    .filter((plan) => plan.containerId && Number(plan.myPendingItemCount) > 0)
    .map((plan) => {
      const containerId = String(plan.containerId)
      const nodeNames = plan.currentNodeSummary
        .map((node) => node.nodeName || node.nodeCode)
        .filter(Boolean)
      return {
        containerId,
        containerNo: plan.containerNo?.trim() || containerId,
        totalItemCount: Number(plan.totalItemCount),
        myPendingItemCount: Number(plan.myPendingItemCount),
        myPendingActionCount: Number(plan.myPendingActionCount),
        currentNodeSummary: nodeNames.length > 0 ? nodeNames.join(' / ') : '-'
      }
    })
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
  { title: '检定方式', key: 'verificationMethodName', dataIndex: 'verificationMethodName', width: 110 },
  { title: '操作', key: 'action', fixed: 'right', width: 92 }
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
