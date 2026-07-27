<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  adminConfirmSampling,
  confirmerSubmitSampling,
  getSamplingPlan,
  getSamplingTask,
  verifierSubmitSampling
} from '@/api/sampling'
import { useRoleTodoSummary } from '@/composables/useRoleTodoSummary'
import { useWorkflowTask } from '@/composables/useWorkflowTask'
import { useSessionStore } from '@/stores/session'
import type {
  SamplingEntityId,
  SamplingPlanVO,
  SamplingResult,
  SamplingTaskVO,
  SamplingVerificationDraft
} from '@/types/sampling'
import SamplingDetailDialog from './SamplingDetailDialog.vue'
import SamplingPlanSummary from './SamplingPlanSummary.vue'
import SamplingResultDialog from './SamplingResultDialog.vue'
import SamplingTaskTable from './SamplingTaskTable.vue'
import { resolveSamplingTaskAction, type SamplingTableRole } from '../samplingDisplayModel'

type ActiveTab = 'todo' | 'history'

const props = defineProps<{
  title: string
  role: SamplingTableRole
}>()

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const workflowIdentity = computed(() => {
  const user = session.user
  return user ? `${user.employeeId}|${user.roleCode}` : ''
})
const {
  todoTasks: workflowTodoTasks,
  participatedTasks: workflowParticipatedTasks,
  refresh: refreshWorkflowTasks,
  loadDetails: loadWorkflowDetails,
  executeTaskAction
} = useWorkflowTask({
  identityKey: workflowIdentity,
  businessType: 'SAMPLING',
  views: ['todo', 'participated'],
  immediate: false
})

const loading = ref(false)
const submitting = ref(false)
const activeTab = ref<ActiveTab>(route.query.tab === 'history' ? 'history' : 'todo')
const statusFilter = ref<string>('all')
const keyword = ref('')
const currentTasks = ref<SamplingTaskVO[]>([])
const historyTasks = ref<SamplingTaskVO[]>([])
const currentPlan = ref<SamplingPlanVO | null>(null)
const activeTask = ref<SamplingTaskVO | null>(null)
const selectedRowKeys = ref<SamplingEntityId[]>([])
const selectedTasks = ref<SamplingTaskVO[]>([])
const detailOpen = ref(false)
const resultOpen = ref(false)
const resultMode = ref<SamplingResult>('qualified')
const resultDialogTasks = ref<SamplingTaskVO[]>([])
const adminOpinion = ref('实物清点无误，同意进入抽检流程')

const routePlanId = computed(() => {
  const value = route.query.planId
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value ? String(value) : ''
})
const summaryScope = computed(() => routePlanId.value
  ? { businessType: 'SAMPLING', scopeType: 'plan' as const, scopeId: routePlanId.value }
  : { businessType: 'SAMPLING' })
const {
  summary: samplingFlowSummary,
  loading: summaryLoading,
  error: summaryError,
  refresh: refreshSummary
} = useRoleTodoSummary({
  identityKey: workflowIdentity,
  query: summaryScope,
  immediate: false
})

const statusOptions = [
  { label: '当前状态筛选', value: 'all' },
  { label: '管理员清点', value: 'admin_confirm' },
  { label: '检定员检定', value: 'verifier_fill' },
  { label: '确认员判定', value: 'confirmer_confirm' },
  { label: '已完成', value: 'completed' }
]

function filterByRoutePlan(tasks: SamplingTaskVO[]) {
  const planId = routePlanId.value
  if (!planId) return tasks
  return tasks.filter((task) => String(task.planId || '') === planId)
}

const scopedCurrentTasks = computed(() => filterByRoutePlan(currentTasks.value))
const scopedHistoryTasks = computed(() => filterByRoutePlan(historyTasks.value))
const sourceTasks = computed(() => (activeTab.value === 'todo' ? scopedCurrentTasks.value : scopedHistoryTasks.value))

