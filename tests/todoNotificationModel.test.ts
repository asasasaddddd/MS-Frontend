import assert from 'node:assert/strict'
import {
  mergePromptedEventIds,
  notificationIdentityKey,
  resetNotificationState,
  todoNotificationRoute
} from '../src/stores/todoNotificationModel.ts'

const firstPrompt = mergePromptedEventIds([], [1001, 1001, 1002])
assert.deepEqual(firstPrompt.promptedIds, [1001, 1002])
assert.deepEqual(firstPrompt.newEventIds, [1001, 1002])

const reconnectPrompt = mergePromptedEventIds(firstPrompt.promptedIds, [1002, 1003])
assert.deepEqual(reconnectPrompt.promptedIds, [1001, 1002, 1003])
assert.deepEqual(reconnectPrompt.newEventIds, [1003], '重连校准不得重复提示已展示事件')

assert.equal(notificationIdentityKey('U03016119', 'verifier_self'), 'U03016119|VERIFIER_SELF')
assert.deepEqual(
  resetNotificationState({ items: [{ id: 1 }], unreadCount: 1, connected: true }),
  { items: [], unreadCount: 0, connected: false }
)

assert.deepEqual(
  todoNotificationRoute({ businessType: 'PERIODIC', scopeType: 'plan', scopeId: 88 }, 'VERIFIER_SELF'),
  { path: '/periodic/verifier', query: { planId: '88' } }
)
assert.deepEqual(
  todoNotificationRoute({ businessType: 'PRODUCT_SUPPORT', scopeType: 'order', scopeId: 99 }, 'VERIFIER_EXTERNAL'),
  { path: '/product-support/verifier', query: { orderId: '99' } }
)
assert.deepEqual(
  todoNotificationRoute({ businessType: 'FIRST_CHECK', scopeType: 'order', scopeId: 66 }, 'EXTERNAL_OPERATOR'),
  { path: '/scan', query: { module: 'firstcheck', action: 'sendout', orderId: '66' } }
)
