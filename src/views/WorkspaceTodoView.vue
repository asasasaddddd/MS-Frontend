<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { SelectProps } from 'ant-design-vue'
import WorkspaceTodoDashboard from '@/components/workflow/WorkspaceTodoDashboard.vue'
import PeriodicPlanPickerDialog from '@/views/periodic/components/PeriodicPlanPickerDialog.vue'
import { useRoleTodoDashboard } from '@/composables/useRoleTodoDashboard'
import { useWorkflowTask, type WorkflowBoundDetail } from '@/composables/useWorkflowTask'
import {
  useWorkspaceTodoLoad,
  type WorkspaceTodoLoadSnapshot
} from '@/composables/useWorkspaceTodoLoad'
import { roleNameMap, type RoleCode } from '@/types/common'
import type { WorkflowTask, WorkflowTodoContainer } from '@/types/workflow'
import type { PeriodicTaskVO, PeriodicTodoPlanEntry } from '@/types/periodic'
import type { SamplingTaskVO } from '@/types/sampling'
import type { ProductSupportOrderVO } from '@/types/productSupport'
import type { FirstCheckOrder } from '@/types/firstcheck'
import type { ChangeOrderVO } from '@/types/change'
import { useSessionStore } from '@/stores/session'
import { useTodoNotificationStore } from '@/stores/todoNotification'
import { matchesBusinessType } from '@/workflows/metrologyWorkflow'
import {
  buildPeriodicPlanSubtitle,
  buildPeriodicPlanPickerItems,
  buildPeriodicPlanTodoGroups,
  derivePeriodicPlanLabel
} from '@/views/periodic/periodicDisplayModel'
import { changeTypeName } from '@/views/change/changeDisplayModel'
import {
  dedupeTodoEntriesByKey,
  filterTasksWithLoadedDetails,
  filterVisibleTodoEntries,
  getWorkspaceLaunchActions,
  shouldShowWorkspaceTaskSections,
  visibleTodoTypeValues,
  workspaceTodoBusinessType,
  workspaceTodoTypeFromQuery,
  type WorkspaceTodoType
} from '@/views/workspaceTodoModel'
import {
  getTodoModuleAdapter,
  loadTodoContainers,
  loadTodoModuleDetail
} from '@/views/workspaceTodoAdapters'

type TodoType = WorkspaceTodoType
type TodoColor = 'orange' | 'blue' | 'red' | 'green'

interface TodoDefinition {
  key?: string
  type: Exclude<TodoType, 'all'>
  title: string
  detailTitle?: string
  count: number
  unit: string
  color: TodoColor
  alwaysVisible?: boolean
  roles: RoleCode[]
  routeByRole: Partial<Record<RoleCode, string>>
  query?: Record<string, string>
}

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const todoNotifications = useTodoNotificationStore()
const activeBucket = ref<'todo' | 'history'>('todo')
const selectedType = ref<TodoType>(workspaceTodoTypeFromQuery(route.query.type))
const keyword = ref('')
const periodicPlanPickerOpen = ref(false)
const periodicTasks = ref<PeriodicTaskVO[]>([])
const periodicHistoryTasks = ref<PeriodicTaskVO[]>([])
const todoContainers = ref<WorkflowTodoContainer[]>([])
const todoContainerLoadFailed = ref(false)
const samplingTasks = ref<SamplingTaskVO[]>([])
const samplingHistoryTasks = ref<SamplingTaskVO[]>([])
const productSupportTasks = ref<ProductSupportOrderVO[]>([])
const productSupportHistoryTasks = ref<ProductSupportOrderVO[]>([])
const firstCheckOrders = ref<Record<string, FirstCheckOrder>>({})
const changeOrders = ref<Record<string, ChangeOrderVO>>({})

