import assert from 'node:assert/strict'

import {
  mapBusinessEventRow,
  mapBusinessFlowRow,
  mapCaseAttachmentSection,
  statusTagColor
} from '../src/views/device/deviceBusinessHistoryModel.ts'

const event = mapBusinessEventRow({
  caseId: 1001,
  businessType: 'periodic_task',
  businessTypeName: '周检任务',
  businessNo: 'ZJ-2026-001',
  title: '压力表周检',
  statusCode: 'running',
  statusName: '进行中',
  currentNodeCode: 'external_return',
  currentNodeName: '外委送回',
  resultCode: 'qualified',
  resultName: '合格',
  startedAt: '2026-07-20T10:20:00'
})

assert.equal(event.key, '1001')
assert.equal(event.typeText, '周检任务')
assert.equal(event.statusText, '进行中')
assert.equal(event.currentNodeText, '外委送回')
assert.equal(event.resultText, '合格')
assert.equal(event.dateText, '2026-07-20 10:20')

const flow = mapBusinessFlowRow({
  id: 3001,
  eventKind: 'APPROVAL',
  eventKindName: '审批',
  nodeName: '确认员确认',
  actionName: '通过',
  operatorId: 'U001',
  operatorName: '王熙然',
  opinion: '设备合格，同意进入赋码',
  resultCode: 'approved',
  resultName: '通过',
  operatedAt: '2026-07-20T11:30:45'
})

assert.equal(flow.key, '3001')
assert.equal(flow.kindText, '审批')
assert.equal(flow.actionText, '通过')
assert.equal(flow.operatorText, '王熙然（U001）')
assert.equal(flow.opinion, '设备合格，同意进入赋码')
assert.equal(flow.resultText, '通过')
assert.equal(flow.dateText, '2026-07-20 11:30')

const attachment = mapCaseAttachmentSection({
  link: {
    attachmentGroupId: 5001,
    purpose: 'VERIFICATION_CERTIFICATE',
    linkScope: 'NODE'
  },
  group: {
    id: 5001,
    groupNo: 'AG-5001',
    status: 'locked',
    files: [{ id: 6001, fileName: 'certificate.pdf', fileMime: 'application/pdf' }]
  },
  purposeName: '检定证书',
  linkScopeName: '节点',
  statusName: '已锁定'
})

assert.equal(attachment.key, '5001')
assert.equal(attachment.purposeText, '检定证书')
assert.equal(attachment.scopeText, '节点')
assert.equal(attachment.statusText, '已锁定')
assert.equal(attachment.files.length, 1)
assert.equal(attachment.files[0].fileName, 'certificate.pdf')

assert.equal(statusTagColor('completed'), 'green')
assert.equal(statusTagColor('rejected'), 'red')
assert.equal(statusTagColor('running'), 'blue')
assert.equal(statusTagColor('pending'), 'orange')
