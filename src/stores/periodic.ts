import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getPeriodicPlan,
  getPeriodicTask,
  listPeriodicPlanTasks
} from '@/api/periodic'
import type { EntityId, PeriodicPlanVO, PeriodicTaskVO } from '@/types/periodic'

export const usePeriodicStore = defineStore('periodic', () => {
  const loading = ref(false)
  const currentPlan = ref<PeriodicPlanVO | null>(null)
  const planTasks = ref<PeriodicTaskVO[]>([])
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

  async function fetchPlan(planId: EntityId) {
    currentPlan.value = await withLoading(() => getPeriodicPlan(planId))
    return currentPlan.value
  }

  async function fetchPlanTasks(planId: EntityId) {
    planTasks.value = await withLoading(() => listPeriodicPlanTasks(planId))
    return planTasks.value
  }

  async function fetchTask(periodicTaskId: EntityId, workflowTaskId: EntityId) {
    currentTask.value = await withLoading(() => getPeriodicTask(periodicTaskId, workflowTaskId))
    return currentTask.value
  }

  function reset() {
    currentPlan.value = null
    planTasks.value = []
    currentTask.value = null
  }

  return {
    loading,
    currentPlan,
    planTasks,
    currentTask,
    setCurrentTask,
    fetchPlan,
    fetchPlanTasks,
    fetchTask,
    reset
  }
})
