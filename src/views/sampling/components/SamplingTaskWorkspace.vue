<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  adminConfirmSampling,
  confirmerSubmitSampling,
  getSamplingPlan,
  listSamplingMyHistory,
  listSamplingMyTasks,
  verifierSubmitSampling
} from '@/api/sampling'
import { listUsersByDeptAndRole, type SysUserVO } from '@/api/system'
import { useSessionStore } from '@/stores/session'
import type {
  SamplingAdminResult,
  SamplingEntityId,
  SamplingPlanVO,
  SamplingResult,
  SamplingTaskVO,
  SamplingVerificationSubmitRequest
} from '@/types/sampling'
import SamplingDetailDialog from './SamplingDetailDialog.vue'
import SamplingPlanSummary from './SamplingPlanSummary.vue'
import SamplingResultDialog from './SamplingResultDialog.vue'
import SamplingTaskTable from './SamplingTaskTable.vue'
import type { SamplingTableRole } from '../samplingDisplayModel'

type ActiveTab = 'todo' | 'history'

const props = defineProps<{
  title: string
  role: SamplingTableRole
  nodeCodes: string[]
}>()

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

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
const confirmers = ref<SysUserVO[]>([])
const confirmerId = ref<string>()
const adminResult = ref<SamplingAdminResult>('normal')
const adminOpinion = ref('实物清点无误，同意进入抽检流程')

const routePlanId = computed(() => {
  const value = route.query.planId
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value ? String(value) : ''
})

const statusOptions = [
  { label: '当前状态筛选', value: 'all' },
  { label: '管理员清点', value: 'admin_confirm' },
  { label: '检定员检定', value: 'verifier_verify' },
  { label: '确认员判定', value: 'confirmer_confirm' },
  { label: '已完成', value: 'completed' }
]

const adminResultOptions = [
  { label: '正常送检', value: 'normal' },
  { label: '封存', value: 'seal' },
  { label: '非正常报废', value: 'abnormal_scrap' },
  { label: '正常报废', value: 'scrap' },
  { label: '实物未找到', value: 'missing' }
]

const confirmerOptions = computed(() =>
  confirmers.value.map((user) => ({
    label: `${user.employeeName || user.employeeId} / ${user.employeeId}`,
    value: user.employeeId
  }))
)

const selectedConfirmer = computed(() => confirmers.value.find((user) => user.employeeId === confirmerId.value))

function filterByRoutePlan(tasks: SamplingTaskVO[]) {
  const planId = routePlanId.value
  if (!planId) return tasks
  return tasks.filter((task) => String(task.planId || '') === planId)
}

const scopedCurrentTasks = computed(() => filterByRoutePlan(currentTasks.value))
const scopedHistoryTasks = computed(() => filterByRoutePlan(historyTasks.value))
const scopedSummaryTasks = computed(() => (scopedCurrentTasks.value.length > 0 ? scopedCurrentTasks.value : scopedHistoryTasks.value))
const sourceTasks = computed(() => (activeTab.value === 'todo' ? scopedCurrentTasks.value : scopedHistoryTasks.value))

const visibleTasks = computed(() =>
  sourceTasks.value.filter((task) => {
    const nodeMatched =
      activeTab.value === 'history' ||
      props.nodeCodes.length === 0 ||
      props.nodeCodes.includes(String(task.currentNode || ''))
    const statusMatched = statusFilter.value === 'all' || task.currentNode === statusFilter.value
    const text = keyword.value.trim()
    const keywordMatched =
      !text ||
      [task.taskNo, task.planNo, task.deviceCode, task.deviceName, task.factoryCode, task.deptName]
        .filter(Boolean)
        .some((value) => String(value).includes(text))
    return nodeMatched && statusMatched && keywordMatched
  })
)

const todoCount = computed(() =>
  scopedCurrentTasks.value.filter((task) => props.nodeCodes.length === 0 || props.nodeCodes.includes(String(task.currentNode || ''))).length
)

const canSelect = computed(() => activeTab.value === 'todo')
const canBatchAdmin = computed(() => props.role === 'admin' && selectedTasks.value.length > 0)
const canBatchResult = computed(() => props.role !== 'admin' && selectedTasks.value.length > 0)

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
  resultMode.value = mode
  resultDialogTasks.value = tasks
  resultOpen.value = true
}

