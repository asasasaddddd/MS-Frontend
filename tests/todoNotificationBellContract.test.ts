import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const apiSource = readFileSync(new URL('../src/api/todoNotification.ts', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('../src/stores/todoNotification.ts', import.meta.url), 'utf8')
const bellSource = readFileSync(new URL('../src/components/workflow/TodoNotificationBell.vue', import.meta.url), 'utf8')
const appShellSource = readFileSync(new URL('../src/components/AppShell.vue', import.meta.url), 'utf8')
const summaryComposable = readFileSync(new URL('../src/composables/useRoleTodoSummary.ts', import.meta.url), 'utf8')

assert.match(apiSource, /\/workflow\/notifications/)
assert.match(apiSource, /unread-count/)
assert.match(apiSource, /read-all/)
assert.match(storeSource, /sessionStorage/)
assert.match(storeSource, /invalidationVersion/)
assert.match(storeSource, /notification\.open/)
assert.match(storeSource, /activate/)
assert.match(storeSource, /deactivate/)
assert.match(bellSource, /a-badge/)
assert.match(bellSource, /a-popover/)
assert.match(bellSource, /markAllRead/)
assert.match(bellSource, /todoNotificationRoute/)
assert.match(bellSource, /class="notification-bell-trigger"[\s\S]*?<a-badge/)
assert.match(bellSource, /class="notification-content-frame"/)
assert.match(bellSource, /v-show="items\.length > 0"/)
assert.match(bellSource, /v-show="items\.length === 0"/)
assert.doesNotMatch(
  bellSource,
  /v-if="items\.length > 0"/,
  '通知弹层列表和空状态必须保持稳定 DOM，避免 Popover Teleport 更新时触发 __vnode/null parentNode'
)
assert.match(
  bellSource,
  /const target = todoNotificationRoute\([\s\S]*?router\.push\(target\)[\s\S]*?markRead/
)
assert.doesNotMatch(
  bellSource,
  /<a-empty[^>]*:image=["']null["']/,
  '通知重载期间不能把 null 当作 Empty 图片 VNode，否则弹层更新会触发 Vue 空节点异常',
)
assert.match(appShellSource, /TodoNotificationBell/)
assert.match(appShellSource, /todoNotifications\.activate/)
assert.match(summaryComposable, /invalidationVersion/)
