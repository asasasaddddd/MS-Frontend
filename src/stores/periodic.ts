import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getPeriodicPlan,
  getPeriodicTask,
  listPeriodicMyHistory,
  listPeriodicMyTasks,
  listPeriodicPlanTasks
} from '@/api/periodic'
import type { EntityId, PeriodicPlanVO, PeriodicTaskVO } from '@/types/periodic'

export const usePeriodicStore = defineStore('periodic', () => {
  const loading = ref(false)
  const currentTasks = ref<PeriodicTaskVO[]>([])
  const historyTasks = ref<PeriodicTaskVO[]>([])
  const currentPlan = ref<PeriodicPlanVO | null>(null)
  const planTasks = ref<PeriodicTaskVO[]>([])
  const currentTask = ref<PeriodicTaskVO | null>(null)

  const currentTaskCount = computed(() => currentTasks.value.length)
  const historyTaskCount = computed(() => historyTasks.value.length)

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

  async function fetchCurrentTasks(status?: string) {
    currentTasks.value = await withLoading(() => listPeriodicMyTasks(status))
    return currentTasks.value
  }

  async function fetchHistoryTasks(status?: string) {
    historyTasks.value = await withLoading(() => listPeriodicMyHistory(status))
    return historyTasks.value
  }

  async function fetchPlan(planId: EntityId) {
    currentPlan.value = await withLoading(() => getPeriodicPlan(planId))
    return currentPlan.value
  }

  async function fetchPlanTasks(planId: EntityId) {
    planTasks.value = await withLoading(() => listPeriodicPlanTasks(planId))
    return planTasks.value
  }

  async function fetchTask(taskId: EntityId) {
    currentTask.value = await withLoading(() => getPeriodicTask(taskId))
    return currentTask.value
  }

  function reset() {
    currentTasks.value = []
    historyTasks.value = []
    currentPlan.value = null
    planTasks.value = []
    currentTask.value = null
  }

  return {
    loading,
    currentTasks,
    historyTasks,
    currentPlan,
    planTasks,
    currentTask,
    currentTaskCount,
    historyTaskCount,
    setCurrentTask,
    fetchCurrentTasks,
    fetchHistoryTasks,
    fetchPlan,
    fetchPlanTasks,
    fetchTask,
    reset
  }
})