const visibleTasks = computed(() =>
  sourceTasks.value.filter((task) => {
    const statusMatched = statusFilter.value === 'all' || task.currentNode === statusFilter.value
    const text = keyword.value.trim()
    const keywordMatched =
      !text ||
      [task.taskNo, task.planNo, task.deviceCode, task.deviceName, task.factoryCode, task.deptName]
        .filter(Boolean)
        .some((value) => String(value).includes(text))
    return statusMatched && keywordMatched
  })
)

const canSelect = computed(() => activeTab.value === 'todo')
const isAdminActionWorkspace = computed(() => currentTasks.value.some(
  (task) => resolveSamplingTaskAction(task) === 'admin-confirm'
))
const canBatchAdmin = computed(() => selectedTasks.value.length > 0 && selectedTasks.value.every(
  (task) => resolveSamplingTaskAction(task) === 'admin-confirm'
))
const selectedResultAction = computed(() => {
  const actions = new Set(selectedTasks.value.map(resolveSamplingTaskAction))
  if (actions.size !== 1) return undefined
  const action = actions.values().next().value
  return action === 'verifier-submit' || action === 'confirmer-submit' ? action : undefined
})
const canBatchResult = computed(() => selectedTasks.value.length > 0 && Boolean(selectedResultAction.value))

function resetFilter() {
  statusFilter.value = 'all'
  keyword.value = ''
}

function updateSelection(keys: SamplingEntityId[], tasks: SamplingTaskVO[]) {
  selectedRowKeys.value = keys
  selectedTasks.value = tasks
}

function openDetail(task: SamplingTaskVO) {
  activeTask.value = task
  detailOpen.value = true
}

function openResult(mode: SamplingResult, tasks: SamplingTaskVO[]) {
  if (tasks.length === 0) {
    message.warning('请选择抽检任务')
    return
  }
  const actions = new Set(tasks.map(resolveSamplingTaskAction))
  if (
    actions.size !== 1 ||
    !['verifier-submit', 'confirmer-submit'].includes(String(actions.values().next().value || ''))
  ) {
    message.warning('所选抽检任务没有一致的检定或确认操作权限')
    return
  }
  resultMode.value = mode
  resultDialogTasks.value = tasks
  resultOpen.value = true
}

function openProcess(task: SamplingTaskVO) {
  if (activeTab.value === 'history') {
    openDetail(task)
    return
  }
  const action = resolveSamplingTaskAction(task)
  if (!action) {
    message.warning('当前任务没有可执行操作，请刷新待办')
    return
  }
  if (action === 'admin-confirm') {
    selectedRowKeys.value = [task.id]
    selectedTasks.value = [task]
    return
  }
  openResult('qualified', [task])
}

function samePlanId(tasks: SamplingTaskVO[]) {
  const ids = new Set(tasks.map((task) => String(task.planId || '')))
  return ids.size <= 1
}

async function submitAdminConfirm() {
  if (selectedTasks.value.length === 0) {
    message.warning('请选择需要提交的抽检设备')
    return
  }
  if (!selectedTasks.value.every((task) => resolveSamplingTaskAction(task) === 'admin-confirm')) {
    message.warning('所选抽检任务没有管理员确认权限')
    return
  }
  if (!samePlanId(selectedTasks.value)) {
    message.warning('一次只能提交同一张抽检计划内的设备')
    return
  }
  submitting.value = true
  let refreshedByConflict = false
  try {
    for (const task of selectedTasks.value) {
      const result = await executeSamplingAction(task, () => adminConfirmSampling({
        samplingTaskId: task.id,
        taskId: taskWorkflowId(task),
        rowVersion: task.rowVersion!,
        opinion: adminOpinion.value
      }))
      if (result.status === 'already-handled') {
        refreshedByConflict = true
        return
      }
    }
    message.success('抽检清点结果已提交')
    selectedRowKeys.value = []
    selectedTasks.value = []
    if (!refreshedByConflict) await loadData()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '抽检清点提交失败')
  } finally {
    submitting.value = false
  }
}

