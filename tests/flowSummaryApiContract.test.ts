import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/** 统一流程汇总 API 源码，用于固定五个生产接口的请求契约。 */
const apiSource = readFileSync(new URL('../src/api/flowSummary.ts', import.meta.url), 'utf8')

assert.match(apiSource, /\/periodic\/plans\/\$\{encodeURIComponent\(String\(planId\)\)\}\/summary/)
assert.doesNotMatch(apiSource, /\/firstcheck\/summary/)
assert.match(apiSource, /url:\s*'\/change\/summary'/)
assert.match(apiSource, /params:\s*\{ scope \}/)
assert.match(apiSource, /\/sampling\/plans\/\$\{encodeURIComponent\(String\(planId\)\)\}\/summary/)
assert.match(apiSource, /url:\s*'\/product-support\/my-tasks\/summary'/)
assert.doesNotMatch(apiSource, /setInterval|setTimeout/)
