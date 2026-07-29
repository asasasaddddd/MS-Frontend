import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/** 人员权限页面源码，用于锁定弹窗在窄视口内的滚动与收缩边界。 */
const source = readFileSync(
  new URL('../src/views/system/SystemPermissionView.vue', import.meta.url),
  'utf8',
)

assert.match(source, /wrap-class-name="permission-config-modal"/)
assert.match(source, /width="min\(1120px, calc\(100vw - 32px\)\)"/)
assert.match(
  source,
  /permission-config-modal \.ant-modal-content[\s\S]*?max-height:\s*calc\(100vh - 32px\)/,
)
assert.match(
  source,
  /permission-config-modal \.ant-modal-body[\s\S]*?overflow-y:\s*auto/,
)
assert.match(
  source,
  /\.permission-editor,\s*\.editor-section,\s*\.backend-preview,\s*\.grant-list-section,\s*\.role-scope-section,\s*\.advanced-permission-section,\s*\.two-column-grid > \*,\s*\.role-assignment-row > \*\s*\{[^}]*min-width:\s*0;/s,
)
assert.match(source, /\.role-assignment-row\s*\{[^}]*flex-wrap:\s*wrap;/s)
assert.match(source, /class="grant-table-scroll"[\s\S]*?<a-table/)
assert.match(source, /\.grant-table-scroll\s*\{[^}]*overflow-x:\s*auto;/s)
assert.match(source, /class="role-scope-table-scroll"[\s\S]*?<a-table/)
assert.match(source, /\.role-scope-table-scroll\s*\{[^}]*overflow-x:\s*auto;/s)
