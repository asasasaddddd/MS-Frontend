import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/** 需要统一迁移到后端首检参与汇总的四个角色工作台。 */
const firstCheckViewPaths = [
  '../src/views/firstcheck/FirstCheckAdminView.vue',
  '../src/views/firstcheck/FirstCheckLeaderView.vue',
  '../src/views/firstcheck/FirstCheckEngineerView.vue',
  '../src/views/firstcheck/FirstCheckVerifierView.vue'
] as const

for (const viewPath of firstCheckViewPaths) {
  /** 当前角色工作台源码，仅用于静态约束汇总接线且不执行 Vue 运行时。 */
  const viewSource = readFileSync(new URL(viewPath, import.meta.url), 'utf8')

  assert.match(viewSource, /buildWorkflowTaskSummary/)
  assert.match(viewSource, /buildWorkflowTaskSummary\(result\.tasks,\s*'FIRST_CHECK'\)/)
  assert.match(viewSource, /FlowStatusSummary/)
  assert.match(viewSource, /title="首检当前角色待办汇总"/)
  assert.match(viewSource, /:summary="firstCheckFlowSummary"/)
  assert.match(
    viewSource,
    /listWorkflowTasks\('FIRST_CHECK'\)/
  )
  assert.match(viewSource, /listWorkflowTasks/)
  assert.doesNotMatch(viewSource, /getFirstCheckFlowSummary/)

  assert.doesNotMatch(viewSource, /const\s+(?:metrics|todayKey)\b/)
  assert.doesNotMatch(viewSource, /class="(?:summary-line|metric-grid|status-strip)\b/)
  assert.doesNotMatch(viewSource, /setInterval|WMI|CIM|mock(?:Data|Rows)|fake(?:Data|Rows)/i)
}
