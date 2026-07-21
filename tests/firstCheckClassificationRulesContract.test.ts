import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const categoryDialog = source('../src/views/firstcheck/components/FirstCheckCategoryDialog.vue')
const engineerDialog = source('../src/views/firstcheck/components/FirstCheckEngineerDialog.vue')

const canSubmitExpression = categoryDialog.match(/const canSubmit = computed\(\(\) =>[\s\S]*?\n\)/)?.[0] || ''
assert.doesNotMatch(canSubmitExpression, /reportFileId/)

assert.match(engineerDialog, /v-model:value="form\.isCommon"/)
assert.match(engineerDialog, /:disabled="form\.verificationType === 'self_check'"/)
assert.match(engineerDialog, /watch\([\s\S]*?form\.verificationType[\s\S]*?form\.isCommon = 1/)
assert.match(engineerDialog, /isCommon: form\.verificationType === 'self_check' \? 1 : form\.isCommon/)
