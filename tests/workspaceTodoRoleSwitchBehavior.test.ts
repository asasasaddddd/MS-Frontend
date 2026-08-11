import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createRenderer, defineComponent, h, nextTick, ref, type App } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

register('./workflowTaskLoader.mjs', import.meta.url)

const { createWorkflowTaskCoordinator, useWorkflowTask } = await import('../src/composables/useWorkflowTask.ts')
const { useRoleTodoSummary } = await import('../src/composables/useRoleTodoSummary.ts')
const { useWorkspaceTodoLoad } = await import('../src/composables/useWorkspaceTodoLoad.ts')
const { useTodoNotificationStore } = await import('../src/stores/todoNotification.ts')

interface HostNode {
  type: string
  text?: string
  props: Record<string, unknown>
  parent: HostNode | null
  children: HostNode[]
}

/** 无浏览器 DOM 时用于挂载 Vue setup 函数的最小内存宿主。 */
const renderer = createRenderer<HostNode, HostNode>({
  patchProp: (node, key, _previous, value) => { node.props[key] = value },
  insert: (node, parent, anchor) => {
    node.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index >= 0) parent.children.splice(index, 0, node)
    else parent.children.push(node)
  },
  remove: (node) => {
    if (!node.parent) return
    const index = node.parent.children.indexOf(node)
    if (index >= 0) node.parent.children.splice(index, 1)
    node.parent = null
  },
  createElement: (type) => ({ type, props: {}, parent: null, children: [] }),
  createText: (text) => ({ type: '#text', text, props: {}, parent: null, children: [] }),
  createComment: (text) => ({ type: '#comment', text, props: {}, parent: null, children: [] }),
  setText: (node, text) => { node.text = text },
  setElementText: (node, text) => {
    node.children = [{ type: '#text', text, props: {}, parent: node, children: [] }]
  },
  parentNode: (node) => node.parent,
  nextSibling: (node) => {
    const siblings = node.parent?.children || []
    const index = siblings.indexOf(node)
    return index >= 0 ? siblings[index + 1] || null : null
  },
  querySelector: () => null,
  setScopeId: () => undefined,
  cloneNode: (node) => ({ ...node, props: { ...node.props }, children: [...node.children] }),
  insertStaticContent: () => [null, null]
})

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function flushAsyncUpdates() {
  await new Promise<void>((resolve) => setImmediate(resolve))
  await nextTick()
}

function task(overrides: Record<string, unknown> = {}) {
  return {
    taskId: 'task-default',
    processInstanceId: 'process-default',
    businessType: 'PERIODIC',
    businessId: 'container-default',
    nodeCode: 'verifier_receive',
    nodeName: '待接收',
    operationCode: 'RECEIVE',
    requiredRoleCode: 'VERIFIER_SELF',
    permissionCode: 'PERIODIC_RECEIVE',
    taskStatus: 'pending',
    rowVersion: 1,
    allowedActions: ['RECEIVE'],
    ...overrides
  }
}

function container(id: string, roleCode: string) {
  return {
    businessType: 'PERIODIC',
    containerId: id,
    containerNo: `PLAN-${id}`,
    totalItemCount: 10,
    myPendingItemCount: 5,
    myPendingActionCount: 5,
    currentNodeSummary: [{
      nodeCode: 'verifier_receive',
      nodeName: '待接收',
      myPendingItemCount: 5,
      myPendingActionCount: 5,
      requiredRoleCode: roleCode
    }]
  }
}

function mountSetup<T>(setup: () => T): { state: T; app: App<HostNode>; root: HostNode } {
  let state!: T
  const component = defineComponent({
    setup() {
      state = setup()
      return () => h('div')
    }
  })
  const root: HostNode = { type: 'root', props: {}, parent: null, children: [] }
  const app = renderer.createApp(component)
  app.mount(root)
  return { state, app, root }
}

