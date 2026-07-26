import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  getWorkflowTask,
  getWorkflowTimeline,
  queryWorkflowTasks
} from '@/api/workflow'
import type {
  BusinessType,
  WorkflowEntityId,
  WorkflowTask,
  WorkflowTaskPage,
  WorkflowTaskQuery,
  WorkflowTaskView,
  WorkflowTimelineEntry
} from '@/types/workflow'

export interface WorkflowTaskGateway {
  queryTasks: (query: WorkflowTaskQuery, signal?: AbortSignal) => Promise<WorkflowTaskPage>
  getTask: (taskId: WorkflowEntityId, signal?: AbortSignal) => Promise<WorkflowTask>
  getTimeline: (processInstanceId: WorkflowEntityId, signal?: AbortSignal) => Promise<WorkflowTimelineEntry[]>
}

export type WorkflowTaskViewRecords = Partial<Record<WorkflowTaskView, WorkflowTask[]>>

export interface WorkflowTaskContext {
  workflowTaskId: WorkflowEntityId
  processInstanceId: WorkflowEntityId
  rowVersion: WorkflowEntityId
  allowedActions: string[]
}

export type WorkflowBoundDetail<T extends object> = T & WorkflowTaskContext

export type WorkflowDetailLoader<T extends object> = (
  workflowTask: WorkflowTask,
  signal: AbortSignal
) => Promise<T>

export interface WorkflowTaskActionHooks {
  notifyAlreadyHandled: (notice: string, task: WorkflowTask) => void
  refresh: () => void | Promise<void>
}

export type WorkflowTaskActionResult<T> =
  | { status: 'completed'; value: T }
  | { status: 'already-handled'; task: WorkflowTask }