const roleCode = computed(() => session.user?.roleCode as RoleCode | undefined)
const showWorkspaceTaskSections = computed(() => shouldShowWorkspaceTaskSections(roleCode.value))
const workflowIdentity = computed(() => {
  const user = session.user
  return user && showWorkspaceTaskSections.value ? `${user.employeeId}|${user.roleCode}` : ''
})
const selectedWorkflowBusinessType = computed(() => workspaceTodoBusinessType(selectedType.value))
const dashboardQuery = computed(() => ({
  businessType: selectedWorkflowBusinessType.value
}))
const {
  dashboard: todoDashboard,
  loading: todoDashboardLoading,
  error: todoDashboardError,
  refresh: refreshTodoDashboard
} = useRoleTodoDashboard({
  identityKey: workflowIdentity,
  selectedType,
  query: dashboardQuery
})
const {
  todoTasks: workflowTasks,
  handledTasks: workflowHistoryTasks,
  refresh: refreshWorkflowTasks,
  loadDetails: loadWorkflowDetails
} = useWorkflowTask({
  identityKey: workflowIdentity,
  views: ['todo', 'handled'],
  immediate: false
})
const roleLabel = computed(() => {
  const role = session.user?.roleCode || ''
  return roleNameMap[role] || session.user?.roleName || role || '-'
})
const launchActions = computed(() => getWorkspaceLaunchActions(roleCode.value))
const periodicTodoPlans = computed<PeriodicTodoPlanEntry[]>(() =>
  todoContainers.value.filter((container) => matchesBusinessType(container.businessType, 'periodic'))
)
const periodicPlanPickerItems = computed(() => buildPeriodicPlanPickerItems(
  periodicTasks.value,
  periodicTodoPlans.value
))

const filterOptions: SelectProps['options'] = [
  { label: '全部类型', value: 'all' },
  { label: '首次检定', value: 'firstcheck' },
  { label: '周检计划', value: 'periodic' },
  { label: '状态变更', value: 'change' },
  { label: '抽检计划', value: 'sampling' },
  { label: '产品配套', value: 'productSupport' }
]

const firstCheckHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = getTodoModuleAdapter('firstcheck').historyRoute(currentRole)
  if (!currentRole || !path || currentRole === 'EXTERNAL_OPERATOR') return []

  return filterTasksWithLoadedDetails(
    workflowHistoryTasks.value.filter((task) => matchesBusinessType(task.businessType, 'firstcheck')),
    firstCheckOrders.value
  )
    .map((task) => {
      const orderId = String(task.businessId)
      const order = firstCheckOrders.value[orderId]
      return {
        key: `firstcheck-${orderId}`,
        type: 'firstcheck' as const,
        title: `首检单 ${order?.orderNo || orderId}`,
        detailTitle: [task.nodeName, task.completedAt?.replace('T', ' ').slice(0, 16), order?.currentNodeName]
          .filter(Boolean)
          .join(' · '),
        count: 1,
        unit: '单',
        color: 'green' as TodoColor,
        roles: [currentRole],
        routeByRole: { [currentRole]: path },
        query: { orderId, tab: 'history' }
      }
    })
})

const changeHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = getTodoModuleAdapter('change').historyRoute(currentRole)
  if (!currentRole || !path) return []

  return filterTasksWithLoadedDetails(
    workflowHistoryTasks.value.filter((task) => matchesBusinessType(task.businessType, 'change')),
    changeOrders.value
  )
    .map((task) => {
      const orderId = String(task.businessId)
      const order = changeOrders.value[orderId]
      return {
        key: `change-${orderId}`,
        type: 'change' as const,
        title: `状态变更单 ${order?.orderNo || orderId}`,
        detailTitle: [order?.changeType ? changeTypeName(order.changeType) : undefined, task.nodeName, task.completedAt?.replace('T', ' ').slice(0, 16)]
          .filter(Boolean)
          .join(' · '),
        count: 1,
        unit: '单',
        color: 'green' as TodoColor,
        roles: [currentRole],
        routeByRole: { [currentRole]: path },
        query: { orderId, tab: 'history' }
      }
    })
})

