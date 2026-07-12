<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  confirmerConfirmPeriodic,
  generatePeriodicTestPlan,
  getPeriodicPlan,
  listPeriodicMyHistory,
  listPeriodicMyTasks,
  managerForwardConfirmPeriodic,
  responsibleSecondJudgePeriodic,
  secondJudgePeriodic,
  submitPeriodicExceptionChange,
  supplierFillInfoPeriodic,
  verificationRecordPeriodic,
  verifierFillInfoPeriodic
} from '../../../api/periodic'
import type {
  EntityId,
  PeriodicConfirmerConfirmRequest,
  PeriodicManagerForwardConfirmRequest,
  PeriodicPlanVO,
  PeriodicResponsibleSecondJudgeRequest,
  PeriodicSecondJudgeRequest,
  PeriodicSupplierFillInfoRequest,
  PeriodicTaskVO,
  PeriodicVerificationRecordRequest,
  PeriodicVerifierFillInfoRequest
} from '../../../types/periodic'
import type { ChangeSubmitRequest } from '../../../types/change'
import PeriodicConfirmDialog from './PeriodicConfirmDialog.vue'
import PeriodicDetailDialog from './PeriodicDetailDialog.vue'
import PeriodicExceptionDialog from './PeriodicExceptionDialog.vue'
import PeriodicExternalVerifyDialog from './PeriodicExternalVerifyDialog.vue'
import PeriodicForwardConfirmDialog from './PeriodicForwardConfirmDialog.vue'
import PeriodicPlanSummary from './PeriodicPlanSummary.vue'
import PeriodicResponsibleJudgeDialog from './PeriodicResponsibleJudgeDialog.vue'
import PeriodicSecondJudgeDialog from './PeriodicSecondJudgeDialog.vue'
import PeriodicSupplierFillDialog from './PeriodicSupplierFillDialog.vue'
import PeriodicTaskTable from './PeriodicTaskTable.vue'
import PeriodicVerifyDialog from './PeriodicVerifyDialog.vue'
import type { PeriodicExceptionAction } from '../periodicExceptionModel'
import type { PeriodicTableRole } from '../periodicDisplayModel'

type ActiveTab = 'todo' | 'history'

const props = withDefaults(
  defineProps<{
    title: string
    role: PeriodicTableRole
    nodeCodes: string[]
    verificationMethods?: string[]
  }>(),
  {
    verificationMethods: () => []
  }
)

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const generatingTestPlan = ref(false)
const exceptionChangeSubmitting = ref(false)
const activeTab = ref<ActiveTab>('todo')
const statusFilter = ref<string>('all')
const keyword = ref('')
const currentTasks = ref<PeriodicTaskVO[]>([])
const historyTasks = ref<PeriodicTaskVO[]>([])
const currentPlan = ref<PeriodicPlanVO | null>(null)
const activeTask = ref<PeriodicTaskVO | null>(null)
const selectedRowKeys = ref<EntityId[]>([])
const selectedTasks = ref<PeriodicTaskVO[]>([])
const exceptionActionType = ref<PeriodicExceptionAction>('seal')

const detailOpen = ref(false)
const verifyOpen = ref(false)
const externalVerifyOpen = ref(false)
const supplierFillOpen = ref(false)
const responsibleJudgeOpen = ref(false)
const secondJudgeOpen = ref(false)
const forwardOpen = ref(false)
const confirmOpen = ref(false)
const exceptionOpen = ref(false)
const exceptionTasks = ref<PeriodicTaskVO[]>([])

const statusOptions = [
  { label: '当前状态筛选', value: 'all' },
  { label: '异常分流', value: 'plan_confirm' },
  { label: '检定员接收', value: 'transfer_verifier' },
  { label: '自检检定', value: 'self_verify' },
  { label: '外委送出', value: 'send_out' },
  { label: '外委送回', value: 'send_out_return' },
  { label: '外扩填写', value: 'supplier_fill_info' },
  { label: '外委填写', value: 'verifier_fill_info' },
  { label: '责任工程师二次判定', value: 'responsible_second_judge' },
  { label: '外委三次判定', value: 'external_third_judge' },
  { label: '报告待转办', value: 'manager_forward_confirm' },
  { label: '报告待确认', value: 'confirmer_confirm' }
]

