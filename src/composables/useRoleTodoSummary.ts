import { computed, onScopeDispose, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { getWorkflowTodoSummary } from '@/api/workflow'
import { useTodoNotificationStore } from '@/stores/todoNotification'
import type { FlowSummary } from '@/types/flowSummary'
import type { WorkflowTodoSummaryQuery } from '@/types/workflow'

export interface UseRoleTodoSummaryOptions {
  identityKey: MaybeRefOrGetter<string | undefined>
  query: MaybeRefOrGetter<WorkflowTodoSummaryQuery | undefined>
  immediate?: boolean
}

/**
 * 加载当前人员、激活角色和入口范围对应的权威待办汇总。
 *
 * 身份或范围变化会取消旧请求，防止旧角色响应覆盖新角色页面。
 */
export function useRoleTodoSummary(options: UseRoleTodoSummaryOptions) {
  const todoNotifications = useTodoNotificationStore()
  const summary = ref<FlowSummary | null>(null)
  const loading = ref(false)
  const error = ref<unknown>()
  const identityKey = computed(() => (toValue(options.identityKey) || '').trim())
  const query = computed<WorkflowTodoSummaryQuery>(() => toValue(options.query) || {})

  let controller: AbortController | undefined
  let generation = 0

  async function refresh(): Promise<FlowSummary | undefined> {
    const requestGeneration = ++generation
    controller?.abort()
    controller = undefined
    if (!identityKey.value) {
      summary.value = null
      error.value = undefined
      loading.value = false
      return undefined
    }

    const activeController = new AbortController()
    controller = activeController
    loading.value = true
    error.value = undefined
    try {
      const result = await getWorkflowTodoSummary(query.value, activeController.signal)
      if (requestGeneration !== generation || activeController.signal.aborted) return undefined
      summary.value = result
      return result
    } catch (cause) {
      if (requestGeneration !== generation || activeController.signal.aborted) return undefined
      error.value = cause
      throw cause
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
    [identityKey, query],
    () => {
      cancel()
      summary.value = null
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

  return { summary, loading, error, refresh, cancel }
}