async function submitResult(payload: SamplingVerificationDraft) {
  submitting.value = true
  let refreshedByConflict = false
  try {
    for (const task of resultDialogTasks.value) {
      const action = () => {
        const request = {
          ...payload,
          samplingTaskId: task.id,
          taskId: taskWorkflowId(task),
          rowVersion: task.rowVersion!
        }
        const taskAction = resolveSamplingTaskAction(task)
        if (taskAction === 'confirmer-submit') return confirmerSubmitSampling(request)
        if (taskAction === 'verifier-submit') return verifierSubmitSampling(request)
        return Promise.reject(new Error('当前抽检任务没有检定或确认提交权限'))
      }
      const result = await executeSamplingAction(task, action)
      if (result.status === 'already-handled') {
        refreshedByConflict = true
        return
      }
    }
    message.success(resultDialogTasks.value.some((task) => resolveSamplingTaskAction(task) === 'confirmer-submit')
      ? '确认员抽检判定已提交'
      : '检定员抽检结果已提交')
    resultOpen.value = false
    resultDialogTasks.value = []
    selectedRowKeys.value = []
    selectedTasks.value = []
    if (!refreshedByConflict) await loadData()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '抽检结果提交失败')
  } finally {
    submitting.value = false
  }
}

/** 并行加载当前路由计划及其统一角色待办汇总，两个结果互不覆盖。 */
async function loadPlanContext() {
  const planId = routePlanId.value
  if (!planId) {
    currentPlan.value = null
    await refreshSummary().catch(() => undefined)
    return
  }

  const [planResult] = await Promise.allSettled([
    getSamplingPlan(planId),
    refreshSummary()
  ])
  currentPlan.value = planResult.status === 'fulfilled' ? planResult.value : null

  if (planResult.status === 'rejected') {
    message.error(planResult.reason instanceof Error ? planResult.reason.message : '抽检计划信息加载失败')
  }
}

let dataLoadId = 0
async function loadData() {
  const loadId = ++dataLoadId
  loading.value = true
  selectedRowKeys.value = []
  selectedTasks.value = []
  try {
    /** 路由计划基础信息和权威汇总与任务列表并行读取。 */
    const planContextPromise = loadPlanContext()
    await refreshWorkflowTasks()
    const details = await loadWorkflowDetails(
      [...workflowTodoTasks.value, ...workflowParticipatedTasks.value],
      (task, signal) => getSamplingTask(task.businessId, signal)
    )
    if (!details || loadId !== dataLoadId) return
    const detailByWorkflowTaskId = new Map(details.map((task) => [String(task.workflowTaskId), task]))
    currentTasks.value = workflowTodoTasks.value.flatMap((task) => {
      const detail = detailByWorkflowTaskId.get(String(task.taskId))
      return detail ? [detail as SamplingTaskVO] : []
    })
    historyTasks.value = workflowParticipatedTasks.value.flatMap((task) => {
      const detail = detailByWorkflowTaskId.get(String(task.taskId))
      return detail ? [detail as SamplingTaskVO] : []
    })
    await planContextPromise
  } catch (error) {
    if (loadId === dataLoadId) {
      message.error(error instanceof Error ? error.message : '抽检任务加载失败')
    }
  } finally {
    if (loadId === dataLoadId) loading.value = false
  }
}

function taskWorkflowId(task: SamplingTaskVO) {
  if (task.workflowTaskId === undefined || task.rowVersion === undefined) {
    throw new Error('工作流任务上下文已失效，请刷新待办')
  }
  return task.workflowTaskId
}

async function executeSamplingAction<T>(task: SamplingTaskVO, action: () => Promise<T>) {
  return executeTaskAction(taskWorkflowId(task), action, {
    notifyAlreadyHandled: (notice) => message.warning(notice),
    refresh: loadData
  })
}

function backToTodo() {
  router.push('/todo')
}

