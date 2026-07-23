<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { getPeriodicPlanFlowSummary } from '../../../api/flowSummary'
import {
  confirmerConfirmPeriodic,
  exceptionDisposePeriodic,
  generatePeriodicTestPlan,
  getPeriodicTask,
  listPeriodicMyHistory,
  listPeriodicMyTasks,
  managerForwardConfirmPeriodic,
  submitPeriodicJudgement,
  submitPeriodicScrapDisposal,
  submitPeriodicExceptionChange,
  supplierFillInfoPeriodic,
  verificationRecordPeriodic,
  verifierFillInfoPeriodic
} from '../../../api/periodic'
import { listUsersByDeptAndRole, type SysUserVO } from '../../../api/system'
import type {
  EntityId,
  PeriodicConfirmerConfirmRequest,
  PeriodicJudgementRequest,
  PeriodicManagerForwardConfirmRequest,
  PeriodicScrapDisposalRequest,
  PeriodicSupplierFillInfoRequest,
  PeriodicTestPlanScenario,
  PeriodicTaskVO,
  PeriodicVerificationRecordRequest,
  PeriodicVerifierFillInfoRequest
} from '../../../types/periodic'
import type { ChangeSubmitRequest } from '../../../types/change'
import type { FlowSummary } from '../../../types/flowSummary'
import { isPeriodicDualHandoverTask } from '../../../api/periodicContract'
import PeriodicConfirmDialog from './PeriodicConfirmDialog.vue'
import PeriodicDetailDialog from './PeriodicDetailDialog.vue'
import PeriodicExceptionDialog from './PeriodicExceptionDialog.vue'
import PeriodicExternalVerifyDialog from './PeriodicExternalVerifyDialog.vue'
import PeriodicForwardConfirmDialog from './PeriodicForwardConfirmDialog.vue'
import PeriodicJudgementDialog from './PeriodicJudgementDialog.vue'
import PeriodicPlanSummary from './PeriodicPlanSummary.vue'
import PeriodicScrapDisposalDialog from './PeriodicScrapDisposalDialog.vue'
import PeriodicSupplierFillDialog from './PeriodicSupplierFillDialog.vue'
import PeriodicTaskTable from './PeriodicTaskTable.vue'
import PeriodicVerifyDialog from './PeriodicVerifyDialog.vue'
import {
  buildPeriodicExceptionDisposeRequest,
  canDisposePeriodicException,
  canSubmitPeriodicException,
  type PeriodicExceptionAction
} from '../periodicExceptionModel'
import { getPeriodicJudgementDisplay, type PeriodicTableRole } from '../periodicDisplayModel'

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
const testPlanScenario = ref<PeriodicTestPlanScenario>('self')
const exceptionChangeSubmitting = ref(false)
const activeTab = ref<ActiveTab>(route.query.tab === 'history' ? 'history' : 'todo')
const statusFilter = ref<string>('all')
const keyword = ref('')
const currentTasks = ref<PeriodicTaskVO[]>([])
const historyTasks = ref<PeriodicTaskVO[]>([])
/** 当前路由计划由后端生成的权威流程状态快照。 */
const periodicFlowSummary = ref<FlowSummary | null>(null)
const activeTask = ref<PeriodicTaskVO | null>(null)
const selectedRowKeys = ref<EntityId[]>([])
const selectedTasks = ref<PeriodicTaskVO[]>([])
const exceptionActionType = ref<PeriodicExceptionAction>('seal')
const confirmers = ref<SysUserVO[]>([])
const confirmerId = ref<string>()
const loadingConfirmers = ref(false)

const detailOpen = ref(false)
const verifyOpen = ref(false)
const externalVerifyOpen = ref(false)
const supplierFillOpen = ref(false)
/** 统一多轮判定弹窗是否打开。 */
const judgementOpen = ref(false)
/** 外委检定员报废处置弹窗是否打开。 */
const scrapDisposalOpen = ref(false)
const forwardOpen = ref(false)
const confirmOpen = ref(false)
const exceptionOpen = ref(false)
const exceptionTasks = ref<PeriodicTaskVO[]>([])

