import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../src/views/change/ChangeDeptLeaderView.vue', import.meta.url),
  'utf8'
)

assert.match(
  source,
  /import\s*\{[^}]*watch[^}]*\}\s*from\s*'vue'/,
  '共享审批页必须监听当前激活角色，而不能只依赖组件首次挂载'
)
assert.match(
  source,
  /watch\(\s*workflowIdentity,\s*\(\)\s*=>\s*\{\s*void loadRows\(\)\s*\},\s*\{\s*immediate:\s*true\s*\}\s*\)/s,
  '主管领导、计量领导和责任工程师在同一路由切换时必须立即重新加载'
)
assert.doesNotMatch(
  source,
  /onMounted\(loadRows\)/,
  '仅在挂载时加载会让同一路由角色切换保留上一角色数据'
)
assert.match(source, /let rowLoadGeneration = 0/, '角色切换必须使旧角色异步加载结果失效')
assert.match(source, /let rowLoadController: AbortController \| undefined/, '角色切换必须取消旧角色请求')
assert.match(source, /listWorkflowTasks\('CHANGE', activeController\.signal\)/)
assert.match(source, /getChangeOrderDetail\(task\.businessId, activeController\.signal\)/)
assert.match(
  source,
  /generation !== rowLoadGeneration \|\| activeController\.signal\.aborted \|\| workflowIdentity\.value !== requestedIdentity/,
  '提交列表前必须同时校验加载代次、取消状态和当前角色身份'
)
