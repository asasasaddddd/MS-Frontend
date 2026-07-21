import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const historyPanel = source('../src/views/firstcheck/components/FirstCheckHistoryPanel.vue')
assert.match(historyPanel, /listWorkflowHistory/)
assert.match(historyPanel, /matchesWorkflowTaskRole/)
assert.match(historyPanel, /matchesFirstCheckVerifierRole/)
assert.match(historyPanel, /当前流转节点/)
assert.match(historyPanel, /本人处理意见/)
assert.match(historyPanel, /AttachmentListButton/)

for (const view of [
  'FirstCheckAdminView.vue',
  'FirstCheckLeaderView.vue',
  'FirstCheckEngineerView.vue',
  'FirstCheckVerifierView.vue'
]) {
  const viewSource = source(`../src/views/firstcheck/${view}`)
  assert.match(viewSource, /FirstCheckHistoryPanel/)
  assert.match(viewSource, /tab="已办"/)
}