const periodicPlanPickerIncomplete = computed(() =>
  todoContainerLoadFailed.value
)

const periodicHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = getTodoModuleAdapter('periodic').historyRoute(currentRole)
  if (!currentRole || !path) return []
  const handledTasks = periodicHistoryTasks.value

  return buildPeriodicPlanTodoGroups(handledTasks).map(({ planId, tasks, deviceCount }) => ({
    key: `periodic-${planId}`,
    type: 'periodic' as const,
    title: `周检单 ${derivePeriodicPlanLabel(planId, tasks)}`,
    detailTitle: buildPeriodicPlanSubtitle(tasks),
    count: deviceCount,
    unit: '台',
    color: 'green' as TodoColor,
    roles: [currentRole],
    routeByRole: { [currentRole]: path },
    query: planId.startsWith('task-')
      ? { tab: 'history' }
      : { planId, tab: 'history' } as Record<string, string>
  }))
})

function samplingPlanGroupKey(task: SamplingTaskVO) {
  if (task.planId !== undefined && task.planId !== null && task.planId !== '') return String(task.planId)
  return `task-${task.id}`
}

function deriveSamplingPlanLabel(planId: string, tasks: SamplingTaskVO[]) {
  const planNo = tasks.find((task) => task.planNo)?.planNo?.trim()
  if (planNo) return planNo
  const planName = tasks.find((task) => task.planName)?.planName?.trim()
  if (planName) return planName
  return planId.replace(/^task-/, '')
}

function buildSamplingPlanSubtitle(tasks: SamplingTaskVO[]) {
  const nodes = Array.from(
    new Set(
      tasks
        .map((task) => task.currentNode || task.taskStatus)
        .filter((value): value is string => Boolean(value))
    )
  )
  const deviceText = `共 ${tasks.length} 台设备`
  if (nodes.length === 0) return deviceText
  return `${deviceText} · ${nodes.slice(0, 2).join(' / ')}${nodes.length > 2 ? ' 等' : ''}`
}

const samplingHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = getTodoModuleAdapter('sampling').historyRoute(currentRole)
  if (!currentRole || !path || currentRole === 'PLANNER') return []

  const groups = new Map<string, SamplingTaskVO[]>()
  samplingHistoryTasks.value.forEach((task) => {
    const key = samplingPlanGroupKey(task)
    const list = groups.get(key) || []
    list.push(task)
    groups.set(key, list)
  })
  return Array.from(groups.entries()).map(([planId, tasks]) => ({
    key: `sampling-${planId}`,
    type: 'sampling' as const,
    title: `C类抽检计划 ${deriveSamplingPlanLabel(planId, tasks)}`,
    detailTitle: buildSamplingPlanSubtitle(tasks),
    count: tasks.length,
    unit: '台',
    color: 'green' as TodoColor,
    roles: [currentRole],
    routeByRole: { [currentRole]: path },
    query: planId.startsWith('task-')
      ? { tab: 'history' }
      : { planId, tab: 'history' } as Record<string, string>
  }))
})

const productSupportHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = getTodoModuleAdapter('productSupport').historyRoute(currentRole)
  if (!currentRole || !path) return []

  return productSupportHistoryTasks.value.map((order) => {
    const orderId = String(order.id)
    return {
      key: `product-support-${orderId}`,
      type: 'productSupport' as const,
      title: `产品配套单 ${order.orderNo || order.contractNo || orderId}`,
      detailTitle: [order.contractNo, order.projectNo, order.currentNodeName || order.currentNode].filter(Boolean).join(' / '),
      count: 1,
      unit: '单',
      color: 'green' as TodoColor,
      roles: [currentRole],
      routeByRole: { [currentRole]: path },
      query: { orderId, tab: 'history' }
    }
  })
})

