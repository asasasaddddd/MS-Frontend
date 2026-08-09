import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const samplingApiSource = source('../src/api/sampling.ts')
const workspaceTodoSource = source('../src/views/WorkspaceTodoView.vue')
const workspaceTodoAdapterSource = source('../src/views/workspaceTodoAdapters.ts')
const samplingWorkspaceSource = source('../src/views/sampling/components/SamplingTaskWorkspace.vue')

assert.match(
  samplingApiSource,
  /getSamplingTask\(\s*samplingTaskId:[\s\S]*?workflowTaskIdOrSignal/,
  '抽检详情 API 必须显式区分抽检任务ID和统一工作流任务ID'
)
assert.match(
  samplingApiSource,
  /params:\s*workflowTaskId\s*===\s*undefined\s*\?\s*undefined\s*:\s*\{\s*taskId:\s*workflowTaskId\s*\}/,
  '抽检详情接口必须把统一工作流任务ID作为 taskId query 参数传给后端授权'
)
assert.match(
  workspaceTodoAdapterSource,
  /getSamplingTask\(task\.businessId,\s*task\.taskId,\s*signal\)/,
  '总待办聚合加载抽检详情时必须携带 workflow taskId，否则抽检入口只剩汇总计数'
)
assert.match(workspaceTodoSource, /loadTodoModuleDetail/)
assert.match(
  samplingWorkspaceSource,
  /getSamplingTask\(task\.businessId,\s*task\.taskId,\s*signal\)/,
  '抽检详情页加载任务明细时必须携带 workflow taskId，否则会被后端授权上下文拦截'
)
