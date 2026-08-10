import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dialog = readFileSync(
  new URL('../src/views/periodic/components/PeriodicPlanPickerDialog.vue', import.meta.url),
  'utf8'
)

assert.match(dialog, /items:\s*readonly PeriodicPlanPickerItem\[\]/)
assert.match(dialog, /open:\s*boolean/)
assert.match(dialog, /incomplete:\s*boolean/)
assert.match(dialog, /'update:open':\s*\[value:\s*boolean\]/)
assert.match(dialog, /select:\s*\[planId:\s*string\]/)
assert.match(dialog, /emit\('select',\s*planId\)/)

for (const label of ['周检待办单据', '周检单号', '当前节点', '条目数量', '进入详情']) {
  assert.match(dialog, new RegExp(label))
}
assert.match(dialog, /当前角色暂时无周检待办单据/)
assert.match(dialog, /周检单据入口加载失败，请检查后端接口/)
assert.match(dialog, /type="error"/)
assert.match(dialog, /v-else-if="!incomplete"/)
assert.match(dialog, /:pagination="false"/)
assert.match(dialog, /:scroll="\{ x: 680 \}"/)
assert.match(dialog, /destroy-on-close/)

assert.doesNotMatch(dialog, /@\/api\/|useRouter|useRoute|useSessionStore|allowedActions/)
