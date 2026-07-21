import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const panel = source('../src/views/change/components/ChangeHistoryPanel.vue')
assert.match(panel, /listWorkflowHistory/)
assert.match(panel, /getWorkflowProcessByBusiness/)
assert.match(panel, /本人处理意见/)
assert.match(panel, /当前流转节点/)

for (const view of ['ChangeApplyView.vue', 'ChangeDeptLeaderView.vue', 'ChangeVerifierView.vue']) {
  const viewSource = source(`../src/views/change/${view}`)
  assert.match(viewSource, /ChangeHistoryPanel/)
  assert.match(viewSource, /tab="已办"/)
}

const workspace = source('../src/views/WorkspaceTodoView.vue')
assert.match(workspace, /changeHistoryEntries/)
