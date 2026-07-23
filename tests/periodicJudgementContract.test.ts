import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  buildPeriodicJudgementRequest,
  buildPeriodicScrapDisposalRequest,
  isPeriodicJudgementResult,
  periodicEndpoint,
  periodicNodeName
} from '../src/api/periodicContract.ts'
import {
  getPeriodicJudgementDisplay,
  mapPeriodicTaskRow
} from '../src/views/periodic/periodicDisplayModel.ts'

assert.equal(periodicEndpoint('judgements'), '/periodic/judgements')
assert.equal(periodicEndpoint('scrapDisposal'), '/periodic/scrap-disposal')

assert.equal(isPeriodicJudgementResult('qualified'), true)
assert.equal(isPeriodicJudgementResult('unqualified'), true)
assert.equal(isPeriodicJudgementResult('repair'), false)
assert.equal(isPeriodicJudgementResult('scrap'), false)

assert.deepEqual(
  buildPeriodicJudgementRequest({
    taskId: '2073579908903317505',
    judgeResult: 'qualified',
    opinion: '  passed  '
  }),
  {
    taskId: '2073579908903317505',
    judgeResult: 'qualified',
    opinion: 'passed'
  }
)

assert.deepEqual(
  buildPeriodicScrapDisposalRequest({
    taskId: '2073579908903317505',
    scrapReason: '  damaged beyond repair  ',
    opinion: '  remove from service  '
  }),
  {
    taskId: '2073579908903317505',
    scrapReason: 'damaged beyond repair',
    opinion: 'remove from service'
  }
)

const judgementNodes = [
  ['verifier_second_judge', 'VERIFIER_EXTERNAL', 2],
  ['responsible_second_judge', 'RESPONSIBLE_ENGINEER', 2],
  ['responsible_third_judge', 'RESPONSIBLE_ENGINEER', 3],
  ['verifier_third_judge', 'VERIFIER_EXTERNAL', 3],
  ['responsible_fourth_judge', 'RESPONSIBLE_ENGINEER', 4]
] as const

for (const [nodeCode, roleCode, round] of judgementNodes) {
  const display = getPeriodicJudgementDisplay(nodeCode)
  assert.equal(display?.roleCode, roleCode)
  assert.equal(display?.round, round)
  assert.ok(periodicNodeName(nodeCode).length > 0)
  assert.equal(mapPeriodicTaskRow({ id: `task-${nodeCode}`, currentNode: nodeCode }).currentNodeName, periodicNodeName(nodeCode))
}

assert.equal(getPeriodicJudgementDisplay('verifier_scrap_disposal'), undefined)
assert.equal(periodicNodeName('verifier_scrap_disposal').length > 0, true)
assert.equal(
  mapPeriodicTaskRow({ id: 'task-scrap', currentNode: 'verifier_scrap_disposal' }).currentNodeName,
  periodicNodeName('verifier_scrap_disposal')
)
assert.equal(periodicNodeName('external_third_judge'), 'external_third_judge')

const judgementDialogUrl = new URL(
  '../src/views/periodic/components/PeriodicJudgementDialog.vue',
  import.meta.url
)
const scrapDialogUrl = new URL(
  '../src/views/periodic/components/PeriodicScrapDisposalDialog.vue',
  import.meta.url
)
assert.equal(existsSync(judgementDialogUrl), true)
assert.equal(existsSync(scrapDialogUrl), true)

const judgementDialogSource = readFileSync(judgementDialogUrl, 'utf8')
assert.match(judgementDialogSource, /getPeriodicJudgementDisplay/)
assert.match(judgementDialogSource, /judgementRecords/)
assert.match(judgementDialogSource, /PeriodicJudgementHistory/)
assert.match(judgementDialogSource, /judgeResult/)
assert.match(judgementDialogSource, /qualified/)
assert.match(judgementDialogSource, /unqualified/)
assert.doesNotMatch(judgementDialogSource, /repair|scrap/)

const judgementHistorySource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicJudgementHistory.vue', import.meta.url),
  'utf8'
)
assert.match(judgementHistorySource, /判定历程/)
assert.match(judgementHistorySource, /judgementRecords/)
assert.match(judgementHistorySource, /judgeUserId/)
assert.match(judgementHistorySource, /judgeResult/)

