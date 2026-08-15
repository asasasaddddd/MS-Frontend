import { computed, onScopeDispose, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { getWorkflowTodoDashboard } from '@/api/workflow'
import { useTodoNotificationStore } from '@/stores/todoNotification'
import type {
  WorkflowTodoDashboard,
  WorkflowTodoSummaryQuery
} from '@/types/workflow'
import { validateWorkspaceTodoDashboard } from '@/views/workspaceTodoDashboardModel'
import type { WorkspaceTodoType } from '@/views/workspaceTodoModel'

export interface UseRoleTodoDashboardOptions {
  identityKey: MaybeRefOrGetter<string | undefined>
  query: MaybeRefOrGetter<WorkflowTodoSummaryQuery | undefined>
  selectedType: MaybeRefOrGetter<WorkspaceTodoType>
  immediate?: boolean
  loadDashboard?: (
    identityKey: string,
    query: WorkflowTodoSummaryQuery,
    signal: AbortSignal
  ) => Promise<WorkflowTodoDashboard>
}

export function useRoleTodoDashboard(options: UseRoleTodoDashboardOptions) {
  const todoNotifications = useTodoNotificationStore()
  const dashboard = ref<WorkflowTodoDashboard | null>(null)
  const loading = ref(false)
  const error = ref<unknown>()
  const identityKey = computed(() => (toValue(options.identityKey) || '').trim())
  const query = computed<WorkflowTodoSummaryQuery>(() => toValue(options.query) || {})
  const selectedType = computed<WorkspaceTodoType>(() => toValue(options.selectedType))

  let controller: AbortController | undefined
  let generation = 0

  async function refresh(): Promise<WorkflowTodoDashboard | undefined> {
    const requestedIdentity = identityKey.value
    const requestedType = selectedType.value
    const requestedQuery = { ...query.value }
    const requestGeneration = ++generation
    controller?.abort()
    controller = undefined
    if (!requestedIdentity) {
      dashboard.value = null
      error.value = undefined
      loading.value = false
      return undefined
    }

    const activeController = new AbortController()
    controller = activeController
    loading.value = true
    error.value = undefined
    try {
      const result = await (options.loadDashboard
        ? options.loadDashboard(requestedIdentity, requestedQuery, activeController.signal)
        : getWorkflowTodoDashboard(requestedQuery, activeController.signal))
      if (
        requestGeneration !== generation
        || requestedIdentity !== identityKey.value
        || requestedType !== selectedType.value
        || activeController.signal.aborted
      ) return undefined
      validateWorkspaceTodoDashboard(result, requestedType)
      dashboard.value = result
      return result
    } catch (cause) {
      if (
        requestGeneration !== generation
        || requestedIdentity !== identityKey.value
        || requestedType !== selectedType.value
        || activeController.signal.aborted
      ) return undefined
      dashboard.value = null
      error.value = cause
      throw cause
    } finally {
      if (requestGeneration === generation && requestedIdentity === identityKey.value) {
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
    [identityKey, query, selectedType],
    () => {
      cancel()
      dashboard.value = null
      error.value = undefined
      if (options.immediate !== false) void refresh().catch(() => undefined)
    },
    { immediate: true, deep: true }
  )

  watch(
    () => todoNotifications.invalidationVersion,
    (version, previousVersion) => {
      if (version === previousVersion || !identityKey.value) return
      void refresh().catch(() => undefined)
    }
  )

  onScopeDispose(cancel)

  return { dashboard, loading, error, refresh, cancel }
}
