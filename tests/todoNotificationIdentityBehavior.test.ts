import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createPinia, setActivePinia } from 'pinia'

register('./workflowTaskLoader.mjs', import.meta.url)

const { createTodoNotificationStore } = await import('../src/stores/todoNotification.ts')

async function flushAsyncUpdates() {
  await new Promise<void>((resolve) => setImmediate(resolve))
}

const streams: Array<{
  onInvalidated?: (event: { eventIds: string[] }) => void | Promise<void>
}> = []
let notificationListCalls = 0
let unreadCountCalls = 0

const useTestStore = createTodoNotificationStore({
  listNotifications: async () => {
    notificationListCalls += 1
    return { records: [], total: 0, current: 1, size: 20 }
  },
  getUnreadCount: async () => {
    unreadCountCalls += 1
    return 0
  },
  markAllRead: async () => undefined,
  markRead: async () => undefined,
  connectStream: (handlers) => {
    streams.push(handlers)
    return () => undefined
  },
  openNotification: () => undefined
}, 'todoNotificationIdentityBehavior')

setActivePinia(createPinia())
const store = useTestStore()

store.activate('U-A', 'VERIFIER_SELF')
await flushAsyncUpdates()
assert.equal(streams.length, 1)
assert.equal(notificationListCalls, 1)

store.activate('U-B', 'VERIFIER_EXTERNAL')
await flushAsyncUpdates()
assert.equal(streams.length, 2)
assert.equal(store.activeIdentity, 'U-B|VERIFIER_EXTERNAL')
assert.equal(notificationListCalls, 2)
assert.equal(store.invalidationVersion, 0)

await streams[0]?.onInvalidated?.({ eventIds: ['event-from-A'] })
await flushAsyncUpdates()
assert.equal(notificationListCalls, 2, 'an old role A stream callback must not refresh role B')
assert.equal(unreadCountCalls, 2, 'an old role A stream callback must not query role B unread count')
assert.equal(store.invalidationVersion, 0, 'an old role A stream callback must not invalidate role B')

await streams[1]?.onInvalidated?.({ eventIds: ['event-from-B'] })
await flushAsyncUpdates()
assert.equal(notificationListCalls, 3)
assert.equal(unreadCountCalls, 3)
assert.equal(store.invalidationVersion, 1, 'the active role B stream callback must still invalidate role B')

store.deactivate()
store.activate('U-A', 'VERIFIER_SELF')
await flushAsyncUpdates()
const replacedStream = streams[2]
store.deactivate()
store.activate('U-A', 'VERIFIER_SELF')
await flushAsyncUpdates()
const currentStream = streams[3]
const listCallsBeforeReplacedEvent = notificationListCalls
const unreadCallsBeforeReplacedEvent = unreadCountCalls
const versionBeforeReplacedEvent = store.invalidationVersion

await replacedStream?.onInvalidated?.({ eventIds: ['event-from-replaced-A-stream'] })
await flushAsyncUpdates()
assert.equal(
  notificationListCalls,
  listCallsBeforeReplacedEvent,
  'a replaced stream for the same identity must not refresh the active connection'
)
assert.equal(
  unreadCountCalls,
  unreadCallsBeforeReplacedEvent,
  'a replaced stream for the same identity must not query unread count'
)
assert.equal(
  store.invalidationVersion,
  versionBeforeReplacedEvent,
  'a replaced stream for the same identity must not invalidate the active connection'
)

await currentStream?.onInvalidated?.({ eventIds: ['event-from-current-A-stream'] })
await flushAsyncUpdates()
assert.equal(notificationListCalls, listCallsBeforeReplacedEvent + 1)
assert.equal(unreadCountCalls, unreadCallsBeforeReplacedEvent + 1)
assert.equal(store.invalidationVersion, versionBeforeReplacedEvent + 1)
