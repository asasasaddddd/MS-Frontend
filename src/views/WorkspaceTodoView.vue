<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { SelectProps } from 'ant-design-vue'
import { getFirstCheckDetail } from '@/api/firstcheck'
import { listUnifiedScanInbox } from '@/api/scan'
import { getChangeOrderDetail } from '@/api/change'
import { getPeriodicTask } from '@/api/periodic'
import { parsePeriodicNodeCode } from '@/api/periodicContract'
import { getSamplingTask } from '@/api/sampling'
import { getProductSupportOrder } from '@/api/productSupport'
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import { useRoleTodoSummary } from '@/composables/useRoleTodoSummary'
import { hasWorkflowAction, useWorkflowTask, type WorkflowBoundDetail } from '@/composables/useWorkflowTask'
import { roleNameMap, type RoleCode } from '@/types/common'
import type { WorkflowTask } from '@/types/workflow'
import type { PeriodicTaskVO } from '@/types/periodic'
import type { SamplingTaskVO } from '@/types/sampling'
import type { ProductSupportOrderVO } from '@/types/productSupport'
import type { FirstCheckOrder } from '@/types/firstcheck'
import type { ChangeOrderVO } from '@/types/change'
import type { UnifiedScanInboxItem } from '@/types/scan'
import { useSessionStore } from '@/stores/session'
import {
  isPendingWorkflowTask,
  matchesBusinessType
} from '@/workflows/metrologyWorkflow'
import {
  buildPeriodicPlanTodoGroups,
  mergePeriodicTaskPhysicalActions
} from '@/views/periodic/periodicDisplayModel'
import { changeTypeName } from '@/views/change/changeDisplayModel'
import {
  countTodoItemsWithPhysicalActions,
  countFirstCheckTodoItems,
  countUniqueBusinessTasks,
  dedupeTodoEntriesByKey,
  filterTasksWithLoadedDetails,
  filterVisibleTodoEntries,
  getPendingFirstCheckTakeBackRows,
  getChangeTaskRoute,
  getWorkspaceFixedTodoRoute,
  getWorkspaceRoleTodoPath,
  getWorkspaceLaunchActions,
  sumWorkspaceTodoCounts,
  uniqueTasksByBusinessId,
  visibleTodoTypeValues,
  workspaceTodoBusinessType,
  workspaceTodoTypeFromQuery,
  type WorkspaceTodoType
} from '@/views/workspaceTodoModel'

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
const activeBucket = ref<'todo' | 'history'>('todo')
const selectedType = ref<TodoType>(workspaceTodoTypeFromQuery(route.query.type))
const keyword = ref('')
const periodicTasks = ref<PeriodicTaskVO[]>([])
const periodicHistoryTasks = ref<PeriodicTaskVO[]>([])
const samplingTasks = ref<SamplingTaskVO[]>([])
const samplingHistoryTasks = ref<SamplingTaskVO[]>([])
const productSupportTasks = ref<ProductSupportOrderVO[]>([])
const productSupportHistoryTasks = ref<ProductSupportOrderVO[]>([])
const firstCheckOrders = ref<Record<string, FirstCheckOrder>>({})
const changeOrders = ref<Record<string, ChangeOrderVO>>({})
const scanInboxRows = ref<UnifiedScanInboxItem[]>([])

