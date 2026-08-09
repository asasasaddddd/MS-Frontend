import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const commonTypeSource = readFileSync(
  new URL('../src/types/common.ts', import.meta.url),
  'utf8'
)

assert.match(
  commonTypeSource,
  /export type EntityId = string\b/,
  'all MySQL BIGINT and snowflake entity identifiers must share one string-only frontend type'
)
assert.match(
  commonTypeSource,
  /export function normalizeEntityId\(/,
  'the API boundary must expose one entity ID normalizer instead of ad-hoc Number/String casts'
)

const entityTypeFiles = [
  'periodic.ts',
  'sampling.ts',
  'scan.ts',
  'workflow.ts',
  'productSupport.ts'
]

for (const fileName of entityTypeFiles) {
  const source = readFileSync(new URL(`../src/types/${fileName}`, import.meta.url), 'utf8')
  assert.doesNotMatch(
    source,
    /export type \w*EntityId = string \| number/,
    `${fileName} must reuse the shared string-only EntityId contract`
  )
}

const systemApiSource = readFileSync(new URL('../src/api/system.ts', import.meta.url), 'utf8')
assert.match(systemApiSource, /import type \{ EntityId, PageResult \} from '@\/types\/common'/)
assert.doesNotMatch(systemApiSource, /\bid\??:\s*number\b/)

const periodicContractSource = readFileSync(
  new URL('../src/api/periodicContract.ts', import.meta.url),
  'utf8'
)
const changeContractSource = readFileSync(
  new URL('../src/api/changeContract.ts', import.meta.url),
  'utf8'
)
assert.doesNotMatch(periodicContractSource, /id\?: string \| number/)
assert.doesNotMatch(changeContractSource, /id\?: string \| number/)

const { normalizeEntityId } = await import('../src/types/common.ts')
const longSnowflakeId = '9223372036854775807'

assert.equal(normalizeEntityId(longSnowflakeId), longSnowflakeId)
assert.equal(normalizeEntityId(12345), '12345')
assert.throws(
  () => normalizeEntityId(Number.MAX_SAFE_INTEGER + 1),
  /unsafe numeric entity id/i,
  'an already rounded JavaScript number must be rejected because its original MySQL BIGINT cannot be recovered'
)
assert.throws(() => normalizeEntityId('   '), /entity id is required/i)