/** 工作台当前节点筛选项，与后端周检节点编码保持一致。 */
const statusOptions = computed(() => [
  { label: '当前状态筛选', value: 'all' },
  { label: props.role === 'admin' ? '待异常分流' : '待扫码接收', value: 'plan_confirm' },
  { label: '自检检定', value: 'self_verify' },
  { label: '外委送出', value: 'send_out' },
  { label: '外委送回', value: 'send_out_return' },
  { label: '外扩填写', value: 'supplier_fill_info' },
  { label: '外委填写', value: 'verifier_fill_info' },
  { label: '外委二次判定', value: 'verifier_second_judge' },
  { label: '责任工程师二次判定', value: 'responsible_second_judge' },
  { label: '责任工程师三次判定', value: 'responsible_third_judge' },
  { label: '外委三次判定', value: 'verifier_third_judge' },
  { label: '责任工程师四次判定', value: 'responsible_fourth_judge' },
  { label: '外委报废处置', value: 'verifier_scrap_disposal' },
  { label: '报告待转办', value: 'manager_forward_confirm' },
  { label: '报告待确认', value: 'confirmer_confirm' }
])

/** 统一判定弹窗处理的节点集合。 */
const judgementNodeCodes = new Set([
  'verifier_second_judge',
  'responsible_second_judge',
  'responsible_third_judge',
  'verifier_third_judge',
  'responsible_fourth_judge'
])

const testPlanScenarioOptions: Array<{ label: string; value: PeriodicTestPlanScenario }> = [
  { label: '自检', value: 'self' },
  { label: '外委通用设备', value: 'external_common' },
  { label: '外委否通用设备', value: 'external_non_common' }
]

const selectedTestPlanScenarioName = computed(
  () => testPlanScenarioOptions.find((option) => option.value === testPlanScenario.value)?.label || '自检'
)

const exceptionActionOptions = [
  { label: '封存', value: 'seal' },
  { label: '缓检', value: 'defer' },
  { label: '非正常报废', value: 'scrap' },
  { label: '管理类别调整', value: 'category' },
  { label: '检定周期调整', value: 'cycle' }
]

const confirmerOptions = computed(() =>
  confirmers.value.map((user) => ({
    label: `${user.employeeName || user.employeeId} · ${user.employeeId}`,
    value: user.employeeId
  }))
)

const selectedConfirmer = computed(() => confirmers.value.find((user) => user.employeeId === confirmerId.value))

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

const canBatchException = computed(() => props.role === 'admin' && activeTab.value === 'todo')
const exceptionCandidates = computed(() => selectedTasks.value.filter(canSubmitPeriodicException))
const canSelectAdminTask = (task: PeriodicTaskVO) =>
  canSubmitPeriodicException(task) ||
  (task.currentNode === 'manager_forward_confirm' && task.taskStatus === 'wait_confirm')
const forwardCandidates = computed(() =>
  selectedTasks.value.filter(
    (task) => task.currentNode === 'manager_forward_confirm' && task.taskStatus === 'wait_confirm'
  )
)
const canSubmitForwardSelection = computed(
  () =>
    forwardCandidates.value.length > 0 &&
    forwardCandidates.value.length === selectedTasks.value.length &&
    Boolean(confirmerId.value)
)

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
    message.warning('只能选择待异常分流且尚未扫码的设备')
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

function confirmExceptionDispose(task: PeriodicTaskVO) {
  if (!canDisposePeriodicException(task)) {
    message.warning('状态变更流程尚未完成，暂不能关闭周检异常任务')
    return
  }
  Modal.confirm({
    title: `完成${task.exceptionFlowName || '异常'}处置`,
    content: `关联状态变更单 ${task.relatedChangeOrderId} 已审批完成后，方可关闭本次周检任务。`,
    okText: '确认完成',
    cancelText: '取消',
    async onOk() {
      submitting.value = true
      try {
        await exceptionDisposePeriodic(buildPeriodicExceptionDisposeRequest(task))
        message.success('周检异常任务已完成')
        await loadData()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '周检异常处置失败')
        throw error
      } finally {
        submitting.value = false
      }
    }
  })
}

/**
 * 读取当前任务的权威详情，供判定和报废弹窗展示完整上游记录。
 *
 * @param task 当前列表快照。
 */
async function loadAuthoritativeTask(task: PeriodicTaskVO) {
  try {
    const detail = await getPeriodicTask(task.id)
    activeTask.value = detail
    return detail
  } catch (error) {
    message.error(error instanceof Error ? error.message : '读取周检任务详情失败')
    return null
  }
}

/**
 * 根据后端返回的当前节点打开对应处理入口。
 *
 * @param task 当前待办任务。
 */