async function testMountedWorkflowRoleSwitchDropsLateTasksAndDetails() {
  const firstTasks = deferred<{ records: ReturnType<typeof task>[]; total: number; current: number; size: number }>()
  const secondTasks = deferred<{ records: ReturnType<typeof task>[]; total: number; current: number; size: number }>()
  const identity = ref('U-A|VERIFIER_SELF')
  let queryCount = 0
  const gateway = {
    queryTasks: () => {
      queryCount += 1
      return queryCount === 1 ? firstTasks.promise : secondTasks.promise
    },
    getTask: async () => task(),
    getTimeline: async () => []
  }
  const mounted = mountSetup(() => useWorkflowTask({
    identityKey: identity,
    views: ['todo'],
    gateway,
    immediate: true
  }))

  await nextTick()
  assert.equal(queryCount, 1, 'mounted composable must request the initial identity')
  identity.value = 'U-B|VERIFIER_EXTERNAL'
  await nextTick()
  assert.equal(queryCount, 2, 'role switch must request the new identity')

  secondTasks.resolve({ records: [task({ taskId: 'task-B', requiredRoleCode: 'VERIFIER_EXTERNAL' })], total: 1, current: 1, size: 200 })
  await flushAsyncUpdates()
  assert.equal(mounted.state.todoTasks.value[0]?.taskId, 'task-B')

  firstTasks.resolve({ records: [task({ taskId: 'task-A', requiredRoleCode: 'VERIFIER_SELF' })], total: 1, current: 1, size: 200 })
  await flushAsyncUpdates()
  assert.equal(mounted.state.todoTasks.value[0]?.taskId, 'task-B', 'late role A task response must not overwrite role B')

  const detailA = deferred<{ label: string }>()
  const detailB = deferred<{ label: string }>()
  const coordinator = createWorkflowTaskCoordinator({
    queryTasks: async () => ({ records: [], total: 0, current: 1, size: 20 }),
    getTask: async () => task(),
    getTimeline: async () => []
  })
  const taskA = task({ taskId: 'task-A', requiredRoleCode: 'VERIFIER_SELF' })
  const taskB = task({ taskId: 'task-B', requiredRoleCode: 'VERIFIER_EXTERNAL' })
  const oldDetails = coordinator.loadDetails([taskA], async () => detailA.promise)
  const currentDetails = coordinator.loadDetails([taskB], async () => detailB.promise)
  detailB.resolve({ label: 'B' })
  assert.deepEqual(await currentDetails, [{ ...detailBValue(), currentNode: 'verifier_receive', currentNodeName: '待接收', workflowTaskId: 'task-B', processInstanceId: 'process-default', rowVersion: 1, allowedActions: ['RECEIVE'] }])
  detailA.resolve({ label: 'A' })
  assert.equal(await oldDetails, null, 'late role A detail response must be discarded')

  mounted.app.unmount()
}

function detailBValue() {
  return { label: 'B' }
}

async function testMountedWorkspaceLoaderDropsLateContainerTaskAndDetailResponses() {
  setActivePinia(createPinia())
  const notifications = useTodoNotificationStore()
  const identity = ref('U-A|VERIFIER_SELF')
  const taskRequests = new Map<string, ReturnType<typeof deferred<{ todoTasks: ReturnType<typeof task>[]; handledTasks: ReturnType<typeof task>[] }>>>()
  const containerRequests = new Map<string, ReturnType<typeof deferred<ReturnType<typeof container>[]>>>()
  const detailRequests = new Map<string, ReturnType<typeof deferred<Array<{ label: string }>>>>()
  const calls: string[] = []

  function requestFor<T>(requests: Map<string, ReturnType<typeof deferred<T>>>, key: string) {
    const request = deferred<T>()
    requests.set(key, request)
    return request.promise
  }

  const mounted = mountSetup(() => useWorkspaceTodoLoad({
    identityKey: identity,
    invalidationVersion: () => notifications.invalidationVersion,
    dependencies: {
      loadTasks: (key: string) => {
        calls.push(`tasks:${key}`)
        return requestFor(taskRequests, key)
      },
      loadContainers: (key: string) => {
        calls.push(`containers:${key}`)
        return requestFor(containerRequests, key)
      },
      loadDetails: (key: string) => {
        calls.push(`details:${key}`)
        return requestFor(detailRequests, key)
      }
    }
  }))

  await nextTick()
  identity.value = 'U-B|VERIFIER_EXTERNAL'
  await nextTick()
  taskRequests.get('U-B|VERIFIER_EXTERNAL')?.resolve({
    todoTasks: [task({ taskId: 'task-B', requiredRoleCode: 'VERIFIER_EXTERNAL', businessId: 'B' })],
    handledTasks: []
  })
  containerRequests.get('U-B|VERIFIER_EXTERNAL')?.resolve([container('B', 'VERIFIER_EXTERNAL')])
  await flushAsyncUpdates()
  detailRequests.get('U-B|VERIFIER_EXTERNAL')?.resolve([{ label: 'B' }])
  await flushAsyncUpdates()
  assert.equal(mounted.state.snapshot.value?.todoContainers[0]?.containerId, 'B')
  assert.equal(mounted.state.snapshot.value?.todoTasks[0]?.taskId, 'task-B')
  assert.equal(mounted.state.snapshot.value?.details[0]?.label, 'B')

  taskRequests.get('U-A|VERIFIER_SELF')?.resolve({
    todoTasks: [task({ taskId: 'task-A', requiredRoleCode: 'VERIFIER_SELF', businessId: 'A' })],
    handledTasks: []
  })
  containerRequests.get('U-A|VERIFIER_SELF')?.resolve([container('A', 'VERIFIER_SELF')])
  await flushAsyncUpdates()
  assert.equal(mounted.state.snapshot.value?.todoContainers[0]?.containerId, 'B', 'late role A container must not overwrite B')
  assert.equal(mounted.state.snapshot.value?.todoTasks[0]?.taskId, 'task-B', 'late role A task must not overwrite B')
  assert.equal(detailRequests.has('U-A|VERIFIER_SELF'), false, 'stale role A load must not start a detail request')

  identity.value = 'U-C|VERIFIER_SELF'
  await nextTick()
  taskRequests.get('U-C|VERIFIER_SELF')?.resolve({
    todoTasks: [task({ taskId: 'task-C', businessId: 'C' })],
    handledTasks: []
  })
  containerRequests.get('U-C|VERIFIER_SELF')?.resolve([container('C', 'VERIFIER_SELF')])
  await flushAsyncUpdates()
  assert.ok(detailRequests.has('U-C|VERIFIER_SELF'), 'current role detail request must start after task/container load')

  identity.value = 'U-D|VERIFIER_EXTERNAL'
  await nextTick()
  taskRequests.get('U-D|VERIFIER_EXTERNAL')?.resolve({
    todoTasks: [task({ taskId: 'task-D', requiredRoleCode: 'VERIFIER_EXTERNAL', businessId: 'D' })],
    handledTasks: []
  })
  containerRequests.get('U-D|VERIFIER_EXTERNAL')?.resolve([container('D', 'VERIFIER_EXTERNAL')])
  await flushAsyncUpdates()
  detailRequests.get('U-D|VERIFIER_EXTERNAL')?.resolve([{ label: 'D' }])
  await flushAsyncUpdates()
  detailRequests.get('U-C|VERIFIER_SELF')?.reject(new Error('stale role C detail failed after abort'))
  await flushAsyncUpdates()
  assert.equal(mounted.state.snapshot.value?.details[0]?.label, 'D')
  assert.equal(mounted.state.error.value, undefined, 'stale detail rejection must not appear as role D error')

  const callsBeforeInvalidation = calls.length
  notifications.invalidationVersion += 1
  await nextTick()
  const invalidationCalls = calls.slice(callsBeforeInvalidation)
  assert.ok(invalidationCalls.includes('tasks:U-D|VERIFIER_EXTERNAL'))
  assert.ok(invalidationCalls.includes('containers:U-D|VERIFIER_EXTERNAL'))
  assert.equal(invalidationCalls.some((call) => call.startsWith('scan:')), false)
  mounted.app.unmount()
}

