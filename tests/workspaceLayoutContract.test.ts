import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workspace = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')

assert.match(
  workspace,
  /\.workspace-task-tabs\s*:deep\(\.ant-tabs-nav\)\s*\{[\s\S]*?padding:\s*0\s+18px\s*;/,
  '总待办页签导航必须与卡片标题、筛选区和任务列表保持 18px 水平间距'
)