const scrapDialogSource = readFileSync(scrapDialogUrl, 'utf8')
assert.match(scrapDialogSource, /scrapReason/)
assert.match(scrapDialogSource, /opinion/)
assert.doesNotMatch(scrapDialogSource, /\b(?:nextNode|round|judgeResult)\b/)

const workspaceSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicTaskWorkspace.vue', import.meta.url),
  'utf8'
)
assert.match(workspaceSource, /PeriodicJudgementDialog/)
assert.match(workspaceSource, /PeriodicScrapDisposalDialog/)
assert.match(workspaceSource, /submitPeriodicJudgement/)
assert.match(workspaceSource, /submitPeriodicScrapDisposal/)
assert.match(workspaceSource, /getPeriodicTask/)
assert.match(workspaceSource, /loadAuthoritativeTask/)
assert.doesNotMatch(workspaceSource, /PeriodicResponsibleJudgeDialog|PeriodicSecondJudgeDialog/)
assert.doesNotMatch(workspaceSource, /responsibleSecondJudgePeriodic|secondJudgePeriodic/)

const apiSource = readFileSync(new URL('../src/api/periodic.ts', import.meta.url), 'utf8')
assert.match(apiSource, /function submitPeriodicJudgement[\s\S]*periodicEndpoint\('judgements'\)[\s\S]*method:\s*'POST'/)
assert.match(apiSource, /function submitPeriodicScrapDisposal[\s\S]*periodicEndpoint\('scrapDisposal'\)[\s\S]*method:\s*'POST'/)
assert.doesNotMatch(apiSource, /responsibleSecondJudgePeriodic|secondJudgePeriodic/)

const contractSource = readFileSync(new URL('../src/api/periodicContract.ts', import.meta.url), 'utf8')
assert.doesNotMatch(contractSource, /responsible-second-judge|\/periodic\/second-judge/)
assert.doesNotMatch(contractSource, /PeriodicSecondJudge|PeriodicResponsibleSecondJudge/)

const typeSource = readFileSync(new URL('../src/types/periodic.ts', import.meta.url), 'utf8')
assert.match(typeSource, /interface PeriodicJudgementRecordVO/)
assert.match(typeSource, /judgementRecords\?: PeriodicJudgementRecordVO\[\]/)
assert.doesNotMatch(typeSource, /PeriodicSecondJudge|PeriodicResponsibleSecondJudge/)
assert.doesNotMatch(typeSource, /PeriodicResponsibleJudgeResult/)

const statusDefinitionSource = readFileSync(
  new URL('../src/components/workflow/flowStatusDefinitions.ts', import.meta.url),
  'utf8'
)
for (const nodeCode of [...judgementNodes.map(([nodeCode]) => nodeCode), 'verifier_scrap_disposal']) {
  assert.match(statusDefinitionSource, new RegExp(`stageCode: '${nodeCode}'`))
}
assert.doesNotMatch(statusDefinitionSource, /stageCode: 'external_third_judge'/)

const responsibleViewSource = readFileSync(
  new URL('../src/views/periodic/PeriodicResponsibleEngineerView.vue', import.meta.url),
  'utf8'
)
for (const nodeCode of ['responsible_second_judge', 'responsible_third_judge', 'responsible_fourth_judge']) {
  assert.match(responsibleViewSource, new RegExp(nodeCode))
}

const verifierViewSource = readFileSync(
  new URL('../src/views/periodic/PeriodicVerifierExternalView.vue', import.meta.url),
  'utf8'
)
for (const nodeCode of ['verifier_second_judge', 'verifier_third_judge', 'verifier_scrap_disposal']) {
  assert.match(verifierViewSource, new RegExp(nodeCode))
}

const navigationSource = readFileSync(new URL('../src/composables/useNavSections.ts', import.meta.url), 'utf8')
assert.match(navigationSource, /多轮判定和报废处置/)
assert.match(navigationSource, /责任工程师多轮判定/)

const routerSource = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
assert.match(routerSource, /责任工程师周检判定/)

assert.equal(
  existsSync(new URL('../src/views/periodic/components/PeriodicResponsibleJudgeDialog.vue', import.meta.url)),
  false
)
assert.equal(
  existsSync(new URL('../src/views/periodic/components/PeriodicSecondJudgeDialog.vue', import.meta.url)),
  false
)
