<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { SelectProps } from 'ant-design-vue'
import { getFirstCheckDetail } from '@/api/firstcheck'
import { getChangeOrderDetail } from '@/api/change'
import { listWorkflowHistory, listWorkflowTasks } from '@/api/workflow'
import { listPeriodicMyHistory, listPeriodicMyTasks } from '@/api/periodic'
import { listSamplingMyHistory, listSamplingMyTasks } from '@/api/sampling'
import { listProductSupportMyHistory, listProductSupportMyTasks } from '@/api/productSupport'
import { roleNameMap, type RoleCode } from '@/types/common'
import type { WorkflowTask } from '@/types/workflow'
import type { PeriodicTaskVO } from '@/types/periodic'
import type { SamplingTaskVO } from '@/types/sampling'
import type { ProductSupportOrderVO } from '@/types/productSupport'
import type { FirstCheckOrder } from '@/types/firstcheck'
import type { ChangeOrderVO } from '@/types/change'
import { useSessionStore } from '@/stores/session'
import {
  changeNodeCodesByRole,
  isPendingWorkflowTask,
  matchesBusinessType,
  matchesWorkflowTaskRole
} from '@/workflows/metrologyWorkflow'
import { matchesFirstCheckVerifierRole } from '@/views/firstcheck/firstCheckVerifierModel'
import { buildPeriodicPlanTodoGroups } from '@/views/periodic/periodicDisplayModel'
import { changeNodeName, changeTypeName, matchesChangeVerifierRole } from '@/views/change/changeDisplayModel'
import {
  dedupeTodoEntriesByKey,
  filterVisibleTodoEntries,
  getChangeTaskRoute,
  getWorkspaceLaunchActions,
  visibleTodoTypeValues,
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
  roles: RoleCode[]
  routeByRole: Partial<Record<RoleCode, string>>
  query?: Record<string, string>
}

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const activeBucket = ref<'todo' | 'history'>('todo')
const selectedType = ref<TodoType>('all')
const keyword = ref('')
const workflowTasks = ref<WorkflowTask[]>([])
const workflowHistoryTasks = ref<WorkflowTask[]>([])
const periodicTasks = ref<PeriodicTaskVO[]>([])
const periodicHistoryTasks = ref<PeriodicTaskVO[]>([])
const samplingTasks = ref<SamplingTaskVO[]>([])
const samplingHistoryTasks = ref<SamplingTaskVO[]>([])
const productSupportTasks = ref<ProductSupportOrderVO[]>([])
const productSupportHistoryTasks = ref<ProductSupportOrderVO[]>([])
const firstCheckOrders = ref<Record<string, FirstCheckOrder>>({})
const changeOrders = ref<Record<string, ChangeOrderVO>>({})

const roleCode = computed(() => session.user?.roleCode as RoleCode | undefined)
const roleLabel = computed(() => {
  const role = session.user?.roleCode || ''
  return roleNameMap[role] || session.user?.roleName || role || '-'
})
const isVerifier = computed(() => roleCode.value === 'VERIFIER_SELF' || roleCode.value === 'VERIFIER_EXTERNAL')
const isSingleMetricOverview = computed(() => roleCode.value === 'CONFIRMER' || roleCode.value === 'RESPONSIBLE_ENGINEER')
const launchActions = computed(() => getWorkspaceLaunchActions(roleCode.value))

const filterOptions: SelectProps['options'] = [
  { label: '全部类型', value: 'all' },
  { label: '首次检定', value: 'firstcheck' },
  { label: '周检计划', value: 'periodic' },
  { label: '状态变更', value: 'change' },
  { label: '抽检计划', value: 'sampling' },
  { label: '产品配套', value: 'productSupport' }
]

const periodicRouteByRole: Partial<Record<RoleCode, string>> = {
  MEASURE_ADMIN: '/periodic/admin',
  VERIFIER_SELF: '/periodic/verifier',
  VERIFIER_EXTERNAL: '/periodic/verifier-external',
  RESPONSIBLE_ENGINEER: '/periodic/responsible-engineer',
  EXTERNAL_OPERATOR: '/periodic/external-operator',
  CONFIRMER: '/periodic/confirmer'
}

const samplingRouteByRole: Partial<Record<RoleCode, string>> = {
  PLANNER: '/sampling/plan',
  MEASURE_ADMIN: '/sampling/admin',
  VERIFIER_SELF: '/sampling/verifier',
  CONFIRMER: '/sampling/confirmer'
}

const productSupportRouteByRole: Partial<Record<RoleCode, string>> = {
  VERIFIER_SELF: '/product-support/verifier',
  VERIFIER_EXTERNAL: '/product-support/verifier'
}

