import type { ChangeType } from '../../types/change'
import type {
  EntityId,
  PeriodicExceptionChangeItem,
  PeriodicExceptionChangeSubmitRequest,
  PeriodicTaskVO
} from '../../types/periodic'

export type PeriodicExceptionAction = 'seal' | 'defer' | 'scrap' | 'category' | 'cycle'
export type PeriodicExceptionHandlingType = 'seal' | 'defer' | 'scrap' | 'change'

export interface PeriodicExceptionActionMeta {
  value: PeriodicExceptionAction
  label: string
  title: string
  sectionTitle: string
}

export interface PeriodicExceptionFormState {
  actionType: PeriodicExceptionAction
  attachmentGroupId?: EntityId
  sealReason?: string
  deferReason?: string
  scrapType?: string
  scrapReason?: string
  newCycleMonth?: number
  adjustmentReason?: string
  remark?: string
}

export interface PeriodicExceptionApplicant {
  employeeId?: string
  employeeName?: string
  deptId?: string
  deptName?: string
}

export const periodicExceptionActionMetas: PeriodicExceptionActionMeta[] = [
  { value: 'seal', label: '封存', title: '测量设备封存申请', sectionTitle: '封存' },
  { value: 'defer', label: '缓检', title: '测量设备缓检', sectionTitle: '缓检信息' },
  { value: 'scrap', label: '非正常报废', title: '测量设备报废申请', sectionTitle: '非正常报废' },
  { value: 'category', label: '管理类别调整', title: '管理类别调整申请', sectionTitle: '管理类别调整' },
  { value: 'cycle', label: '检定周期调整', title: '检定周期调整申请', sectionTitle: '检定周期调整' }
]

export function periodicExceptionHandlingType(action: PeriodicExceptionAction): PeriodicExceptionHandlingType {
  if (action === 'category' || action === 'cycle') return 'change'
  return action
}

export function periodicExceptionActionMeta(action?: string) {
  return periodicExceptionActionMetas.find((item) => item.value === action) || periodicExceptionActionMetas[0]
}

export function normalizeCategoryCode(value?: string) {
  if (!value) return undefined
  if (value.includes('A')) return 'A'
  if (value.includes('B')) return 'B'
  if (value.includes('C')) return 'C'
  return value
}

export function displayCategory(value?: string) {
  const normalized = normalizeCategoryCode(value)
  return normalized ? `${normalized}类` : '-'
}

type PeriodicCycleTask = Pick<PeriodicTaskVO, 'verificationCycleMonth'>

export function maxPeriodicVerificationCycleMonth(tasks: PeriodicCycleTask[]) {
  if (tasks.length === 0) return undefined
  const cycles = tasks.map((task) => Number(task.verificationCycleMonth))
  if (cycles.some((cycle) => !Number.isFinite(cycle) || cycle <= 0)) return undefined
  return Math.max(...cycles)
}

export function periodicCycleExtensionOptions<T extends { value: number | string }>(
  options: T[],
  tasks: PeriodicCycleTask[]
) {
  const currentMaxCycle = maxPeriodicVerificationCycleMonth(tasks)
  if (currentMaxCycle === undefined) return []
  return options.filter((option) => Number(option.value) > currentMaxCycle)
}

function requiredText(value: unknown, fieldName: string) {
  const text = value === undefined || value === null ? '' : String(value).trim()
  if (!text) {
    throw new Error(`${fieldName}不能为空`)
  }
  return text
}

function requireTaskDevice(task: PeriodicTaskVO) {
  if (!task.deviceId) {
    throw new Error('周检任务缺少设备ID，不能发起状态变更')
  }
  return task.deviceId
}

function requireWorkflowIdentity(task: PeriodicTaskVO) {
  if (task.workflowTaskId === undefined || task.rowVersion === undefined) {
    throw new Error(`设备${task.deviceCode || '-'}的统一任务上下文已失效，请刷新待办`)
  }
  return {
    periodicTaskId: task.id,
    taskId: task.workflowTaskId,
    rowVersion: task.rowVersion
  }
}

