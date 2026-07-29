import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/views/firstcheck/FirstCheckAdminView.vue', import.meta.url), 'utf8')

assert.match(source, /listUnifiedScanInbox/)
assert.match(source, /getPendingFirstCheckTakeBackRows/)
assert.match(source, /toTakeBackRow/)
assert.match(source, /isPhysicalScan/)
assert.match(source, /router\.push\(\{\s*path:\s*['"]\/scan['"]/s)
assert.match(source, /module:\s*['"]firstcheck['"]/)
assert.match(source, /action:\s*['"]take-back['"]/)
assert.match(source, /orderId:\s*String\(row\.order\.id\)/)