const firstCheckRouteByRole: Partial<Record<RoleCode, string>> = {
  MEASURE_ADMIN: '/firstcheck/admin',
  DEPT_LEADER: '/firstcheck/leader',
  RESPONSIBLE_ENGINEER: '/firstcheck/engineer',
  VERIFIER_SELF: '/firstcheck/verifier',
  VERIFIER_EXTERNAL: '/firstcheck/verifier',
  EXTERNAL_OPERATOR: '/scan'
}

function scanActionByFirstCheckNode(nodeCode?: string) {
  if (nodeCode === 'external_sendout') return 'sendout'
  if (nodeCode === 'verifier_receive') return 'receive'
  if (nodeCode === 'verifier_return_verify') return 'sendout-return'
  return undefined
}

function buildFirstCheckQuery(task: WorkflowTask, currentRole: RoleCode): Record<string, string> {
  const orderId = String(task.businessId)
  if (currentRole === 'EXTERNAL_OPERATOR') {
    return {
      module: 'firstcheck',
      orderId,
      action: scanActionByFirstCheckNode(task.nodeCode) || 'sendout'
    }
  }
  return { orderId }
}

function buildFirstCheckSubtitle(task: WorkflowTask, order?: FirstCheckOrder) {
  const pieces = [
    order?.deviceName,
    order?.quantity ? `${order.quantity}台` : undefined,
    task.nodeName || order?.currentNodeName || task.nodeCode
  ].filter(Boolean)
  return pieces.length > 0 ? pieces.join(' · ') : `首检单ID ${task.businessId}`
}

const firstCheckTodoEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = currentRole ? firstCheckRouteByRole[currentRole] : undefined
  if (!currentRole || !path) return []

  return workflowTasks.value
    .filter((task) => isPendingWorkflowTask(task))
    .filter((task) => matchesBusinessType(task.businessType, 'firstcheck'))
    .filter((task) => matchesWorkflowTaskRole(task, 'firstcheck', currentRole))
    .filter((task) => {
      const order = firstCheckOrders.value[String(task.businessId)]
      return order ? matchesFirstCheckVerifierRole(order, currentRole) : true
    })
    .map((task) => {
      const orderId = String(task.businessId)
      const order = firstCheckOrders.value[orderId]
      return {
        key: `firstcheck-${orderId}`,
        type: 'firstcheck' as const,
        title: `首检单 ${order?.orderNo || orderId}`,
        detailTitle: buildFirstCheckSubtitle(task, order),
        count: 1,
        unit: '单',
        color: 'orange' as TodoColor,
        roles: [currentRole],
        routeByRole: { [currentRole]: path },
        query: buildFirstCheckQuery(task, currentRole)
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans'))
})

const firstCheckHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = currentRole ? firstCheckRouteByRole[currentRole] : undefined
  if (!currentRole || !path || currentRole === 'EXTERNAL_OPERATOR') return []

  return workflowHistoryTasks.value
    .filter((task) => matchesBusinessType(task.businessType, 'firstcheck'))
    .filter((task) => matchesWorkflowTaskRole(task, 'firstcheck', currentRole))
    .filter((task) => {
      const order = firstCheckOrders.value[String(task.businessId)]
      return order ? matchesFirstCheckVerifierRole(order, currentRole) : true
    })
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
  const path = getChangeTaskRoute(currentRole)
  const allowedNodes = currentRole ? changeNodeCodesByRole[currentRole] : undefined
  if (!currentRole || !path || !allowedNodes) return []

  const nodeSet = new Set<string>(allowedNodes)
  const taskByOrder = new Map<string, WorkflowTask>()
  workflowTasks.value
    .filter((task) => isPendingWorkflowTask(task))
    .filter((task) => matchesBusinessType(task.businessType, 'change'))
    .filter((task) => nodeSet.has(task.nodeCode))
    .filter((task) => {
      const order = changeOrders.value[String(task.businessId)]
      return order ? matchesChangeVerifierRole(order, currentRole) : true
    })
    .forEach((task) => taskByOrder.set(String(task.businessId), task))

  return Array.from(taskByOrder.entries())
    .map(([orderId, task]) => {
      const order = changeOrders.value[orderId]
      const typeLabel = order?.changeType ? changeTypeName(order.changeType) : undefined
      return {
        key: `change-${orderId}`,
        type: 'change' as const,
        title: `状态变更单 ${order?.orderNo || orderId}`,
        detailTitle: [typeLabel, task.nodeName || changeNodeName(task.nodeCode)].filter(Boolean).join(' · '),
        count: 1,
        unit: '单',
        color: 'blue' as TodoColor,
        roles: [currentRole],
        routeByRole: { [currentRole]: path },
        query: { orderId }
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans'))
})

const changeHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = getChangeTaskRoute(currentRole)
  const allowedNodes = currentRole ? changeNodeCodesByRole[currentRole] : undefined
  if (!currentRole || !path || !allowedNodes) return []

  const nodeSet = new Set<string>(allowedNodes)
  return workflowHistoryTasks.value
    .filter((task) => matchesBusinessType(task.businessType, 'change'))
    .filter((task) => nodeSet.has(task.nodeCode))
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
  const path = currentRole ? periodicRouteByRole[currentRole] : undefined
  if (!currentRole || !path) return []

  return buildPeriodicPlanTodoGroups(periodicTasks.value)
    .map(({ planId, tasks, deviceCount }) => {
      const color: TodoColor = tasks.some((task) => task.taskStatus === 'exception' || task.currentNode === 'exception_disposal')
        ? 'red'
        : 'orange'
      return {
        key: `periodic-${planId}`,
        type: 'periodic' as const,
        title: `周检单 ${derivePeriodicPlanLabel(planId, tasks)}`,
        detailTitle: buildPeriodicPlanSubtitle(tasks),
        count: deviceCount,
        unit: '台',
        color,
        roles: [currentRole],
        routeByRole: { [currentRole]: path },
        query: planId.startsWith('task-') ? undefined : { planId }
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans'))
})

const periodicHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = currentRole ? periodicRouteByRole[currentRole] : undefined
  if (!currentRole || !path) return []
  const pendingIds = new Set(periodicTasks.value.map((task) => String(task.id)))
  const handledTasks = periodicHistoryTasks.value.filter((task) => !pendingIds.has(String(task.id)))

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
  const path = currentRole ? samplingRouteByRole[currentRole] : undefined
  if (!currentRole || !path || currentRole === 'PLANNER') return []

  const groups = new Map<string, SamplingTaskVO[]>()
  samplingTasks.value.forEach((task) => {
    const key = samplingPlanGroupKey(task)
    const list = groups.get(key) || []
    list.push(task)
    groups.set(key, list)
  })

  return Array.from(groups.entries())
    .map(([planId, tasks]) => {
      const color: TodoColor = tasks.some((task) => task.taskStatus === 'rejected' || task.taskStatus === 'cancelled')
        ? 'red'
        : 'orange'
      return {
        key: `sampling-${planId}`,
        type: 'sampling' as const,
        title: `C类抽检计划 ${deriveSamplingPlanLabel(planId, tasks)}`,
        detailTitle: buildSamplingPlanSubtitle(tasks),
        count: tasks.length,
        unit: '台',
        color,
        roles: [currentRole],
        routeByRole: { [currentRole]: path },
        query: planId.startsWith('task-') ? undefined : { planId }
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans'))
})

const samplingHistoryEntries = computed<TodoDefinition[]>(() => {
  const currentRole = roleCode.value
  const path = currentRole ? samplingRouteByRole[currentRole] : undefined
  if (!currentRole || !path || currentRole === 'PLANNER') return []

  const pendingIds = new Set(samplingTasks.value.map((task) => String(task.id)))
  const groups = new Map<string, SamplingTaskVO[]>()
  samplingHistoryTasks.value.filter((task) => !pendingIds.has(String(task.id))).forEach((task) => {
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

  const pendingIds = new Set(productSupportTasks.value.map((order) => String(order.id)))
  return productSupportHistoryTasks.value.filter((order) => !pendingIds.has(String(order.id))).map((order) => {
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

function todoCountByType(type: Exclude<TodoType, 'all'>) {
  const items = permittedTodos.value.filter((item) => item.type === type)
  if (type === 'periodic' || type === 'sampling' || type === 'productSupport') return items.length
  return items.reduce((sum, item) => sum + item.count, 0)
}

function todoDeviceCountByType(type: Exclude<TodoType, 'all'>) {
  return permittedTodos.value.filter((item) => item.type === type).reduce((sum, item) => sum + item.count, 0)
}

const metrics = computed(() => {
  const firstcheck = todoCountByType('firstcheck')
  const periodic = todoCountByType('periodic')
  const periodicDevices = todoDeviceCountByType('periodic')
  const change = todoCountByType('change')
  const sampling = todoCountByType('sampling')
  const productSupport = todoCountByType('productSupport')

  const baseMetrics = [
    {
      title: '待办流程',
      value: firstcheck + periodic + change + sampling + productSupport,
      note: '数据来自当前角色实时待办'
    },
    {
      title: '未送检器具',
      value: periodicDevices,
      note: periodicDevices > 0 ? `当前周检设备 ${periodicDevices}` : '暂无周检送检任务'
    },
    {
      title: '状态变更未完流程',
      value: change,
      note: change > 0 ? `当前待处理 ${change} 单` : '暂无状态变更待办'
    }
  ]
  const roleMetrics = isVerifier.value
    ? baseMetrics.slice(0, 2)
    : isSingleMetricOverview.value
      ? baseMetrics.slice(0, 1)
      : baseMetrics
  return roleMetrics.filter((metric) => metric.value > 0)
})

const pendingTotal = computed(() =>
  permittedTodos.value.reduce(
    (sum, item) => sum + (item.type === 'periodic' || item.type === 'sampling' || item.type === 'productSupport' ? 1 : item.count),
    0
  )
)

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

async function loadWorkflowSummary() {
  const [
    workflowResult,
    workflowHistoryResult,
    periodicResult,
    periodicHistoryResult,
    samplingResult,
    samplingHistoryResult,
    productSupportResult,
    productSupportHistoryResult
  ] = await Promise.allSettled([
    listWorkflowTasks(),
    listWorkflowHistory(),
    listPeriodicMyTasks(),
    listPeriodicMyHistory(),
    listSamplingMyTasks(),
    listSamplingMyHistory(),
    listProductSupportMyTasks(),
    listProductSupportMyHistory()
  ])

  workflowTasks.value = workflowResult.status === 'fulfilled' ? workflowResult.value : []
  workflowHistoryTasks.value = workflowHistoryResult.status === 'fulfilled' ? workflowHistoryResult.value : []
  periodicTasks.value = periodicResult.status === 'fulfilled' ? periodicResult.value : []
  periodicHistoryTasks.value = periodicHistoryResult.status === 'fulfilled' ? periodicHistoryResult.value : []
  samplingTasks.value = samplingResult.status === 'fulfilled' ? samplingResult.value : []
  samplingHistoryTasks.value = samplingHistoryResult.status === 'fulfilled' ? samplingHistoryResult.value : []
  productSupportTasks.value = productSupportResult.status === 'fulfilled' ? productSupportResult.value : []
  productSupportHistoryTasks.value = productSupportHistoryResult.status === 'fulfilled' ? productSupportHistoryResult.value : []
  const firstCheckTasks = [...workflowTasks.value, ...workflowHistoryTasks.value]
    .filter((task) => matchesBusinessType(task.businessType, 'firstcheck'))
  const changeTasks = [...workflowTasks.value, ...workflowHistoryTasks.value]
    .filter((task) => matchesBusinessType(task.businessType, 'change'))
  const [firstCheckDetails, changeDetails] = await Promise.all([
    Promise.allSettled(
      firstCheckTasks.map(async (task) => ({
        orderId: String(task.businessId),
        order: await getFirstCheckDetail(task.businessId)
      }))
    ),
    Promise.allSettled(
      changeTasks.map(async (task) => ({
        orderId: String(task.businessId),
        order: await getChangeOrderDetail(task.businessId)
      }))
    )
  ])
  firstCheckOrders.value = firstCheckDetails.reduce<Record<string, FirstCheckOrder>>((next, item) => {
    if (item.status === 'fulfilled') {
      next[item.value.orderId] = item.value.order
    }
    return next
  }, {})
  changeOrders.value = changeDetails.reduce<Record<string, ChangeOrderVO>>((next, item) => {
    if (item.status === 'fulfilled') {
      next[item.value.orderId] = item.value.order
    }
    return next
  }, {})
}

function openLaunch(path: string) {
  router.push(path)
}

onMounted(loadWorkflowSummary)
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

    <div v-if="route.path === '/todo' && activeBucket === 'todo' && metrics.length > 0" class="metric-grid">
      <a-card v-for="metric in metrics" :key="metric.title" class="metric-card" :bordered="false">
        <span>{{ metric.title }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.note }}</small>
      </a-card>
    </div>

    <a-card v-if="route.path === '/todo'" class="todo-panel" :bordered="false">
      <template #title>
        <h2>流程任务</h2>
      </template>
      <template #extra>
        <a-tag v-if="isVerifier && activeBucket === 'todo'" class="count-pill orange">{{ pendingTotal }} 项待办</a-tag>
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

    <a-card v-else class="todo-panel building-panel" :bordered="false">
      <h2>页面建设中</h2>
      <p>当前路由：{{ route.path }}。侧边栏、页头和统一待办入口已接入，后续按原型继续补全页面内容和弹窗。</p>
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

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.metric-card :deep(.ant-card-body) {
  padding: 16px 18px;
}

.metric-card span,
.metric-card small {
  color: #667085;
}

.metric-card strong {
  display: block;
  margin: 8px 0 4px;
  color: #172033;
  font-size: 34px;
  line-height: 1.08;
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
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .task-filter {
    grid-template-columns: 1fr;
  }

  .task-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
