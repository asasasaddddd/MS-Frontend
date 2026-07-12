import type { SamplingDisplayRow, SamplingEntityId, SamplingPlanVO, SamplingTaskVO } from '@/types/sampling'

export type SamplingTableRole = 'admin' | 'verifier' | 'confirmer'
export type SamplingTagColor = 'blue' | 'cyan' | 'orange' | 'green' | 'red'

export interface SamplingTableColumn {
  title: string
  key: keyof SamplingDisplayRow | 'action'
  dataIndex?: keyof SamplingDisplayRow
  width?: number
  fixed?: 'left' | 'right'
}

export interface SamplingPlanMetric {
  key: string
  label: string
  value: number
  color: SamplingTagColor
}

export interface SamplingPlanSummary {
  planNo: string
  deviceCount: number
  completedCount: number
  statusChangeCount: number
  metrics: SamplingPlanMetric[]
}

export type SamplingDisplayRowWithMeta = SamplingDisplayRow & {
  tagColor: SamplingTagColor
}

export function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export function formatDate(value: unknown, length = 10) {
  const text = display(value)
  if (text === '-') return text
  return text.replace('T', ' ').slice(0, length)
}

export function samplingNodeName(value?: string) {
  const map: Record<string, string> = {
    admin_confirm: '管理员清点',
    verifier_verify: '检定员检定',
    confirmer_confirm: '确认员判定',
    completed: '已完成'
  }
  return value ? map[value] || value : '-'
}

export function samplingStatusName(value?: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    rejected: '已驳回',
    cancelled: '已取消'
  }
  return value ? map[value] || value : '-'
}

export function samplingMethodName(value?: string) {
  const map: Record<string, string> = {
    self: '自检',
    self_check: '自检',
    internal: '自检'
  }
  return value ? map[value] || value : '-'
}

export function samplingCommonName(value?: number) {
  if (value === 1) return '是'
  if (value === 0) return '否'
  return '-'
}

export function samplingResultName(value?: string) {
  const map: Record<string, string> = {
    qualified: '合格',
    unqualified: '不合格',
    repair: '维修',
    scrap: '报废',
    seal: '封存',
    missing: '未找到',
    abnormal_scrap: '非正常报废'
  }
  return value ? map[value] || value : '-'
}

export function samplingTagColor(nodeOrStatus?: string): SamplingTagColor {
  const value = String(nodeOrStatus || '').toLowerCase()
  if (['rejected', 'cancelled', 'missing', 'scrap', 'abnormal_scrap'].includes(value)) return 'red'
  if (['completed'].includes(value)) return 'green'
  if (['admin_confirm', 'confirmer_confirm', 'pending', 'processing'].includes(value)) return 'orange'
  return 'blue'
}

export function mapSamplingTaskRow(task: SamplingTaskVO): SamplingDisplayRowWithMeta {
  return {
    taskId: task.id,
    planId: task.planId || '',
    taskNo: display(task.taskNo),
    planNo: display(task.planNo),
    currentNode: display(task.currentNode),
    currentNodeName: samplingNodeName(task.currentNode),
    taskStatus: display(task.taskStatus),
    taskStatusName: samplingStatusName(task.taskStatus),
    deviceCode: display(task.deviceCode),
    deviceName: display(task.deviceName),
    modelSpec: display(task.modelSpec),
    factoryCode: display(task.factoryCode),
    deptName: display(task.deptName),
    manageCategory: display(task.manageCategory),
    verificationDate: formatDate(task.verificationDate),
    verificationMethod: display(task.verificationMethod),
    verificationMethodName: samplingMethodName(task.verificationMethod),
    isCommonName: samplingCommonName(task.isCommon),
    assignedVerifierName: display(task.assignedVerifierName),
    confirmerName: display(task.confirmerName),
    resultName: samplingResultName(task.result),
    validUntil: formatDate(task.validUntil),
    remark: display(task.remark),
    tagColor: samplingTagColor(task.currentNode || task.taskStatus)
  }
}

function countTasks(tasks: SamplingTaskVO[], matcher: (task: SamplingTaskVO) => boolean) {
  return tasks.filter(matcher).length
}

function nodeIn(task: SamplingTaskVO, nodes: string[]) {
  return nodes.includes(String(task.currentNode || ''))
}

export function buildSamplingPlanSummary(plan: SamplingPlanVO | null | undefined, tasks: SamplingTaskVO[]): SamplingPlanSummary {
  const statusChangeCount = countTasks(tasks, (task) => task.taskStatus === 'rejected')
  return {
    planNo: display(plan?.planNo || tasks.find((task) => task.planNo)?.planNo),
    deviceCount: plan?.deviceCount ?? tasks.length,
    completedCount: plan?.completedCount ?? countTasks(tasks, (task) => task.taskStatus === 'completed'),
    statusChangeCount,
    metrics: [
      { key: 'admin', label: '待管理员清点', value: countTasks(tasks, (task) => nodeIn(task, ['admin_confirm'])), color: 'orange' },
      { key: 'verifier', label: '待检定', value: countTasks(tasks, (task) => nodeIn(task, ['verifier_verify'])), color: 'blue' },
      { key: 'confirmer', label: '待确认', value: countTasks(tasks, (task) => nodeIn(task, ['confirmer_confirm'])), color: 'orange' },
      { key: 'labelPending', label: '待打印标签', value: countTasks(tasks, (task) => task.labelStatus === 'pending'), color: 'cyan' },
      { key: 'done', label: '已完成', value: countTasks(tasks, (task) => task.taskStatus === 'completed'), color: 'green' },
      { key: 'exception', label: '状态变更', value: statusChangeCount, color: 'red' }
    ]
  }
}

const baseColumns: SamplingTableColumn[] = [
  { title: '当前节点', key: 'currentNodeName', dataIndex: 'currentNodeName', width: 130 },
  { title: '计量编号', key: 'deviceCode', dataIndex: 'deviceCode', width: 160 },
  { title: '设备名称', key: 'deviceName', dataIndex: 'deviceName', width: 170 },
  { title: '规格型号', key: 'modelSpec', dataIndex: 'modelSpec', width: 150 },
  { title: '出厂编号', key: 'factoryCode', dataIndex: 'factoryCode', width: 130 },
  { title: '使用部门', key: 'deptName', dataIndex: 'deptName', width: 150 },
  { title: '类别', key: 'manageCategory', dataIndex: 'manageCategory', width: 90 },
  { title: '检定日期', key: 'verificationDate', dataIndex: 'verificationDate', width: 120 },
  { title: '检定方式', key: 'verificationMethodName', dataIndex: 'verificationMethodName', width: 110 },
  { title: '是否通用设备', key: 'isCommonName', dataIndex: 'isCommonName', width: 120 }
]

export function getSamplingTableColumns(role: SamplingTableRole): SamplingTableColumn[] {
  if (role === 'admin') return baseColumns
  return [...baseColumns, { title: '操作', key: 'action', fixed: 'right', width: 96 }]
}

export function rowKeyOf(row: Pick<SamplingDisplayRow, 'taskId'>): SamplingEntityId {
  return row.taskId
}
