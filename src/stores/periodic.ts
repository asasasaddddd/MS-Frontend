import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getPeriodicTask } from '@/api/periodic'
import type { EntityId, PeriodicTaskVO } from '@/types/periodic'

export const usePeriodicStore = defineStore('periodic', () => {
  const loading = ref(false)
  const currentTask = ref<PeriodicTaskVO | null>(null)

  async function withLoading<T>(action: () => Promise<T>) {
    loading.value = true
    try {
      return await action()
    } finally {
      loading.value = false
    }
  }

  function setCurrentTask(task: PeriodicTaskVO | null) {
    currentTask.value = task
  }

  async function fetchTask(periodicTaskId: EntityId, workflowTaskId: EntityId) {
    currentTask.value = await withLoading(() => getPeriodicTask(periodicTaskId, workflowTaskId))
    return currentTask.value
  }

  function reset() {
    currentTask.value = null
  }

  return {
    loading,
    currentTask,
    setCurrentTask,
    fetchTask,
    reset
  }
})