const roleCode = computed(() => session.user?.roleCode as RoleCode | undefined)
const workflowIdentity = computed(() => {
  const user = session.user
  return user ? `${user.employeeId}|${user.roleCode}` : ''
})
const selectedWorkflowBusinessType = computed(() => workspaceTodoBusinessType(selectedType.value))
const summaryQuery = computed(() => ({
  businessType: selectedWorkflowBusinessType.value
}))
const {
  summary: todoSummary,
  loading: todoSummaryLoading,
  error: todoSummaryError
} = useRoleTodoSummary({
  identityKey: workflowIdentity,
  query: summaryQuery
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

const filterOptions: SelectProps['options'] = [
  { label: '全部类型', value: 'all' },
  { label: '首次检定', value: 'firstcheck' },
  { label: '周检计划', value: 'periodic' },
  { label: '状态变更', value: 'change' },
  { label: '抽检计划', value: 'sampling' },
  { label: '产品配套', value: 'productSupport' }
]

const productSupportRouteByRole: Partial<Record<RoleCode, string>> = {
  VERIFIER_SELF: '/product-support/verifier',
  VERIFIER_EXTERNAL: '/product-support/verifier'
}

const firstCheckTodoEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  if (!currentRole) return []
  const routeTarget = getWorkspaceFixedTodoRoute('firstcheck', currentRole)

  const tasks = uniqueTasksByBusinessId(workflowTasks.value
    .filter((task) => isPendingWorkflowTask(task))
    .filter((task) => matchesBusinessType(task.businessType, 'firstcheck')))
  const taskCount = countUniqueBusinessTasks(tasks)
  const firstCheckTakeBackRows = getPendingFirstCheckTakeBackRows(scanInboxRows.value)
  const takeBackCount = firstCheckTakeBackRows.length
  const totalFirstCheckTodoCount = countFirstCheckTodoItems(taskCount, firstCheckTakeBackRows)
  const waitingReceiveCount = tasks.filter(
    (task) => !hasWorkflowAction(task, task.operationCode)
  ).length
  const workflowDetailTitle = taskCount === 0
    ? '当前共 0 张首检单待处理'
    : waitingReceiveCount > 0
      ? `当前共 ${taskCount} 张首检单待处理，其中 ${waitingReceiveCount} 张待接收`
      : `当前共 ${taskCount} 张首检单待处理`
  const detailTitle = takeBackCount > 0
    ? `${workflowDetailTitle}，另有 ${takeBackCount} 台待取回`
    : workflowDetailTitle

  return [{
    key: 'firstcheck-todo-summary',
    type: 'firstcheck' as const,
    title: '首次检定',
    detailTitle,
    count: totalFirstCheckTodoCount,
    unit: '项',
    color: 'orange' as TodoColor,
    alwaysVisible: true,
    roles: [currentRole],
    routeByRole: { [currentRole]: routeTarget.path },
    query: currentRole === 'EXTERNAL_OPERATOR'
      ? { module: 'firstcheck', action: 'sendout', view: 'list' }
      : routeTarget.query
  }]
})

const firstCheckHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = getWorkspaceRoleTodoPath('firstcheck', currentRole)
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

const changeTodoEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  if (!currentRole) return []
  const routeTarget = getWorkspaceFixedTodoRoute('change', currentRole)

  const tasks = uniqueTasksByBusinessId(workflowTasks.value
    .filter((task) => isPendingWorkflowTask(task))
    .filter((task) => matchesBusinessType(task.businessType, 'change')))
  const taskCount = countUniqueBusinessTasks(tasks)

  return [{
    key: 'change-todo-summary',
    type: 'change' as const,
    title: '状态变更',
    detailTitle: `当前共 ${taskCount} 张状态变更单待处理`,
    count: taskCount,
    unit: '单',
    color: 'blue' as TodoColor,
    alwaysVisible: true,
    roles: [currentRole],
    routeByRole: { [currentRole]: routeTarget.path },
    query: routeTarget.query
  }]
})

const changeHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = getChangeTaskRoute(currentRole)
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

function derivePeriodicPlanLabel(planId: string, tasks: PeriodicTaskVO[]) {
  const taskNo = tasks.find((task) => task.taskNo)?.taskNo?.trim()
  if (taskNo && taskNo.length > 4) {
    return taskNo.replace(/\d{4}$/, '') || taskNo
  }
  return planId.replace(/^task-/, '')
}

