import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function source(path: string): string {
  const url = new URL(path, import.meta.url)
  return existsSync(url) ? readFileSync(url, 'utf8') : ''
}

const workflowApi = source('../src/api/workflow.ts')
const workflowTypes = source('../src/types/workflow.ts')
const composable = source('../src/composables/useRoleTodoSummary.ts')

assert.match(workflowApi, /url:\s*'\/workflow\/tasks\/summary'/)
assert.match(workflowApi, /businessType:\s*query\.businessType/)
assert.match(workflowApi, /scopeType:\s*query\.scopeType/)
assert.match(workflowApi, /scopeId:\s*query\.scopeId/)
assert.match(workflowApi, /signal/)
assert.match(workflowTypes, /interface WorkflowTodoSummaryQuery/)
assert.match(workflowTypes, /scopeType\?:\s*'order'\s*\|\s*'plan'/)
assert.match(composable, /AbortController/)
assert.match(composable, /identityKey/)
assert.match(composable, /refresh/)
assert.match(composable, /watch\(/)
assert.doesNotMatch(composable, /buildWorkflowTaskSummary/)