async function openProcess(task: PeriodicTaskVO) {
  if (activeTab.value === 'history') {
    openDetail(task)
    return
  }

  const node = String(task.currentNode || '')
  activeTask.value = task
  if (node === 'manager_forward_confirm') {
    forwardOpen.value = true
    return
  }
  if (props.role === 'verifier' && isPeriodicDualHandoverTask(task)) {
    return openScan('periodic-verifier-receive', task)
  }
  if (node === 'self_verify' || node === 'verification_record') {
    verifyOpen.value = true
    return
  }
  if (node === 'send_out') {
    const action = task.physicalStatus === 'wait_sendout_return_receive'
      ? 'periodic-send-out-return'
      : 'periodic-external-send-out'
    return openScan(action, task)
  }
  if (node === 'send_out_return') return openScan('periodic-send-out-return', task)
  if (node === 'supplier_fill_info') {
    supplierFillOpen.value = true
    return
  }
  if (node === 'verifier_fill_info') {
    externalVerifyOpen.value = true
    return
  }
  if (judgementNodeCodes.has(node)) {
    if (!await loadAuthoritativeTask(task)) return
    judgementOpen.value = true
    return
  }
  if (node === 'verifier_scrap_disposal') {
    if (!await loadAuthoritativeTask(task)) return
    scrapDisposalOpen.value = true
    return
  }
  if (node === 'confirmer_confirm') {
    confirmOpen.value = true
    return
  }
  if (node === 'exception_disposal') {
    confirmExceptionDispose(task)
    return
  }
  openDetail(task)
}

/**
 * 读取路由指定计划的权威状态快照。
 *
 * 未选择计划时不从任务列表猜测计划，避免把多个计划的明细误展示为同一计划汇总。
 */
async function loadPlanFlowSummary() {
  const planId = routePlanId.value
  if (!planId) {
    periodicFlowSummary.value = null
    return
  }

  try {
    periodicFlowSummary.value = await getPeriodicPlanFlowSummary(planId)
  } catch (error) {
    periodicFlowSummary.value = null
    message.error(error instanceof Error ? error.message : '周检状态汇总加载失败')
  }
}

async function loadConfirmers(tasks: PeriodicTaskVO[]) {
  if (props.role !== 'admin') {
    confirmers.value = []
    confirmerId.value = undefined
    return
  }
  const deptIds = Array.from(new Set(tasks.map((task) => task.deptId).filter((value): value is string => Boolean(value))))
  if (deptIds.length !== 1) {
    confirmers.value = []
    confirmerId.value = undefined
    return
  }
  loadingConfirmers.value = true
  try {
    confirmers.value = await listUsersByDeptAndRole(deptIds[0], 'CONFIRMER')
    if (!confirmers.value.some((user) => user.employeeId === confirmerId.value)) {
      confirmerId.value = undefined
    }
  } catch {
    confirmers.value = []
    confirmerId.value = undefined
  } finally {
    loadingConfirmers.value = false
  }
}

async function loadData() {
  loading.value = true
  selectedRowKeys.value = []
  selectedTasks.value = []
  /** 当前待办与参与记录的独立请求结果，不因单路失败互相清空。 */
  const taskResultsPromise = Promise.allSettled([listPeriodicMyTasks(), listPeriodicMyHistory()])
  /** 路由计划的权威汇总与任务列表并行读取。 */
  const planSummaryPromise = loadPlanFlowSummary()
  const [todoResult, historyResult] = await taskResultsPromise

  currentTasks.value = todoResult.status === 'fulfilled' ? todoResult.value : []
  historyTasks.value = historyResult.status === 'fulfilled' ? historyResult.value : []

  if (todoResult.status === 'rejected') {
    message.error(todoResult.reason instanceof Error ? todoResult.reason.message : '周检待办加载失败')
  }
  if (historyResult.status === 'rejected') {
    message.error(historyResult.reason instanceof Error ? historyResult.reason.message : '周检参与记录加载失败')
  }

  await Promise.all([
    planSummaryPromise,
    loadConfirmers(filterByRoutePlan([...currentTasks.value, ...historyTasks.value]))
  ])
  loading.value = false
}

