import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shell = readFileSync(new URL('../src/components/AppShell.vue', import.meta.url), 'utf8')
const roleSwitchTransaction = readFileSync(new URL('../src/components/appShellRoleSwitch.ts', import.meta.url), 'utf8')
const auth = readFileSync(new URL('../src/api/auth.ts', import.meta.url), 'utf8')
const common = readFileSync(new URL('../src/types/common.ts', import.meta.url), 'utf8')
const router = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')

assert.match(common, /groupId:\s*string/)
assert.match(common, /groupName:\s*string/)
assert.match(auth, /groupId\?:\s*string/)
assert.match(auth, /groupName\?:\s*string/)
assert.match(auth, /groupId:\s*response\.groupId\s*\|\|\s*''/)
assert.match(auth, /groupName:\s*response\.groupName\s*\|\|\s*''/)
assert.match(shell, /class="operator-identity"/)
assert.match(shell, /<a-tooltip[\s\S]*?部门：[\s\S]*?组：/)
const operatorIdentityElement = shell.match(/<span[^>]*class="operator-identity"[^>]*>/)?.[0] || ''
assert.doesNotMatch(operatorIdentityElement, /aria-label=/)
assert.doesNotMatch(operatorIdentityElement, /tabindex=/)
assert.match(shell, /class="sr-only"[\s\S]*?姓名：[\s\S]*?部门：[\s\S]*?组：/)
assert.match(shell, /\.sr-only\s*\{[^}]*position:\s*absolute;/s)
assert.match(shell, /class="role-switch-button"/)
assert.match(shell, /<a-dropdown[\s\S]*?<DownOutlined\s*\/>/)
assert.match(shell, /@click="handleRoleMenuClick"/)
assert.match(shell, /:disabled="roleMenuItems\.length <= 1 \|\| roleSwitching"/)
assert.match(shell, /class="role-switch-button"[^>]*:loading="roleSwitching"[^>]*aria-haspopup="menu"/)
assert.match(shell, /const roleSwitching = ref\(false\)/)
assert.match(shell, /const viewActive = ref\(true\)/)
assert.match(shell, /async function handleRoleChange/)
assert.match(shell, /if \(roleSwitching\.value \|\| nextRole === roleCode\.value\)/)
assert.match(shell, /await runRoleSwitchTransaction\(/)
assert.match(shell, /const previousFullPath = route\.fullPath/)
assert.match(shell, /const navigationFailure = await router\.push\(nextPath\)[\s\S]*?if \(navigationFailure\)[\s\S]*?throw navigationFailure/)
assert.match(shell, /rollbackNavigate:[\s\S]*?router\.replace\(previousFullPath\)[\s\S]*?throw rollbackFailure/)
assert.match(shell, /pause:[\s\S]*?viewActive\.value = false[\s\S]*?roleSwitching\.value = true/)
assert.match(shell, /resume:[\s\S]*?viewActive\.value = true[\s\S]*?roleSwitching\.value = false/)
assert.match(shell, /await handleRoleChange\(nextRole\)/)
assert.match(shell, /function handleMenuClick[\s\S]*?if \(roleSwitching\.value\) return/)
assert.match(shell, /async function handleLogout[\s\S]*?if \(roleSwitching\.value\) return/)
assert.match(shell, /<TodoNotificationBell\s+v-if="!roleSwitching"\s*\/>/)
assert.match(shell, /<a-sub-menu[^>]*:disabled="roleSwitching"/)
assert.match(shell, /<a-menu-item[^>]*:disabled="roleSwitching"/)
assert.match(shell, /class="logout-button"[^>]*:disabled="roleSwitching"/)
assert.match(
  shell,
  /const pageIdentityKey = computed\(\(\) =>[\s\S]*?route\.fullPath[\s\S]*?employeeId[\s\S]*?roleCode/
)
assert.match(shell, /<router-view\s+v-if="viewActive"\s+:key="pageIdentityKey"\s*\/>/)

const pageIdentityKeyDefinition = shell.match(
  /const pageIdentityKey = computed\(\(\) =>[\s\S]*?\.join\('\|'\)\)/
)?.[0] || ''
assert.doesNotMatch(pageIdentityKeyDefinition, /deptId/)
assert.doesNotMatch(pageIdentityKeyDefinition, /groupId/)
assert.doesNotMatch(shell, /class="role-select"/)
assert.doesNotMatch(shell, /department-switch|group-switch|scope-org-select/)
assert.match(roleSwitchTransaction, /navigate:\s*\(\) => Promise<void>/)
assert.match(roleSwitchTransaction, /rollbackNavigate:\s*\(\) => Promise<void>/)
assert.doesNotMatch(roleSwitchTransaction, /Promise<unknown>/)
assert.match(router, /import\s*\{\s*fetchCurrentUser\s*\}\s*from\s*'@\/api\/auth'/)
assert.match(router, /reconcileAuthorizedSessionUser/)
assert.match(router, /router\.beforeEach\(async\s*\(to\)/)
assert.match(router, /await fetchCurrentUser\(\)/)
assert.match(
  router,
  /catch\s*\{[\s\S]*?session\.clear\(\)[\s\S]*?return\s*\{\s*path:\s*'\/login'/,
)