const exceptionActionOptions = [
  { label: '封存', value: 'seal' },
  { label: '缓检', value: 'defer' },
  { label: '非正常报废', value: 'scrap' },
  { label: '管理类别调整', value: 'category' },
  { label: '检定周期调整', value: 'cycle' }
]

const routePlanId = computed(() => {
  const value = route.query.planId
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value ? String(value) : ''
})

function filterByRoutePlan(tasks: PeriodicTaskVO[]) {
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
    const methodMatched =
      props.verificationMethods.length === 0 ||
      !task.verificationMethod ||
      props.verificationMethods.includes(String(task.verificationMethod))
    const statusMatched = statusFilter.value === 'all' || task.currentNode === statusFilter.value
    const text = keyword.value.trim()
    const keywordMatched =
      !text ||
      [task.taskNo, task.deviceCode, task.deviceName, task.factoryCode, task.deptName]
        .filter(Boolean)
        .some((value) => String(value).includes(text))
    return nodeMatched && methodMatched && statusMatched && keywordMatched
  })
)

const todoCount = computed(() =>
  scopedCurrentTasks.value.filter((task) => props.nodeCodes.length === 0 || props.nodeCodes.includes(String(task.currentNode || ''))).length
)

const canBatchException = computed(() => props.role === 'admin' && activeTab.value === 'todo')
const periodicExceptionSubmitNodeCodes = ['plan_issue', 'plan_confirm', 'manager_receive']
const terminalExceptionTaskStatuses = ['exception', 'completed', 'rejected', 'cancelled']

function canSubmitPeriodicException(task: Pick<PeriodicTaskVO, 'currentNode' | 'taskStatus'>) {
  const node = String(task.currentNode || '')
  const status = String(task.taskStatus || '')
  return periodicExceptionSubmitNodeCodes.includes(node) && !terminalExceptionTaskStatuses.includes(status)
}

const exceptionCandidates = computed(() => selectedTasks.value.filter(canSubmitPeriodicException))

function resetFilter() {
  statusFilter.value = 'all'
  keyword.value = ''
}

function openDetail(task: PeriodicTaskVO) {
  activeTask.value = task
  detailOpen.value = true
}

function updateSelection(keys: EntityId[], tasks: PeriodicTaskVO[]) {
  selectedRowKeys.value = keys
  selectedTasks.value = tasks
}

function samePlanId(tasks: PeriodicTaskVO[]) {
  const ids = new Set(tasks.map((task) => String(task.planId || '')))
  return ids.size <= 1
}

function openException(tasks?: PeriodicTaskVO[]) {
  const nextTasks = tasks && tasks.length > 0 ? tasks : exceptionCandidates.value
  if (nextTasks.length === 0) {
    message.warning('请选择需要提交异常分支的周检设备')
    return
  }
  if (!tasks && selectedTasks.value.length !== exceptionCandidates.value.length) {
    message.warning('只能选择计划下发、异常分流或管理员接收节点的设备')
    return
  }
  if (!samePlanId(nextTasks)) {
    message.warning('一次只能提交同一周检计划下的设备')
    return
  }
  exceptionTasks.value = nextTasks
  activeTask.value = nextTasks[0]
  exceptionOpen.value = true
}

function openScan(action: string, task: PeriodicTaskVO) {
  activeTask.value = task
  router.push({
    path: '/scan',
    query: {
      module: 'periodic',
      taskId: String(task.id),
      action
    }
  })
}

function openProcess(task: PeriodicTaskVO) {
  if (activeTab.value === 'history') {
    openDetail(task)
    return
  }

  const node = String(task.currentNode || '')
  activeTask.value = task
  if (node === 'manager_receive') return openScan('periodic-manager-receive', task)
  if (node === 'manager_forward_confirm') {
    forwardOpen.value = true
    return
  }
  if (node === 'transfer_verifier') return openScan('periodic-verifier-receive', task)
  if (node === 'self_verify' || node === 'verification_record') {
    verifyOpen.value = true
    return
  }
  if (node === 'send_out') return openScan('periodic-external-send-out', task)
  if (node === 'send_out_return') return openScan('periodic-send-out-return', task)
  if (node === 'supplier_fill_info') {
    supplierFillOpen.value = true
    return
  }
  if (node === 'verifier_fill_info') {
    externalVerifyOpen.value = true
    return
  }
  if (node === 'responsible_second_judge') {
    responsibleJudgeOpen.value = true
    return
  }
  if (node === 'external_third_judge') {
    secondJudgeOpen.value = true
    return
  }
  if (node === 'confirmer_confirm') {
    confirmOpen.value = true
    return
  }
  openDetail(task)
}

