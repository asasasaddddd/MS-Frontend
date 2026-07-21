import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const categoryDialog = source('../src/views/firstcheck/components/FirstCheckCategoryDialog.vue')
assert.doesNotMatch(categoryDialog, /confirmerId|confirmers|CONFIRMER/)

const verifyDialog = source('../src/views/firstcheck/components/FirstCheckVerifyDialog.vue')
assert.match(verifyDialog, /listUsersByDeptAndRole/)
assert.match(verifyDialog, /order\?\.verificationType === 'external_commission'/)
assert.match(verifyDialog, /order\?\.isCommon === 0/)
assert.match(verifyDialog, /v-model:value="form\.confirmerId"/)
assert.match(verifyDialog, /confirmerId: requiresConfirmer\.value \? form\.confirmerId : undefined/)

const api = source('../src/api/firstcheck.ts')
assert.doesNotMatch(api, /managerForwardFirstCheck|confirmerConfirmFirstCheck|manager-forward|confirmer-confirm/)

const workflow = source('../src/workflows/metrologyWorkflow.ts')
const firstCheckWorkflow = workflow.match(/export const firstCheckNodes:[\s\S]*?\n\]/)?.[0] || ''
assert.doesNotMatch(firstCheckWorkflow, /code: 'manager_forward'/)
assert.doesNotMatch(firstCheckWorkflow, /code: 'confirmer_confirm'/)
assert.doesNotMatch(workflow, /firstcheck\.confirmer/)

const router = source('../src/router/index.ts')
const workspace = source('../src/views/WorkspaceTodoView.vue')
assert.doesNotMatch(router, /\/firstcheck\/confirmer/)
assert.doesNotMatch(workspace, /CONFIRMER: '\/firstcheck\/confirmer'/)

const types = source('../src/types/firstcheck.ts')
const confirmCategoryType = types.match(/export interface ConfirmCategoryRequest \{[\s\S]*?\n\}/)?.[0] || ''
const verifierType = types.match(/export interface VerifierVerifyRequest \{[\s\S]*?\n\}/)?.[0] || ''
assert.doesNotMatch(confirmCategoryType, /confirmerId|confirmerName/)
assert.match(verifierType, /confirmerId\?: string/)

assert.equal(existsSync(new URL('../src/views/firstcheck/FirstCheckConfirmerView.vue', import.meta.url)), false)
assert.equal(existsSync(new URL('../src/views/firstcheck/components/FirstCheckConfirmDialog.vue', import.meta.url)), false)