watch(workflowIdentity, () => {
  void loadData()
}, { immediate: true })

watch(routePlanId, () => {
  selectedRowKeys.value = []
  selectedTasks.value = []
  void loadPlanContext()
})
</script>

<template>
  <section class="sampling-workspace">
    <SamplingPlanSummary
      :plan="currentPlan"
      :summary="samplingFlowSummary"
      :loading="loading || summaryLoading"
      :error="summaryError"
    />

    <a-card class="panel" :bordered="false">
      <template #title>
        <h2>{{ title }}</h2>
      </template>

      <div class="task-filter">
        <a-tabs v-model:activeKey="activeTab" class="task-tabs">
          <a-tab-pane key="todo" tab="当前待办" />
          <a-tab-pane key="history" tab="参与记录" />
        </a-tabs>
        <a-select v-model:value="statusFilter" class="status-select" :options="statusOptions" />
        <a-input v-model:value="keyword" class="keyword-input" placeholder="按计量编号、设备名称、出厂编号查询" allow-clear />
        <a-button type="primary">查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
        <div class="filter-spacer"></div>

        <template v-if="isAdminActionWorkspace && activeTab === 'todo'">
          <a-input v-model:value="adminOpinion" class="opinion-input" placeholder="处理意见" />
          <a-button type="primary" :loading="submitting" :disabled="!canBatchAdmin" @click="submitAdminConfirm">提交</a-button>
        </template>

        <template v-if="activeTab === 'todo' && !isAdminActionWorkspace">
          <a-button class="success-button" :disabled="!canBatchResult" @click="openResult('qualified', selectedTasks)">合格</a-button>
          <a-button danger :disabled="!canBatchResult" @click="openResult('unqualified', selectedTasks)">不合格处理</a-button>
        </template>

        <a-button @click="backToTodo">返回待办</a-button>
      </div>

      <SamplingTaskTable
        :tasks="visibleTasks"
        :role="role"
        :loading="loading"
        :selectable="canSelect"
        :selectable-task="(task: SamplingTaskVO) => Boolean(resolveSamplingTaskAction(task))"
        :selected-row-keys="selectedRowKeys"
        @selection-change="updateSelection"
        @detail="openDetail"
        @process="openProcess"
      />
    </a-card>

    <SamplingDetailDialog v-model:open="detailOpen" :task="activeTask" :plan="currentPlan" />
    <SamplingResultDialog
      v-model:open="resultOpen"
      :tasks="resultDialogTasks"
      :result="resultMode"
      :title="resultMode === 'qualified' ? 'C类抽检合格信息填写' : 'C类抽检不合格处理'"
      :submitting="submitting"
      @submit="submitResult"
    />
  </section>
</template>

<style scoped>
.sampling-workspace {
  display: grid;
  gap: 16px;
}

.panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel :deep(.ant-card-head) {
  min-height: 52px;
  padding: 0 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel :deep(.ant-card-body) {
  padding: 0;
}

.panel h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.task-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #e5eaf1;
  background: #fbfcfe;
}

.task-tabs {
  min-width: 190px;
}

.task-tabs :deep(.ant-tabs-nav) {
  margin: 0;
}

.status-select {
  width: 160px;
}

.keyword-input {
  width: 280px;
}

.result-select {
  width: 130px;
}

.confirmer-select {
  width: 180px;
}

.opinion-input {
  width: 220px;
}

.filter-spacer {
  flex: 1;
  min-width: 0;
}

.success-button {
  border-color: #027a48;
  background: #027a48;
  color: #ffffff;
}

.success-button:not(:disabled):hover {
  border-color: #02613a;
  background: #02613a;
  color: #ffffff;
}

.tag {
  border-radius: 999px;
  font-weight: 600;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

@media (max-width: 1180px) {
  .task-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .task-tabs,
  .status-select,
  .keyword-input,
  .result-select,
  .confirmer-select,
  .opinion-input {
    width: 100%;
  }
}
</style>
