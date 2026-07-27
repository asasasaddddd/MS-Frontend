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
assert.match(appShellSource, /TodoNotificationBell/)
assert.match(appShellSource, /todoNotifications\.activate/)
assert.match(summaryComposable, /invalidationVersion/)