const defaultGateway: WorkflowTaskGateway = {
  queryTasks: queryWorkflowTasks,
  getTask: getWorkflowTask,
  getTimeline: getWorkflowTimeline
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function optionalEntityId(value: unknown): WorkflowEntityId | undefined {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined
}

/** Normalize the backend's flat timeline DTO without deriving domain state. */
export function mapWorkflowTimelineEntry(source: Record<string, unknown>): WorkflowTimelineEntry {
  const id = optionalEntityId(source.id)
  if (id === undefined) throw new Error('工作流轨迹缺少ID')

  return {
    id,
    taskId: optionalEntityId(source.taskId),
    businessItemId: optionalEntityId(source.businessItemId),
    eventKind: optionalString(source.eventKind),
    eventKindName: optionalString(source.eventKindName),
    nodeCode: optionalString(source.nodeCode),
    nodeName: optionalString(source.nodeName),
    actionCode: optionalString(source.actionCode),
    actionName: optionalString(source.actionName),
    nextNodeCode: optionalString(source.nextNodeCode),
    nextNodeName: optionalString(source.nextNodeName),
    operatorId: optionalString(source.operatorId),
    operatorName: optionalString(source.operatorName),
    opinion: optionalString(source.opinion),
    resultCode: optionalString(source.resultCode),
    resultName: optionalString(source.resultName),
    snapshotJson: optionalString(source.snapshotJson),
    operatedAt: optionalString(source.operatedAt)
  }
}

/** Backend-provided allowedActions is the only authority for task buttons. */
export function hasWorkflowAction(task: { allowedActions?: readonly string[] } | null | undefined, action: string) {
  return Boolean(task?.allowedActions?.includes(action))
}

export function bindWorkflowTask<T extends object>(detail: T, workflowTask: WorkflowTask): WorkflowBoundDetail<T> {
  return {
    ...detail,
    currentNode: workflowTask.currentNodeCode || workflowTask.nodeCode,
    currentNodeName: workflowTask.currentNodeName || workflowTask.nodeName,
    workflowTaskId: workflowTask.taskId,
    processInstanceId: workflowTask.processInstanceId,
    rowVersion: workflowTask.rowVersion,
    allowedActions: [...workflowTask.allowedActions]
  }
}

export function isTaskAlreadyHandledError(error: unknown) {
  if (typeof error !== 'object' || error === null) return false
  const candidate = error as { code?: unknown; message?: unknown }
  return candidate.code === 409 && String(candidate.message || '').includes('TASK_ALREADY_HANDLED')
}

function handlerLabel(task: WorkflowTask) {
  if (task.handlerName && task.handlerId) return `${task.handlerName}（${task.handlerId}）`
  return task.handlerName || task.handlerId || '其他处理人'
}

export function createWorkflowTaskCoordinator(gateway: WorkflowTaskGateway = defaultGateway) {
  let viewGeneration = 0
  let viewController: AbortController | undefined
  let timelineGeneration = 0
  let timelineController: AbortController | undefined
  let detailGeneration = 0
  let detailController: AbortController | undefined

  function cancelViews() {
    viewGeneration += 1
    viewController?.abort()
    viewController = undefined
  }

  async function loadViews(
    identityKey: string,
    views: WorkflowTaskView[],
    businessType?: BusinessType
  ): Promise<WorkflowTaskViewRecords | null> {
    cancelViews()
    detailGeneration += 1
    detailController?.abort()
    detailController = undefined
    if (!identityKey) return {}

    const generation = viewGeneration
    const controller = new AbortController()
    viewController = controller

    try {
      const pages = await Promise.all(
        views.map((view) => gateway.queryTasks({ view, businessType, current: 1, size: 200 }, controller.signal))
      )
      if (generation !== viewGeneration || controller.signal.aborted) return null

      return views.reduce<WorkflowTaskViewRecords>((records, view, index) => {
        records[view] = pages[index]?.records || []
        return records
      }, {})
    } catch (error) {
      if (generation !== viewGeneration || controller.signal.aborted) return null
      throw error
    } finally {
      if (generation === viewGeneration) viewController = undefined
    }
  }

  async function loadTimeline(processInstanceId: WorkflowEntityId) {
    timelineGeneration += 1
    timelineController?.abort()
    const generation = timelineGeneration
    const controller = new AbortController()
    timelineController = controller

    try {
      const entries = await gateway.getTimeline(processInstanceId, controller.signal)
      if (generation !== timelineGeneration || controller.signal.aborted) return null
      return entries.map((entry) => mapWorkflowTimelineEntry(entry as unknown as Record<string, unknown>))
    } catch (error) {
      if (generation !== timelineGeneration || controller.signal.aborted) return null
      throw error
    } finally {
      if (generation === timelineGeneration) timelineController = undefined
    }
  }

  async function loadDetails<T extends object>(
    tasks: WorkflowTask[],
    loader: WorkflowDetailLoader<T>
  ): Promise<Array<WorkflowBoundDetail<T>> | null> {
    detailGeneration += 1
    detailController?.abort()
    const generation = detailGeneration
    const controller = new AbortController()
    detailController = controller

    try {
      const results = await Promise.allSettled(
        tasks.map(async (task) => bindWorkflowTask(await loader(task, controller.signal), task))
      )
      if (generation !== detailGeneration || controller.signal.aborted) return null
      return results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
    } finally {
      if (generation === detailGeneration) detailController = undefined
    }
  }

  async function executeTaskAction<T>(
    taskId: WorkflowEntityId,
    action: () => Promise<T>,
    hooks: WorkflowTaskActionHooks
  ): Promise<WorkflowTaskActionResult<T>> {
    try {
      return { status: 'completed', value: await action() }
    } catch (error) {
      if (!isTaskAlreadyHandledError(error)) throw error
      const task = await gateway.getTask(taskId)
      hooks.notifyAlreadyHandled(`该任务已由${handlerLabel(task)}处理，列表已刷新`, task)
      await hooks.refresh()
      return { status: 'already-handled', task }
    }
  }

  function cancel() {
    cancelViews()
    timelineGeneration += 1
    timelineController?.abort()
    timelineController = undefined
    detailGeneration += 1
    detailController?.abort()
    detailController = undefined
  }

  return { loadViews, loadTimeline, loadDetails, executeTaskAction, cancel }
}

export interface UseWorkflowTaskOptions {
  identityKey: MaybeRefOrGetter<string | undefined>
  businessType?: MaybeRefOrGetter<BusinessType | undefined>
  views?: WorkflowTaskView[]
  immediate?: boolean
  gateway?: WorkflowTaskGateway
}

export function useWorkflowTask(options: UseWorkflowTaskOptions) {
  const views = options.views || ['todo', 'handled', 'participated']
  const coordinator = createWorkflowTaskCoordinator(options.gateway)
  const todoTasks = ref<WorkflowTask[]>([])
  const handledTasks = ref<WorkflowTask[]>([])
  const participatedTasks = ref<WorkflowTask[]>([])
  const departmentTasks = ref<WorkflowTask[]>([])
  const timeline = ref<WorkflowTimelineEntry[]>([])
  const loading = ref(false)
  const timelineLoading = ref(false)
  const error = ref<unknown>()
  let refreshGeneration = 0

  const identityKey = computed(() => toValue(options.identityKey) || '')
  const businessType = computed(() => options.businessType === undefined ? undefined : toValue(options.businessType))

  async function refresh() {
    const generation = ++refreshGeneration
    loading.value = true
    error.value = undefined
    try {
      const records = await coordinator.loadViews(identityKey.value, views, businessType.value)
      if (!records || generation !== refreshGeneration) return
      todoTasks.value = records.todo || []
      handledTasks.value = records.handled || []
      participatedTasks.value = records.participated || []
      departmentTasks.value = records.department || []
    } catch (cause) {
      if (generation !== refreshGeneration) return
      error.value = cause
      throw cause
    } finally {
      if (generation === refreshGeneration) loading.value = false
    }
  }

  async function loadTimeline(processInstanceId: WorkflowEntityId) {
    timelineLoading.value = true
    try {
      const entries = await coordinator.loadTimeline(processInstanceId)
      if (entries) timeline.value = entries
      return entries
    } finally {
      timelineLoading.value = false
    }
  }

  watch(
    [identityKey, businessType],
    () => {
      coordinator.cancel()
      todoTasks.value = []
      handledTasks.value = []
      participatedTasks.value = []
      departmentTasks.value = []
      timeline.value = []
      if (options.immediate !== false) void refresh().catch(() => undefined)
    },
    { immediate: true }
  )

  onScopeDispose(() => coordinator.cancel())

  return {
    todoTasks,
    handledTasks,
    participatedTasks,
    departmentTasks,
    timeline,
    loading,
    timelineLoading,
    error,
    refresh,
    loadTimeline,
    loadDetails: coordinator.loadDetails,
    executeTaskAction: coordinator.executeTaskAction,
    cancel: coordinator.cancel
  }
}