function sourceIdOf(tasks: PeriodicTaskVO[]): EntityId {
  const first = tasks[0]
  return first.planId || first.id
}

function changeTypeOf(action: PeriodicExceptionAction): ChangeType {
  if (action === 'defer') return 'precheck'
  if (action === 'category') return 'category'
  if (action === 'cycle') return 'cycle'
  return action
}

function primaryReason(form: PeriodicExceptionFormState) {
  if (form.actionType === 'seal') return requiredText(form.sealReason, '封存原因')
  if (form.actionType === 'defer') return requiredText(form.deferReason, '缓检原因')
  if (form.actionType === 'scrap') return requiredText(form.scrapReason, '报废原因')
  if (form.actionType === 'category') return requiredText(form.adjustmentReason, '调整原因')
  if (form.actionType === 'cycle') return requiredText(form.adjustmentReason, '调整原因')
  return ''
}

export function buildPeriodicExceptionChangeRequest(
  taskOrTasks: PeriodicTaskVO | PeriodicTaskVO[],
  applicant: PeriodicExceptionApplicant | undefined,
  form: PeriodicExceptionFormState
): PeriodicExceptionChangeSubmitRequest {
  const reason = primaryReason(form)
  const tasks = Array.isArray(taskOrTasks) ? taskOrTasks : [taskOrTasks]
  if (tasks.length === 0) throw new Error('请选择周检异常设备')
  const targetCycleMonth = form.actionType === 'cycle'
    ? Number(requiredText(form.newCycleMonth, '调整后检定周期'))
    : undefined

  const items = tasks.map((task) => {
    const item: PeriodicExceptionChangeItem = {
      ...requireWorkflowIdentity(task),
      deviceId: requireTaskDevice(task),
      deviceCode: task.deviceCode,
      remark: [
        `设备编号:${task.deviceCode || '-'}`,
        `设备名称:${task.deviceName || '-'}`,
        `规格型号:${task.modelSpec || '-'}`,
        `使用部门:${task.deptName || '-'}`,
        `出厂编号:${task.factoryCode || '-'}`
      ].join('；')
    }

    if (form.actionType === 'seal') {
      Object.assign(item, {
        newStatus: 'sealed',
        sealReason: reason
      })
    }
    if (form.actionType === 'defer') {
      Object.assign(item, {
        verificationReason: reason,
        precheckRequired: 1
      })
    }
    if (form.actionType === 'scrap') {
      Object.assign(item, {
        newStatus: 'scrapped',
        scrapType: form.scrapType || 'damaged',
        scrapReason: reason
      })
    }
    if (form.actionType === 'category') {
      if (normalizeCategoryCode(task.manageCategory) === 'C') {
        throw new Error('C类设备不能再次发起周检管理类别调整')
      }
      Object.assign(item, {
        newCategory: 'C',
        adjustmentReason: reason
      })
    }
    if (form.actionType === 'cycle') {
      const currentCycleMonth = Number(task.verificationCycleMonth)
      if (!Number.isFinite(currentCycleMonth) || currentCycleMonth <= 0) {
        throw new Error(`设备${task.deviceCode || '-'}缺少有效的当前检定周期`)
      }
      if (!Number.isFinite(targetCycleMonth) || Number(targetCycleMonth) <= currentCycleMonth) {
        throw new Error(`设备${task.deviceCode || '-'}的调整后检定周期必须大于当前检定周期`)
      }
      Object.assign(item, {
        newCycleMonth: targetCycleMonth,
        adjustmentReason: reason
      })
    }

    return item
  })

  return {
    changeType: changeTypeOf(form.actionType),
    applyDeptId: applicant?.deptId || tasks[0].deptId,
    applyDeptName: applicant?.deptName || tasks[0].deptName,
    reason,
    sourceType: 'periodic',
    sourceId: sourceIdOf(tasks),
    remark: form.remark,
    attachmentGroupId: form.attachmentGroupId,
    items
  }
}
