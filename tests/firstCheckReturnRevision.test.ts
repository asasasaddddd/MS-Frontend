import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { latestFirstCheckReturnFeedback } from '../src/views/firstcheck/firstCheckReturnModel.ts'

const initialHistory = {
  id: '1',
  timeline: [
    {
      id: '10',
      actionCode: 'APPROVE_AND_FORWARD',
      nodeCode: 'manager_classify',
      operatorId: 'U03013971',
      operatorName: '王熙然',
      opinion: '首次分类提交',
      operatedAt: '2026-07-21T09:00:00'
    }
  ]
}

assert.equal(latestFirstCheckReturnFeedback(initialHistory), undefined)
assert.equal(latestFirstCheckReturnFeedback(undefined), undefined)

const returnedHistory = {
  id: '1',
  timeline: [
    {
      id: '11',
      actionCode: 'RETURN_AND_FORWARD',
      nodeCode: 'dept_leader_approve',
      nodeName: '主管领导审批',
      operatorId: 'U00109027',
      operatorName: '主管领导甲',
      opinion: '管理类别需要调整',
      operatedAt: '2026-07-21T10:00:00'
    },
    {
      id: '12',
      actionCode: 'RETURN_AND_FORWARD',
      nodeCode: 'engineer_route',
      nodeName: '责任工程师确认',
      operatorId: 'U00108072',
      operatorName: '责任工程师乙',
      opinion: '检定方式需要调整',
      operatedAt: '2026-07-21T11:00:00'
    },
    {
      id: '13',
      actionCode: 'RETURN_AND_FORWARD',
      nodeCode: 'unrelated_node',
      operatorName: '其他角色',
      opinion: '不应显示',
      operatedAt: '2026-07-21T12:00:00'
    }
  ]
}

assert.deepEqual(latestFirstCheckReturnFeedback(returnedHistory), {
  operatorId: 'U00108072',
  operatorName: '责任工程师乙',
  nodeCode: 'engineer_route',
  nodeName: '责任工程师确认',
  opinion: '检定方式需要调整',
  operatedAt: '2026-07-21T11:00:00'
})

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const api = source('../src/api/firstcheck.ts')
const categoryDialog = source('../src/views/firstcheck/components/FirstCheckCategoryDialog.vue')
const leaderDialog = source('../src/views/firstcheck/components/FirstCheckLeaderDialog.vue')
const engineerDialog = source('../src/views/firstcheck/components/FirstCheckEngineerDialog.vue')

assert.doesNotMatch(api, /dept-leader-reject/)
assert.match(api, /\/firstcheck\/dept-leader-return/)
assert.match(api, /\/firstcheck\/engineer-return/)
assert.match(categoryDialog, /v-if="returnFeedback"/)
assert.match(categoryDialog, /最近退回意见/)
assert.match(categoryDialog, /returnFeedback \? '重新提交' : '提交'/)
assert.doesNotMatch(leaderDialog, /驳回终止/)
assert.match(leaderDialog, /退回修改/)
assert.match(engineerDialog, /退回修改/)