async function loadPlanFromTasks(tasks: PeriodicTaskVO[]) {
  const planId = routePlanId.value || tasks.find((task) => task.planId)?.planId
  if (!planId) {
    currentPlan.value = null
    return
  }
  try {
    currentPlan.value = await getPeriodicPlan(planId)
  } catch {
    currentPlan.value = null
  }
}

async function loadData() {
  loading.value = true
  selectedRowKeys.value = []
  selectedTasks.value = []
  try {
    const [todo, history] = await Promise.all([listPeriodicMyTasks(), listPeriodicMyHistory()])
    currentTasks.value = todo
    historyTasks.value = history
    await loadPlanFromTasks([...todo, ...history])
  } catch (error) {
    currentTasks.value = []
    historyTasks.value = []
    currentPlan.value = null
    message.error(error instanceof Error ? error.message : '周检待办加载失败')
  } finally {
    loading.value = false
  }
}

async function generateTestTask() {
  generatingTestPlan.value = true
  try {
    const planId = await generatePeriodicTestPlan()
    await router.replace({
      path: route.path,
      query: {
        ...route.query,
        planId: String(planId)
      }
    })
    await loadData()
    message.success(`已在数智部王熙然名下生成周检测试待办：${planId}，并派给王熙然自检`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '周检测试待办生成失败')
  } finally {
    generatingTestPlan.value = false
  }
}

async function runSubmit(action: () => Promise<void>, successText: string, close: () => void) {
  submitting.value = true
  try {
    await action()
    message.success(successText)
    close()
    await loadData()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '操作失败')
  } finally {
    submitting.value = false
  }
}

async function submitVerify(payload: PeriodicVerificationRecordRequest) {
  if (!payload.verificationTime) {
    message.warning('请填写检定日期')
    return
  }
  await runSubmit(() => verificationRecordPeriodic(payload), '检定信息已提交', () => {
    verifyOpen.value = false
  })
}

async function submitExternalVerify(payload: PeriodicVerifierFillInfoRequest) {
  if (!payload.verificationDate) {
    message.warning('请填写检定日期')
    return
  }
  await runSubmit(() => verifierFillInfoPeriodic(payload), '外委检定信息已提交', () => {
    externalVerifyOpen.value = false
  })
}

async function submitSupplierFill(payload: PeriodicSupplierFillInfoRequest) {
  if (!payload.verificationDate) {
    message.warning('请填写检定日期')
    return
  }
  await runSubmit(() => supplierFillInfoPeriodic(payload), '外扩检定信息已提交', () => {
    supplierFillOpen.value = false
  })
}

async function submitSecondJudge(payload: PeriodicSecondJudgeRequest) {
  await runSubmit(() => secondJudgePeriodic(payload), '外委三次判定已提交', () => {
    secondJudgeOpen.value = false
  })
}

async function submitResponsibleJudge(payload: PeriodicResponsibleSecondJudgeRequest) {
  await runSubmit(() => responsibleSecondJudgePeriodic(payload), '责任工程师二次判定已提交', () => {
    responsibleJudgeOpen.value = false
  })
}

async function submitForward(payload: Omit<PeriodicManagerForwardConfirmRequest, 'taskId'>) {
  const task = activeTask.value
  if (!task) return
  if (!payload.confirmerId) {
    message.warning('请选择确认员')
    return
  }
  await runSubmit(() => managerForwardConfirmPeriodic({ taskId: task.id, ...payload }), '已转办确认员', () => {
    forwardOpen.value = false
  })
}

async function submitConfirm(payload: PeriodicConfirmerConfirmRequest) {
  await runSubmit(() => confirmerConfirmPeriodic(payload), '确认员判定已提交', () => {
    confirmOpen.value = false
  })
}

