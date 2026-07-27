import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const requestSource = readFileSync(new URL('../src/api/request.ts', import.meta.url), 'utf8')
const streamSource = readFileSync(new URL('../src/api/todoNotificationStream.ts', import.meta.url), 'utf8')

assert.match(requestSource, /export function buildAuthHeaders/)
assert.match(streamSource, /fetch\(/)
assert.match(streamSource, /buildAuthHeaders/)
assert.match(streamSource, /Authorization|X-User-Role/)
assert.doesNotMatch(streamSource, /[?&]token=/)
assert.match(streamSource, /AbortController/)
assert.match(streamSource, /todo-invalidated/)
assert.match(streamSource, /heartbeat/)
assert.match(streamSource, /\[1000,\s*2000,\s*4000,\s*8000,\s*15000\]/)
assert.match(streamSource, /TextDecoder/)