function buildPeriodicPlanSubtitle(tasks: PeriodicTaskVO[]) {
  const nodes = Array.from(
    new Set(
      tasks
        .map((task) => task.currentNodeName || task.currentNode)
        .filter((value): value is string => Boolean(value))
    )
  )
  if (nodes.length === 0) return `共 ${tasks.length} 台设备`
  const nodeText = nodes.slice(0, 2).join(' / ')
  return `共 ${tasks.length} 台设备 · ${nodeText}${nodes.length > 2 ? ' 等' : ''}`
}

const periodicTodoEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  if (!currentRole) return []
  const routeTarget = getWorkspaceFixedTodoRoute('periodic', currentRole)

  const workflowPeriodicTasks = workflowTasks.value
    .filter((task) => isPendingWorkflowTask(task))
    .filter((task) => matchesBusinessType(task.businessType, 'periodic'))
  const workflowDeviceCount = countUniqueBusinessTasks(workflowPeriodicTasks)
  const physicalDeviceCount = countTodoItemsWithPhysicalActions(
    workflowPeriodicTasks,
    scanInboxRows.value,
    'periodic'
  )
  const groups = buildPeriodicPlanTodoGroups(periodicTasks.value)
  const detailDeviceCount = groups.reduce((sum, group) => sum + group.deviceCount, 0)
  const deviceCount = Math.max(detailDeviceCount, workflowDeviceCount, physicalDeviceCount)
  const color: TodoColor = periodicTasks.value.some((task) =>
    task.taskStatus === 'exception' || task.currentNode === 'verifier_scrap_disposal')
    ? 'red'
    : 'orange'

  return [{
    key: 'periodic-todo-summary',
    type: 'periodic' as const,
    title: '周检计划',
    detailTitle: groups.length === 0
      ? '当前共 0 张周检单待处理'
      : `当前共 ${groups.length} 张周检单、${deviceCount} 台设备待处理`,
    count: deviceCount,
    unit: '台',
    color,
    alwaysVisible: true,
    roles: [currentRole],
    routeByRole: { [currentRole]: routeTarget.path },
    query: routeTarget.query
  }]
})

const periodicHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = getWorkspaceRoleTodoPath('periodic', currentRole)
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

const samplingTodoEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  if (!currentRole) return []
  const routeTarget = getWorkspaceFixedTodoRoute('sampling', currentRole)

  const workflowSamplingTasks = workflowTasks.value
    .filter((task) => isPendingWorkflowTask(task))
    .filter((task) => matchesBusinessType(task.businessType, 'sampling'))
  const workflowDeviceCount = countUniqueBusinessTasks(workflowSamplingTasks)
  const groups = new Map<string, SamplingTaskVO[]>()
  samplingTasks.value.forEach((task) => {
    const key = samplingPlanGroupKey(task)
    const list = groups.get(key) || []
    list.push(task)
    groups.set(key, list)
  })

  const detailDeviceCount = Array.from(groups.values())
    .reduce((sum, tasks) => sum + tasks.length, 0)
  const deviceCount = Math.max(detailDeviceCount, workflowDeviceCount)
  const color: TodoColor = samplingTasks.value.some(
    (task) => task.taskStatus === 'rejected' || task.taskStatus === 'cancelled'
  ) ? 'red' : 'orange'

  return [{
    key: 'sampling-todo-summary',
    type: 'sampling' as const,
    title: 'C类物资抽检',
    detailTitle: groups.size === 0
      ? '当前共 0 张 C 类抽检单待处理'
      : `当前共 ${groups.size} 张C类抽检单、${deviceCount} 台设备待处理`,
    count: deviceCount,
    unit: '台',
    color,
    alwaysVisible: true,
    roles: [currentRole],
    routeByRole: { [currentRole]: routeTarget.path },
    query: routeTarget.query
  }]
})

const samplingHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = getWorkspaceRoleTodoPath('sampling', currentRole)
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

const productSupportTodoEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = currentRole ? productSupportRouteByRole[currentRole] : undefined
  if (!currentRole || !path) return []

  return productSupportTasks.value
    .map((order) => {
      const orderId = String(order.id)
      const titleNo = order.orderNo || order.contractNo || orderId
      const detailTitle = [
        order.contractNo,
        order.projectNo,
        order.currentNodeName || order.currentNode,
        order.ratioCount ? `${order.ratioCount}类抽检比例` : undefined,
        order.itemCount ? `${order.itemCount}项明细` : undefined
      ]
        .filter(Boolean)
        .join(' / ')

      return {
        key: `product-support-${orderId}`,
        type: 'productSupport' as const,
        title: `产品配套单 ${titleNo}`,
        detailTitle,
        count: 1,
        unit: '单',
        color: (order.orderStatus === 'completed' ? 'green' : 'orange') as TodoColor,
        roles: [currentRole],
        routeByRole: { [currentRole]: path },
        query: { orderId }
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans'))
})

const productSupportHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = currentRole ? productSupportRouteByRole[currentRole] : undefined
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

const permittedTodos = computed(() => {
  const currentRole = roleCode.value
  if (!currentRole) return []
  return filterVisibleTodoEntries(
    dedupeTodoEntriesByKey([
      ...firstCheckTodoEntries.value,
      ...periodicTodoEntries.value,
      ...changeTodoEntries.value,
      ...samplingTodoEntries.value,
      ...productSupportTodoEntries.value
    ])
  )
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

const activeEntries = computed(() => (activeBucket.value === 'todo' ? permittedTodos.value : permittedHistory.value))

const filteredTodos = computed(() => {
  const text = keyword.value.trim()
  return activeEntries.value.filter((item) => {
    const matchesType = selectedType.value === 'all' || item.type === selectedType.value
    const matchesKeyword = !text || item.title.includes(text) || Boolean(item.detailTitle?.includes(text))
    return matchesType && matchesKeyword
  })
})

const pendingTotal = computed(() => sumWorkspaceTodoCounts(permittedTodos.value))

const visibleFilterOptions = computed(() => {
  const types = new Set<TodoType>(visibleTodoTypeValues(activeEntries.value))
  return filterOptions.filter((option) => types.has(option.value as TodoType))
})

function resetFilter() {
  selectedType.value = 'all'
  keyword.value = ''
}

function openTodo(item: TodoDefinition) {
  const currentRole = roleCode.value
  const path = currentRole ? item.routeByRole[currentRole] : undefined
  if (path) {
    router.push({ path, query: item.query })
  }
}

/** 当前工作台加载代次，用于丢弃角色切换前返回的异步响应。 */
let workspaceLoadId = 0

/** 清空上一激活角色的待办、已办及详情快照。 */
function clearWorkspaceSummary() {
  workflowTasks.value = []
  workflowHistoryTasks.value = []
  periodicTasks.value = []
  periodicHistoryTasks.value = []
  samplingTasks.value = []
  samplingHistoryTasks.value = []
  productSupportTasks.value = []
  productSupportHistoryTasks.value = []
  firstCheckOrders.value = {}
  changeOrders.value = {}
  scanInboxRows.value = []
}

/** 判断异步请求结果是否仍属于当前激活角色和最新加载代次。 */
function isCurrentWorkspaceLoad(loadId: number, requestedRole: RoleCode) {
  return loadId === workspaceLoadId && roleCode.value === requestedRole
}

async function loadWorkflowSummary() {
  const requestedRole = roleCode.value
  const loadId = ++workspaceLoadId
  clearWorkspaceSummary()
  if (!requestedRole) return

  const [workflowResult, scanInboxResult] = await Promise.allSettled([
    refreshWorkflowTasks(),
    listUnifiedScanInbox()
  ])
  if (!isCurrentWorkspaceLoad(loadId, requestedRole)) return
  scanInboxRows.value = scanInboxResult.status === 'fulfilled' ? scanInboxResult.value : []
  if (workflowResult.status === 'rejected') return

  const allTasks = [...workflowTasks.value, ...workflowHistoryTasks.value]
  const details = await loadWorkflowDetails<object>(allTasks, async (task, signal) => {
    if (matchesBusinessType(task.businessType, 'firstcheck')) {
      return getFirstCheckDetail(task.businessId, task.taskId, signal)
    }
    if (matchesBusinessType(task.businessType, 'change')) {
      return getChangeOrderDetail(task.businessId, signal)
    }
    if (matchesBusinessType(task.businessType, 'periodic')) {
      return getPeriodicTask(task.businessId, task.taskId, signal)
    }
    if (matchesBusinessType(task.businessType, 'sampling')) {
      return getSamplingTask(task.businessId, signal)
    }
    if (matchesBusinessType(task.businessType, 'productSupport')) {
      return getProductSupportOrder(task.businessId, signal)
    }
    throw new Error(`不支持的工作流业务类型：${task.businessType}`)
  })
  if (!details || !isCurrentWorkspaceLoad(loadId, requestedRole)) return

  const detailByTaskId = new Map(details.map((detail) => [String(detail.workflowTaskId), detail]))
  const detailsFor = <T extends object>(tasks: WorkflowTask[]) => tasks
    .map((task) => detailByTaskId.get(String(task.taskId)) as WorkflowBoundDetail<T> | undefined)
    .filter((detail): detail is WorkflowBoundDetail<T> => Boolean(detail))

  const workflowPeriodicTodoTasks = workflowTasks.value.filter((task) =>
    matchesBusinessType(task.businessType, 'periodic')
  )
  periodicTasks.value = mergePeriodicTaskPhysicalActions(
    detailsFor<PeriodicTaskVO>(workflowPeriodicTodoTasks),
    scanInboxRows.value
  ).map((task) => ({ ...task, currentNode: parsePeriodicNodeCode(task.currentNode) }))
  periodicHistoryTasks.value = detailsFor<PeriodicTaskVO>(
    workflowHistoryTasks.value.filter((task) => matchesBusinessType(task.businessType, 'periodic'))
  ).map((task) => ({ ...task, currentNode: parsePeriodicNodeCode(task.currentNode) }))
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

function openLaunch(path: string) {
  router.push(path)
}

watch(roleCode, () => {
  void loadWorkflowSummary()
}, { immediate: true })

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

    <FlowStatusSummary
      v-if="route.path === '/todo' && activeBucket === 'todo'"
      :summary="todoSummary"
      :loading="todoSummaryLoading"
      :error="todoSummaryError"
      title="全部流程待办汇总"
    />

    <a-card v-if="route.path === '/todo'" class="todo-panel" :bordered="false">
      <template #title>
        <h2>流程任务</h2>
      </template>
      <template #extra>
        <a-tag v-if="activeBucket === 'todo'" class="count-pill orange">{{ pendingTotal }} 项待办</a-tag>
      </template>

      <a-tabs v-model:active-key="activeBucket" class="workspace-task-tabs" @change="resetFilter">
        <a-tab-pane key="todo" tab="我的待办" />
        <a-tab-pane key="history" tab="我的已办" />
      </a-tabs>

      <div class="task-filter">
        <a-select v-model:value="selectedType" class="type-select" :options="visibleFilterOptions" />
        <a-input v-model:value="keyword" class="keyword-input" placeholder="按事项模糊查询" allow-clear />
        <a-button type="primary">查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
      </div>

      <div v-if="filteredTodos.length > 0" class="task-list">
        <div v-for="item in filteredTodos" :key="item.key || item.type" class="task-item">
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
        :description="activeBucket === 'todo' ? '当前角色暂无该类型待办' : '当前角色暂无该类型已办记录'"
      />
    </a-card>

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