const permittedHistory = computed(() => {
  const currentRole = roleCode.value
  if (!currentRole) return []
  return filterVisibleTodoEntries(
    dedupeTodoEntriesByKey([
      ...firstCheckHistoryEntries.value,
      ...changeHistoryEntries.value,
      ...periodicHistoryEntries.value,
      ...samplingHistoryEntries.value,
      ...productSupportHistoryEntries.value
    ])
  )
})

const filteredHistory = computed(() => {
  const text = keyword.value.trim()
  return permittedHistory.value.filter((item) => {
    const matchesType = selectedType.value === 'all' || item.type === selectedType.value
    const matchesKeyword = !text || item.title.includes(text) || Boolean(item.detailTitle?.includes(text))
    return matchesType && matchesKeyword
  })
})

const visibleFilterOptions = computed(() => {
  const types = new Set<TodoType>(visibleTodoTypeValues(permittedHistory.value))
  return filterOptions.filter((option) => types.has(option.value as TodoType))
})

function resetFilter() {
  selectedType.value = 'all'
  keyword.value = ''
}

function selectTodoType(type: WorkspaceTodoType) {
  selectedType.value = type
}

function openDashboardBusiness(type: Exclude<WorkspaceTodoType, 'all'>) {
  if (type === 'periodic') {
    periodicPlanPickerOpen.value = true
    return
  }
  const target = getTodoModuleAdapter(type).todoRoute(roleCode.value)
  if (target) {
    void router.push(target)
    return
  }
  void router.push({ path: '/todo', query: { type } })
}

function openPeriodicPlan(containerId: string) {
  const currentRole = roleCode.value
  const routeTarget = currentRole
    ? getTodoModuleAdapter('periodic').todoRoute(currentRole)
    : undefined
  if (!routeTarget || routeTarget.path === '/todo') {
    message.error('当前角色没有可进入的周检工作台')
    return
  }

  periodicPlanPickerOpen.value = false
  void router.push({
    path: routeTarget.path,
    query: { ...(routeTarget.query || {}), planId: containerId, containerId }
  })
}

function openTodo(item: TodoDefinition) {
  const currentRole = roleCode.value
  const path = currentRole ? item.routeByRole[currentRole] : undefined
  if (path) {
    router.push({ path, query: item.query })
  }
}

/** 清空上一激活角色的待办、已办及详情快照。 */
function clearWorkspaceSummary() {
  periodicPlanPickerOpen.value = false
  workflowTasks.value = []
  workflowHistoryTasks.value = []
  periodicTasks.value = []
  periodicHistoryTasks.value = []
  todoContainers.value = []
  todoContainerLoadFailed.value = false
  samplingTasks.value = []
  samplingHistoryTasks.value = []
  productSupportTasks.value = []
  productSupportHistoryTasks.value = []
  firstCheckOrders.value = {}
  changeOrders.value = {}
}