async function submitExceptionChange(payload: ChangeSubmitRequest) {
  exceptionChangeSubmitting.value = true
  try {
    const orderId = await submitPeriodicExceptionChange(payload)
    message.success(`状态变更申请已提交：${orderId}`)
    exceptionOpen.value = false
    exceptionTasks.value = []
    activeTask.value = null
    selectedRowKeys.value = []
    selectedTasks.value = []
    await loadData()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '状态变更申请提交失败')
  } finally {
    exceptionChangeSubmitting.value = false
  }
}

onMounted(loadData)

watch(routePlanId, () => {
  selectedRowKeys.value = []
  selectedTasks.value = []
  loadPlanFromTasks([...scopedCurrentTasks.value, ...scopedHistoryTasks.value])
})
</script>

<template>
  <section class="periodic-workspace">
    <PeriodicPlanSummary :plan="currentPlan" :tasks="scopedSummaryTasks" />

    <a-card class="panel" :bordered="false">
      <template #title>
        <div class="panel-title">
          <h2>{{ title }}</h2>
          <a-tag class="periodic-tag orange">{{ todoCount }} 项待办</a-tag>
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
        <a-popconfirm
          v-if="role === 'admin' && activeTab === 'todo'"
          title="将创建一台全新测试设备，归数智部王熙然管理并派给王熙然自检，确认生成吗？"
          ok-text="确认生成"
          cancel-text="取消"
          @confirm="generateTestTask"
        >
          <a-button :loading="generatingTestPlan">生成周检待办</a-button>
        </a-popconfirm>
        <a-select
          v-if="canBatchException"
          v-model:value="exceptionActionType"
          class="exception-action-select"
          :options="exceptionActionOptions"
        />
        <a-button
          v-if="canBatchException"
          type="primary"
          :disabled="exceptionCandidates.length === 0"
          @click="openException()"
        >
          提交异常分支
        </a-button>
      </div>

      <PeriodicTaskTable
        :tasks="visibleTasks"
        :role="role"
        :loading="loading"
        :selectable="canBatchException"
        :selected-row-keys="selectedRowKeys"
        @selection-change="updateSelection"
        @detail="openDetail"
        @process="openProcess"
      />
    </a-card>

    <PeriodicDetailDialog v-model:open="detailOpen" :task="activeTask" :plan="currentPlan" title="周检任务详情" />
    <PeriodicVerifyDialog v-model:open="verifyOpen" :task="activeTask" :submitting="submitting" @submit="submitVerify" />
    <PeriodicExternalVerifyDialog
      v-model:open="externalVerifyOpen"
      :task="activeTask"
      :submitting="submitting"
      @submit="submitExternalVerify"
    />
    <PeriodicSupplierFillDialog
      v-model:open="supplierFillOpen"
      :task="activeTask"
      :submitting="submitting"
      @submit="submitSupplierFill"
    />
    <PeriodicResponsibleJudgeDialog
      v-model:open="responsibleJudgeOpen"
      :task="activeTask"
      :submitting="submitting"
      @submit="submitResponsibleJudge"
    />
    <PeriodicSecondJudgeDialog
      v-model:open="secondJudgeOpen"
      :task="activeTask"
      :submitting="submitting"
      @submit="submitSecondJudge"
    />
    <PeriodicForwardConfirmDialog
      v-model:open="forwardOpen"
      :task="activeTask"
      :submitting="submitting"
      @submit="submitForward"
    />
    <PeriodicConfirmDialog v-model:open="confirmOpen" :task="activeTask" :submitting="submitting" @submit="submitConfirm" />
    <PeriodicExceptionDialog
      v-model:open="exceptionOpen"
      :task="activeTask"
      :tasks="exceptionTasks"
      :action-type="exceptionActionType"
      :submitting="submitting"
      :change-submitting="exceptionChangeSubmitting"
      @create-change="submitExceptionChange"
    />
  </section>
</template>

<style scoped>
.periodic-workspace {
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
  min-height: 49px;
  padding: 0 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel :deep(.ant-card-body) {
  padding: 0;
}

.panel-title {
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
  width: 170px;
}

.keyword-input {
  width: 300px;
}

.exception-action-select {
  width: 150px;
}

.filter-spacer {
  flex: 1;
  min-width: 0;
}

.periodic-tag {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  font-size: 12px;
}

.periodic-tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

@media (max-width: 980px) {
  .task-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .task-tabs,
  .status-select,
  .keyword-input {
    width: 100%;
  }
}
</style>