async function submitForwardSelection() {
  if (forwardCandidates.value.length === 0) {
    message.warning('请选择报告待转办的周检设备')
    return
  }
  if (forwardCandidates.value.length !== selectedTasks.value.length) {
    message.warning('转发确认员时只能选择报告待转办记录')
    return
  }
  if (!samePlanId(forwardCandidates.value)) {
    message.warning('一次只能转办同一张周检计划内的设备')
    return
  }
  const deptIds = new Set(forwardCandidates.value.map((task) => String(task.deptId || '')))
  if (deptIds.size !== 1) {
    message.warning('一次只能转办同一使用部门的设备')
    return
  }
  if (!confirmerId.value) {
    message.warning('请选择确认员')
    return
  }

  submitting.value = true
  let completed = 0
  try {
    for (const task of forwardCandidates.value) {
      await managerForwardConfirmPeriodic({
        taskId: task.id,
        confirmerId: confirmerId.value,
        confirmerName: selectedConfirmer.value?.employeeName || confirmerId.value,
        opinion: '管理员转办确认员判定'
      })
      completed += 1
    }
    message.success(`已转办 ${completed} 台设备给确认员`)
  } catch (error) {
    const prefix = completed > 0 ? `已成功转办 ${completed} 台，` : ''
    message.error(`${prefix}${error instanceof Error ? error.message : '转办确认员失败'}`)
  } finally {
    selectedRowKeys.value = []
    selectedTasks.value = []
    await loadData()
    submitting.value = false
  }
}

async function generateTestTask() {
  generatingTestPlan.value = true
  try {
    const planId = await generatePeriodicTestPlan(testPlanScenario.value)
    await router.replace({
      path: route.path,
      query: {
        ...route.query,
        planId: String(planId)
      }
    })
    await loadData()
    message.success(`已在数智部王熙然名下生成${selectedTestPlanScenarioName.value}周检测试待办：${planId}`)
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

/**
 * 提交当前节点的统一判定，并重新读取后端权威待办。
 *
 * @param payload 判定结果与意见。
 */
async function handleJudgementSubmit(payload: PeriodicJudgementRequest) {
  const display = getPeriodicJudgementDisplay(activeTask.value?.currentNode)
  const successText = display ? `${display.roleName}第${display.round}次判定已提交` : '周检判定已提交'
  await runSubmit(() => submitPeriodicJudgement(payload), successText, () => {
    judgementOpen.value = false
  })
}

/**
 * 提交外委检定员报废处置，并重新读取后端权威待办。
 *
 * @param payload 报废原因与处理意见。
 */
async function handleScrapDisposalSubmit(payload: PeriodicScrapDisposalRequest) {
  await runSubmit(() => submitPeriodicScrapDisposal(payload), '报废处置已提交', () => {
    scrapDisposalOpen.value = false
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
  void loadPlanFlowSummary()
})
</script>

<template>
  <section class="periodic-workspace">
    <PeriodicPlanSummary :summary="periodicFlowSummary" :loading="loading" />

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
        <a-select
          v-if="role === 'admin' && activeTab === 'todo'"
          v-model:value="testPlanScenario"
          class="test-plan-scenario-select"
          :options="testPlanScenarioOptions"
        />
        <a-popconfirm
          v-if="role === 'admin' && activeTab === 'todo'"
          :title="`将创建一台${selectedTestPlanScenarioName}测试设备，归数智部王熙然管理，确认生成吗？`"
          ok-text="确认生成"
          cancel-text="取消"
          @confirm="generateTestTask"
        >
          <a-button :loading="generatingTestPlan">生成周检待办</a-button>
        </a-popconfirm>
        <a-select
          v-if="canBatchException"
          v-model:value="confirmerId"
          class="confirmer-select"
          :loading="loadingConfirmers"
          :options="confirmerOptions"
          placeholder="转发确认员"
          show-search
          option-filter-prop="label"
        />
        <a-popconfirm
          v-if="canBatchException"
          title="确认将选中的报告转办给该确认员吗？"
          ok-text="确认"
          cancel-text="取消"
          @confirm="submitForwardSelection"
        >
          <a-button type="primary" :loading="submitting" :disabled="!canSubmitForwardSelection">确认</a-button>
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
        :selectable-task="canSelectAdminTask"
        :selected-row-keys="selectedRowKeys"
        @selection-change="updateSelection"
        @detail="openDetail"
        @process="openProcess"
      />
    </a-card>

    <PeriodicDetailDialog v-model:open="detailOpen" :task="activeTask" title="周检任务详情" />
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
    <PeriodicJudgementDialog
      v-model:open="judgementOpen"
      :task="activeTask"
      :submitting="submitting"
      @submit="handleJudgementSubmit"
    />
    <PeriodicScrapDisposalDialog
      v-model:open="scrapDisposalOpen"
      :task="activeTask"
      :submitting="submitting"
      @submit="handleScrapDisposalSubmit"
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
  flex-wrap: wrap;
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

.test-plan-scenario-select {
  width: 170px;
}

.confirmer-select {
  width: 180px;
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
  .keyword-input,
  .test-plan-scenario-select,
  .confirmer-select,
  .exception-action-select {
    width: 100%;
  }
}
</style>
