import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dialogSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicConfirmDialog.vue', import.meta.url),
  'utf8'
)
const typeSource = readFileSync(new URL('../src/types/periodic.ts', import.meta.url), 'utf8')

assert.match(
  typeSource,
  /export type PeriodicConfirmResult\s*=\s*'qualified'\s*\|\s*'scrap'\s*\|\s*'repair'/
)
assert.match(dialogSource, /\{ label: '合格', value: 'qualified' \}/)
assert.match(dialogSource, /\{ label: '报废', value: 'scrap' \}/)
assert.match(dialogSource, /\{ label: '维修', value: 'repair' \}/)
assert.match(dialogSource, /confirmResult:\s*'qualified' as PeriodicConfirmResult/)
assert.match(dialogSource, /form\.confirmResult\s*===\s*'scrap'/)
assert.match(dialogSource, /task\?\.responsibleEngineerId/)
assert.doesNotMatch(dialogSource, /value: 'APPROVE'|value: 'REJECT'/)
