import { computed, onScopeDispose, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { WorkflowTask, WorkflowTodoContainer } from '@/types/workflow'

export interface WorkspaceTodoTaskSnapshot {
  todoTasks: WorkflowTask[]
  handledTasks: WorkflowTask[]
}

/** 工作台同一加载代次内提交的任务、容器和详情快照。 */
export interface WorkspaceTodoLoadSnapshot<TDetail extends object = object> {
  todoTasks: WorkflowTask[]
  handledTasks: WorkflowTask[]
  todoContainers: WorkflowTodoContainer[]
  todoContainerLoadFailed: boolean
  workflowLoadFailed: boolean
  details: TDetail[]
}

/** 工作台加载器依赖的权威任务、容器和业务详情查询边界。 */
export interface WorkspaceTodoLoadDependencies<TDetail extends object = object> {
  loadTasks: (identityKey: string, signal: AbortSignal) => Promise<WorkspaceTodoTaskSnapshot>
  loadContainers: (identityKey: string, signal: AbortSignal) => Promise<WorkflowTodoContainer[]>
  loadDetails: (identityKey: string, tasks: WorkflowTask[], signal: AbortSignal) => Promise<TDetail[] | null>
}

/** 工作台加载器的身份、失效版本和依赖配置。 */
export interface UseWorkspaceTodoLoadOptions<TDetail extends object = object> {
  identityKey: MaybeRefOrGetter<string | undefined>
  invalidationVersion: MaybeRefOrGetter<number>
  dependencies: WorkspaceTodoLoadDependencies<TDetail>
  immediate?: boolean
}

/**
 * 统一管理工作台最新投影代次。
 *
 * 同一角色身份发出的任务、容器和详情请求绑定同一代次，角色切换或消息失效后返回的旧响应不得覆盖当前页面。
 */
export function useWorkspaceTodoLoad<TDetail extends object = object>(
  options: UseWorkspaceTodoLoadOptions<TDetail>
) {
  const identityKey = computed(() => (toValue(options.identityKey) || '').trim())
  const invalidationVersion = computed(() => toValue(options.invalidationVersion))
  const snapshot = shallowRef<WorkspaceTodoLoadSnapshot<TDetail> | null>(null)
  const loading = ref(false)
  const error = ref<unknown>()

  let generation = 0
  let controller: AbortController | undefined

  function isCurrent(requestGeneration: number, requestedIdentity: string, activeController: AbortController) {
    return requestGeneration === generation
      && requestedIdentity === identityKey.value
      && !activeController.signal.aborted
  }

  async function refresh() {
    const requestedIdentity = identityKey.value
    const requestGeneration = ++generation
    controller?.abort()
    controller = undefined

    if (!requestedIdentity) {
      snapshot.value = null
      error.value = undefined
      loading.value = false
      return undefined
    }

    const activeController = new AbortController()
    controller = activeController
    loading.value = true
    error.value = undefined

    try {
      const [taskResult, containerResult] = await Promise.allSettled([
        options.dependencies.loadTasks(requestedIdentity, activeController.signal),
        options.dependencies.loadContainers(requestedIdentity, activeController.signal)
      ])

      if (!isCurrent(requestGeneration, requestedIdentity, activeController)) return undefined

      const taskSnapshot = taskResult.status === 'fulfilled'
        ? taskResult.value
        : { todoTasks: [], handledTasks: [] }
      const allTasks = [...taskSnapshot.todoTasks, ...taskSnapshot.handledTasks]
      let details: TDetail[] = []

      if (taskResult.status === 'fulfilled') {
        try {
          details = await options.dependencies.loadDetails(
            requestedIdentity,
            allTasks,
            activeController.signal
          ) || []
        } catch (cause) {
          if (!isCurrent(requestGeneration, requestedIdentity, activeController)) return undefined
          error.value = cause
          throw cause
        }
        if (!isCurrent(requestGeneration, requestedIdentity, activeController)) return undefined
      }

      const result: WorkspaceTodoLoadSnapshot<TDetail> = {
        todoTasks: taskSnapshot.todoTasks,
        handledTasks: taskSnapshot.handledTasks,
        todoContainers: containerResult.status === 'fulfilled' ? containerResult.value : [],
        todoContainerLoadFailed: containerResult.status === 'rejected',
        workflowLoadFailed: taskResult.status === 'rejected',
        details
      }
      snapshot.value = result
      return result
    } finally {
      if (requestGeneration === generation) {
        loading.value = false
        controller = undefined
      }
    }
  }

  function cancel() {
    generation += 1
    controller?.abort()
    controller = undefined
    loading.value = false
  }

  watch(
    identityKey,
    () => {
      cancel()
      snapshot.value = null
      error.value = undefined
      if (options.immediate !== false) void refresh().catch(() => undefined)
    },
    { immediate: true }
  )

  watch(invalidationVersion, (version, previousVersion) => {
    if (version === previousVersion || !identityKey.value) return
    void refresh().catch(() => undefined)
  })

  onScopeDispose(cancel)

  return { snapshot, loading, error, refresh, cancel }
}