async function testMountedSummaryDropsLateRejectAndRefreshesOnInvalidation() {
  setActivePinia(createPinia())
  const summaryRequests: Array<{
    identityKey: string
    signal: AbortSignal
    request: ReturnType<typeof deferred<{ stages: [] }>>
  }> = []

  const identity = ref('U-A|VERIFIER_SELF')
  const mounted = mountSetup(() => useRoleTodoSummary({
    identityKey: identity,
    query: { businessType: 'PERIODIC' },
    immediate: true,
    loadSummary: (identityKey: string, _query: unknown, signal: AbortSignal) => {
      const request = deferred<{ stages: [] }>()
      summaryRequests.push({ identityKey, signal, request })
      return request.promise
    }
  }))
  await nextTick()
  assert.equal(summaryRequests.length, 1)
  assert.equal(summaryRequests[0]?.identityKey, 'U-A|VERIFIER_SELF')

  identity.value = 'U-B|VERIFIER_EXTERNAL'
  await nextTick()
  assert.equal(summaryRequests.length, 2, 'role switch must request summary for the new identity')
  assert.equal(summaryRequests[0]?.signal.aborted, true)
  assert.equal(summaryRequests[1]?.identityKey, 'U-B|VERIFIER_EXTERNAL')
  summaryRequests[1]?.request.resolve({ stages: [] })
  await flushAsyncUpdates()
  assert.deepEqual(mounted.state.summary.value, { stages: [] })

  summaryRequests[0]?.request.reject(new Error('stale role A failure'))
  await flushAsyncUpdates()
  assert.equal(mounted.state.error.value, undefined, 'stale rejection must not become the active role error')

  const notifications = useTodoNotificationStore()
  notifications.invalidationVersion += 1
  await nextTick()
  assert.equal(summaryRequests.length, 3, 'notification invalidation must refresh the current role summary')
  assert.equal(summaryRequests[2]?.identityKey, 'U-B|VERIFIER_EXTERNAL')
  summaryRequests[2]?.request.resolve({ stages: [] })
  await flushAsyncUpdates()
  assert.deepEqual(mounted.state.summary.value, { stages: [] })
  mounted.app.unmount()
}

await testMountedWorkflowRoleSwitchDropsLateTasksAndDetails()
await testMountedWorkspaceLoaderDropsLateContainerTaskAndDetailResponses()
await testMountedSummaryDropsLateRejectAndRefreshesOnInvalidation()
