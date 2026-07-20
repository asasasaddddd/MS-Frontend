import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/composables/useNavSections.ts', import.meta.url), 'utf8')

assert.doesNotMatch(source, /key:\s*['"]device-inspection['"]/)
assert.match(source, /key:\s*['"]workspace['"]/)
assert.match(source, /key:\s*['"]device-management['"]/)

// 专业页面从工作台跳转，不能因为不再显示侧边栏入口而从路由来源中消失。
assert.match(source, /export const workflowRouteItems/)
assert.match(source, /allNavItems\s*=\s*\[\.\.\.workflowRouteItems/)
assert.match(source, /path:\s*['"]\/periodic\/admin['"]/)
assert.match(source, /path:\s*['"]\/firstcheck\/admin['"]/)