function applyWorkspaceSnapshot(
  snapshot: WorkspaceTodoLoadSnapshot<WorkflowBoundDetail<object>> | null
) {
  clearWorkspaceSummary()
  if (!snapshot) return

  workflowTasks.value = snapshot.todoTasks
  workflowHistoryTasks.value = snapshot.handledTasks
  todoContainers.value = snapshot.todoContainers
  todoContainerLoadFailed.value = snapshot.todoContainerLoadFailed
  if (snapshot.workflowLoadFailed) return

  const allTasks = [...snapshot.todoTasks, ...snapshot.handledTasks]
  const details = snapshot.details

  const detailByTaskId = new Map(details.map((detail) => [String(detail.workflowTaskId), detail]))
  const detailsFor = <T extends object>(tasks: WorkflowTask[]) => tasks
    .map((task) => detailByTaskId.get(String(task.taskId)) as WorkflowBoundDetail<T> | undefined)
    .filter((detail): detail is WorkflowBoundDetail<T> => Boolean(detail))

  periodicTasks.value = detailsFor<PeriodicTaskVO>(
    workflowTasks.value.filter((task) => matchesBusinessType(task.businessType, 'periodic'))
  )
  periodicHistoryTasks.value = detailsFor<PeriodicTaskVO>(
    workflowHistoryTasks.value.filter((task) => matchesBusinessType(task.businessType, 'periodic'))
  )
  samplingTasks.value = detailsFor<SamplingTaskVO>(
    workflowTasks.value.filter((task) => matchesBusinessType(task.businessType, 'sampling'))
  )
  samplingHistoryTasks.value = detailsFor<SamplingTaskVO>(
    workflowHistoryTasks.value.filter((task) => matchesBusinessType(task.businessType, 'sampling'))
  )
  productSupportTasks.value = detailsFor<ProductSupportOrderVO>(
    workflowTasks.value.filter((task) => matchesBusinessType(task.businessType, 'productSupport'))
  )
  productSupportHistoryTasks.value = detailsFor<ProductSupportOrderVO>(
    workflowHistoryTasks.value.filter((task) => matchesBusinessType(task.businessType, 'productSupport'))
  )

  firstCheckOrders.value = detailsFor<FirstCheckOrder>(allTasks.filter((task) => matchesBusinessType(task.businessType, 'firstcheck')))
    .reduce<Record<string, FirstCheckOrder>>((next, order) => {
      next[String(order.id)] = order
      return next
    }, {})
  changeOrders.value = detailsFor<ChangeOrderVO>(allTasks.filter((task) => matchesBusinessType(task.businessType, 'change')))
    .reduce<Record<string, ChangeOrderVO>>((next, order) => {
      next[String(order.id)] = order
      return next
    }, {})
}

const workspaceInvalidationVersion = computed(() => todoNotifications.invalidationVersion)
const { snapshot: workspaceSnapshot } = useWorkspaceTodoLoad<WorkflowBoundDetail<object>>({
  identityKey: workflowIdentity,
  invalidationVersion: workspaceInvalidationVersion,
  dependencies: {
    loadTasks: async () => {
      await refreshWorkflowTasks()
      return {
        todoTasks: [...workflowTasks.value],
        handledTasks: [...workflowHistoryTasks.value]
      }
    },
    loadContainers: (_identityKey, signal) => loadTodoContainers(signal),
    loadDetails: (_identityKey, tasks) => loadWorkflowDetails<object>(tasks, loadTodoModuleDetail)
  }
})

watch(workspaceSnapshot, applyWorkspaceSnapshot, { immediate: true })

function openLaunch(path: string) {
  router.push(path)
}

watch(
  () => route.query.type,
  (type) => {
    selectedType.value = workspaceTodoTypeFromQuery(type)
  }
)
</script>

