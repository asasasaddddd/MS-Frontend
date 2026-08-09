import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/** 主布局源码，用于固定窄屏侧栏不得覆盖业务内容的响应式契约。 */
const appShellSource = readFileSync(new URL('../src/components/AppShell.vue', import.meta.url), 'utf8')

assert.match(appShellSource, /window\.matchMedia\('\(max-width: 900px\)'\)/)
assert.match(appShellSource, /effectiveSidebarCollapsed/)
assert.match(appShellSource, /:collapsed="effectiveSidebarCollapsed"/)
assert.match(appShellSource, /class="app-main"\s+:class="\{ collapsed: effectiveSidebarCollapsed \}"/)
assert.match(appShellSource, /narrowViewportQuery\.addEventListener\('change', syncNarrowViewport\)/)
assert.match(appShellSource, /removeEventListener\('change', syncNarrowViewport\)/)
assert.match(appShellSource, /\.app-main\s*\{[^}]*min-width:\s*0;/s)
assert.match(appShellSource, /@media \(max-width: 600px\)/)
assert.match(appShellSource, /\.operator-identity\s*\{[^}]*text-overflow:\s*ellipsis;/s)
assert.match(appShellSource, /\.role-switch-button\s*\{[^}]*height:\s*40px;/s)
assert.match(appShellSource, /\.role-switch-label\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;/s)
assert.match(appShellSource, /@media \(max-width: 600px\)[\s\S]*?\.operator-identity/s)
assert.match(appShellSource, /@media \(max-width: 600px\)[\s\S]*?\.role-switch-button/s)