function openProcess(task: SamplingTaskVO) {
  if (activeTab.value === 'history') {
    openDetail(task)
    return
  }
  openResult('unqualified', [task])
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
  if (!samePlanId(selectedTasks.value)) {
    message.warning('一次只能提交同一张抽检计划内的设备')
    return
  }
  const needsConfirmer = adminResult.value === 'normal' && selectedTasks.value.some((task) => task.isCommon === 0)
  if (needsConfirmer && !confirmerId.value) {
    message.warning('否通用设备正常送检时必须选择确认员')
    return
  }

  submitting.value = true
  try {
    await adminConfirmSampling({
      taskIds: selectedTasks.value.map((task) => task.id),
      result: adminResult.value,
      confirmerId: needsConfirmer ? confirmerId.value : undefined,
      confirmerName: needsConfirmer ? selectedConfirmer.value?.employeeName || confirmerId.value : undefined,
      opinion: adminOpinion.value
    })
    message.success('抽检清点结果已提交')
    selectedRowKeys.value = []
    selectedTasks.value = []
    await loadData()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '抽检清点提交失败')
  } finally {
    submitting.value = false
  }
}

async function submitResult(payload: SamplingVerificationSubmitRequest) {
  submitting.value = true
  try {
    if (props.role === 'confirmer') {
      await confirmerSubmitSampling(payload)
      message.success('确认员抽检判定已提交')
    } else {
      await verifierSubmitSampling(payload)
      message.success('检定员抽检结果已提交')
    }
    resultOpen.value = false
    resultDialogTasks.value = []
    selectedRowKeys.value = []
    selectedTasks.value = []
    await loadData()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '抽检结果提交失败')
  } finally {
    submitting.value = false
  }
}

async function loadPlanFromTasks(tasks: SamplingTaskVO[]) {
  const planId = routePlanId.value || tasks.find((task) => task.planId)?.planId
  if (!planId) {
    currentPlan.value = null
    return
  }
  try {
    currentPlan.value = await getSamplingPlan(planId)
  } catch {
    currentPlan.value = null
  }
}

async function loadConfirmers(tasks: SamplingTaskVO[]) {
  const deptId = tasks.find((task) => task.deptId)?.deptId || session.user?.deptId || ''
  if (!deptId || props.role !== 'admin') {
    confirmers.value = []
    return
  }
  try {
    confirmers.value = await listUsersByDeptAndRole(deptId, 'CONFIRMER')
  } catch {
    confirmers.value = []
  }
}

async function loadData() {
  loading.value = true
  selectedRowKeys.value = []
  selectedTasks.value = []
  try {
    const [todo, history] = await Promise.all([listSamplingMyTasks(), listSamplingMyHistory()])
    currentTasks.value = todo
    historyTasks.value = history
    await loadPlanFromTasks([...todo, ...history])
    await loadConfirmers([...todo, ...history])
  } catch (error) {
    currentTasks.value = []
    historyTasks.value = []
    currentPlan.value = null
    message.error(error instanceof Error ? error.message : '抽检待办加载失败')
  } finally {
    loading.value = false
  }
}

function backToTodo() {
  router.push('/todo')
}

onMounted(loadData)

watch(routePlanId, () => {
  selectedRowKeys.value = []
  selectedTasks.value = []
  loadPlanFromTasks([...scopedCurrentTasks.value, ...scopedHistoryTasks.value])
})
</script>

<template>
  <section class="sampling-workspace">
    <SamplingPlanSummary :plan="currentPlan" :tasks="scopedSummaryTasks" />

    <a-card class="panel" :bordered="false">
      <template #title>
        <div class="panel-title">
          <h2>{{ title }}</h2>
          <a-tag class="tag orange">{{ todoCount }} 项待办</a-tag>
        </div>
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

        <template v-if="role === 'admin' && activeTab === 'todo'">
          <a-select v-model:value="adminResult" class="result-select" :options="adminResultOptions" />
          <a-select
            v-model:value="confirmerId"
            class="confirmer-select"
            :options="confirmerOptions"
            show-search
            option-filter-prop="label"
            placeholder="转发确认员"
          />
          <a-input v-model:value="adminOpinion" class="opinion-input" placeholder="处理意见" />
          <a-button type="primary" :loading="submitting" :disabled="!canBatchAdmin" @click="submitAdminConfirm">提交</a-button>
        </template>

        <template v-if="role !== 'admin' && activeTab === 'todo'">
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

.panel-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-title h2 {
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