<template>
  <section class="todo-page">
    <a-card v-if="route.path === '/todo' && launchActions.length > 0" class="launch-panel" :bordered="false">
      <template #title>
        <h2>业务发起</h2>
      </template>
      <div v-for="action in launchActions" :key="action.key" class="launch-item">
        <div>
          <strong>{{ action.title }}</strong>
          <p>{{ action.description }}</p>
        </div>
        <a-button type="primary" @click="openLaunch(action.path)">进入申请</a-button>
      </div>
    </a-card>

    <a-tabs
      v-if="showWorkspaceTaskSections && route.path === '/todo'"
      v-model:active-key="activeBucket"
      class="workspace-task-tabs"
      @change="resetFilter"
    >
      <a-tab-pane key="todo" tab="我的待办" />
      <a-tab-pane key="history" tab="我的已办" />
    </a-tabs>

    <WorkspaceTodoDashboard
      v-if="showWorkspaceTaskSections && route.path === '/todo' && activeBucket === 'todo'"
      :dashboard="todoDashboard"
      :selected-type="selectedType"
      :loading="todoDashboardLoading"
      :error="todoDashboardError"
      @retry="refreshTodoDashboard"
      @select-type="selectTodoType"
      @open="openDashboardBusiness"
    />

    <a-card
      v-if="showWorkspaceTaskSections && route.path === '/todo' && activeBucket === 'history'"
      class="todo-panel"
      :bordered="false"
    >
      <template #title>
        <h2>已办记录</h2>
      </template>

      <div class="task-filter">
        <a-select v-model:value="selectedType" class="type-select" :options="visibleFilterOptions" />
        <a-input v-model:value="keyword" class="keyword-input" placeholder="按事项模糊查询" allow-clear />
        <a-button type="primary">查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
      </div>

      <div v-if="filteredHistory.length > 0" class="task-list">
        <div v-for="item in filteredHistory" :key="item.key || item.type" class="task-item">
          <div class="task-item-body">
            <div class="task-title">
              <strong>{{ item.title }}</strong>
            </div>
            <div class="task-sub">{{ item.detailTitle || `当前角色：${roleLabel}` }}</div>
          </div>
          <div class="task-item-right">
            <a-tag :class="['count-pill', item.color]">{{ item.count }} {{ item.unit }}</a-tag>
            <a-button type="link" class="view-link" @click="openTodo(item)">查看详情</a-button>
          </div>
        </div>
      </div>

      <a-empty
        v-else
        class="todo-empty"
        description="当前角色暂无该类型已办记录"
      />
    </a-card>

    <PeriodicPlanPickerDialog
      v-model:open="periodicPlanPickerOpen"
      :items="periodicPlanPickerItems"
      :incomplete="periodicPlanPickerIncomplete"
      @select="openPeriodicPlan"
    />

  </section>
</template>

<style scoped>
.todo-page {
  display: grid;
  gap: 16px;
}

.launch-panel {
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.launch-panel :deep(.ant-card-head) {
  min-height: 56px;
  padding: 0 18px;
  border-bottom: 1px solid #e5eaf1;
}

.launch-panel :deep(.ant-card-body) {
  padding: 14px 18px;
}

.launch-panel h2 {
  margin: 0;
  color: #172033;
  font-size: 18px;
  font-weight: 800;
}

.launch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.launch-item strong {
  color: #172033;
  font-size: 16px;
}

.launch-item p {
  margin: 4px 0 0;
  color: #667085;
  font-size: 12px;
}

.todo-panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.todo-panel :deep(.ant-card-head) {
  min-height: 56px;
  padding: 0 18px;
  border-bottom: 1px solid #e5eaf1;
}

.todo-panel :deep(.ant-card-body) {
  padding: 0;
}

.todo-panel h2 {
  margin: 0;
  color: #172033;
  font-size: 18px;
  font-weight: 800;
}

.workspace-task-tabs :deep(.ant-tabs-nav) {
  padding: 0 18px;
}

.task-filter {
  display: grid;
  grid-template-columns: 200px minmax(220px, 1fr) auto auto;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid #e5eaf1;
  background: #fbfcfe;
}

.type-select,
.keyword-input {
  width: 100%;
}

.task-list {
  padding: 8px 18px 12px;
}

.task-item {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #e5eaf1;
}

.task-item:last-child {
  border-bottom: 0;
}

.task-item-body {
  min-width: 0;
}

.task-title {
  color: #172033;
  font-size: 16px;
}

.task-sub {
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
}

.task-item-right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.count-pill {
  min-width: 56px;
  justify-content: center;
  border-radius: 999px;
  font-weight: 700;
}

.count-pill.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.count-pill.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.count-pill.red {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

.count-pill.green {
  border-color: #b7e4c7;
  background: #ecfdf3;
  color: #027a48;
}

.view-link {
  padding: 0;
  color: #1769e0;
}

.todo-empty {
  padding: 42px 0;
}

.building-panel {
  padding: 18px;
}

.building-panel :deep(.ant-card-body) {
  padding: 0;
}

.building-panel p {
  margin: 10px 0 0;
  color: #667085;
}

@media (max-width: 980px) {
  .task-filter {
    grid-template-columns: 1fr;
  }

  .task-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
