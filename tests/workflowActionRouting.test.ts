import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { resolvePeriodicTaskAction } from '../src/views/periodic/periodicDisplayModel.ts'
import { resolveSamplingTaskAction } from '../src/views/sampling/samplingDisplayModel.ts'

function periodicTask(currentNode: string, allowedActions: string[], physicalStatus?: string) {
  return { currentNode, allowedActions, physicalStatus }
}

assert.equal(resolvePeriodicTaskAction(periodicTask('self_verify', [])), undefined)
assert.equal(resolvePeriodicTaskAction(periodicTask('self_verify', ['SUBMIT'])), 'verify')
assert.equal(resolvePeriodicTaskAction(periodicTask('admin_exception_route', ['SUBMIT_EXCEPTION'])), 'submit-exception')
assert.equal(resolvePeriodicTaskAction(periodicTask('admin_exception_route', ['RECEIVE'])), undefined)
assert.equal(
  resolvePeriodicTaskAction(periodicTask('admin_exception_route', [], 'wait_verifier_receive')),
  undefined
)
assert.equal(resolvePeriodicTaskAction(periodicTask('external_common_fill', ['SUBMIT'])), 'supplier-fill')
assert.equal(resolvePeriodicTaskAction(periodicTask('external_uncommon_fill', ['SUBMIT'])), 'external-verify')
assert.equal(resolvePeriodicTaskAction(periodicTask('send_out', ['SEND_OUT'])), undefined)
assert.equal(resolvePeriodicTaskAction(periodicTask('send_out', ['SEND_OUT_RETURN'])), undefined)
assert.equal(resolvePeriodicTaskAction(periodicTask('verifier_second_judge', ['SUBMIT'])), undefined)
assert.equal(resolvePeriodicTaskAction(periodicTask('verifier_second_judge', ['JUDGE'])), 'judgement')
assert.equal(resolvePeriodicTaskAction(periodicTask('responsible_scrap_confirm', ['APPROVE_REJECT'])), 'scrap-confirm')
assert.equal(resolvePeriodicTaskAction(periodicTask('responsible_scrap_tracking_decision', ['JUDGE'])), 'scrap-tracking-decision')
assert.equal(resolvePeriodicTaskAction(periodicTask('manager_forward_confirm', ['SUBMIT'])), 'manager-forward')
assert.equal(resolvePeriodicTaskAction(periodicTask('confirmer_confirm', ['APPROVE_REJECT'])), 'confirm')
assert.equal(resolvePeriodicTaskAction(periodicTask('send_out_return', ['VIEW'])), undefined)

function samplingTask(currentNode: string, allowedActions: string[]) {
  return { currentNode, allowedActions }
}

assert.equal(resolveSamplingTaskAction(samplingTask('admin_confirm', ['SUBMIT'])), 'admin-confirm')
assert.equal(resolveSamplingTaskAction(samplingTask('verifier_fill', ['SUBMIT'])), 'verifier-submit')
assert.equal(resolveSamplingTaskAction(samplingTask('confirmer_confirm', ['APPROVE_REJECT'])), 'confirmer-submit')
assert.equal(resolveSamplingTaskAction(samplingTask('admin_confirm', ['APPROVE_REJECT'])), undefined)
assert.equal(resolveSamplingTaskAction(samplingTask('verifier_fill', ['VIEW'])), undefined)

const periodicWorkspace = readFileSync(
  new URL('../src/views/periodic/components/PeriodicTaskWorkspace.vue', import.meta.url),
  'utf8'
)
const periodicTable = readFileSync(
  new URL('../src/views/periodic/components/PeriodicTaskTable.vue', import.meta.url),
  'utf8'
)
assert.match(periodicWorkspace, /resolvePeriodicTaskAction/)
assert.match(periodicWorkspace, /action === 'scan-receive'/)
assert.match(periodicWorkspace, /module:\s*'periodic'/)
assert.match(periodicWorkspace, /action:\s*'periodic-verifier-receive'/)
assert.doesNotMatch(periodicWorkspace, /props\.role === 'verifier'|physicalStatus === 'wait_sendout_return_receive'/)
assert.doesNotMatch(periodicWorkspace, /periodic-external-send-out|periodic-send-out-return/)
assert.match(periodicTable, /resolvePeriodicTaskAction/)
assert.doesNotMatch(periodicTable, /allowedActions\?\.length/)

const samplingWorkspace = readFileSync(
  new URL('../src/views/sampling/components/SamplingTaskWorkspace.vue', import.meta.url),
  'utf8'
)
const samplingTable = readFileSync(
  new URL('../src/views/sampling/components/SamplingTaskTable.vue', import.meta.url),
  'utf8'
)
assert.match(samplingWorkspace, /resolveSamplingTaskAction/)
assert.doesNotMatch(samplingWorkspace, /!task\.allowedActions\?\.length/)
assert.doesNotMatch(samplingWorkspace, /hasWorkflowAction\(task, 'APPROVE_REJECT'\)\s*\?\s*confirmerSubmitSampling/)
const samplingAdminSubmit = samplingWorkspace.slice(
  samplingWorkspace.indexOf('async function submitAdminConfirm()'),
  samplingWorkspace.indexOf('async function submitResult')
)
assert.match(
  samplingAdminSubmit,
  /selectedTasks\.value\.every\([\s\S]*resolveSamplingTaskAction\(task\) === 'admin-confirm'/
)
assert.match(samplingTable, /resolveSamplingTaskAction/)
assert.doesNotMatch(samplingTable, /allowedActions\?\.length/)
