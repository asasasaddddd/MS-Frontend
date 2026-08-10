import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/** 人员权限矩阵弹窗源码，用于锁定窄视口内的滚动与收缩边界。 */
const source = readFileSync(
  new URL('../src/views/system/components/RoleScopeMatrixDialog.vue', import.meta.url),
  'utf8',
)

assert.match(source, /wrap-class-name="permission-config-modal"/)
assert.match(source, /width="min\(980px, calc\(100vw - 32px\)\)"/)
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
  /\.scope-panel,\s*\.role-panel\s*\{[^}]*min-width:\s*0;/s,
)
assert.match(source, /\.scope-tree-shell\s*\{[^}]*overflow:\s*auto;/s)
assert.match(source, /\.role-checkbox-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s)
assert.match(source, /@media \(max-width: 760px\)[\s\S]*?grid-template-columns:\s*1fr;/s)
