import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  attachmentDownloadUrl,
  createAttachmentFormData,
  resolveUploadedAttachmentGroupId,
  type AttachmentGroupRecord
} from '../src/api/attachmentModel.ts'

const file = new Blob(['firstcheck attachment'], { type: 'text/plain' })
const formData = createAttachmentFormData({
  file,
  fileName: 'firstcheck.txt',
  attachmentGroupId: '2070143016618696710',
  remark: 'supplier attachment'
})

assert.equal(formData.get('remark'), 'supplier attachment')
assert.equal(formData.get('businessType'), null)
assert.equal(formData.get('businessId'), null)
assert.equal(formData.get('attachmentGroupId'), null)

const uploaded = {
  id: '2070143016618696720',
  attachmentGroupId: '2070143016618696710'
}

assert.equal(resolveUploadedAttachmentGroupId(uploaded), '2070143016618696710')
assert.equal(attachmentDownloadUrl(uploaded), '/api/attachment/file/2070143016618696720')

const group: AttachmentGroupRecord = {
  id: '2070143016618696710',
  files: [uploaded]
}
assert.equal(group.files?.[0].attachmentGroupId, '2070143016618696710')

const attachmentApiSource = readFileSync(new URL('../src/api/attachment.ts', import.meta.url), 'utf8')
const requestSource = readFileSync(new URL('../src/api/request.ts', import.meta.url), 'utf8')
const uploadButtonSource = readFileSync(
  new URL('../src/components/AttachmentUploadButton.vue', import.meta.url),
  'utf8'
)
const listButtonSource = readFileSync(
  new URL('../src/components/AttachmentListButton.vue', import.meta.url),
  'utf8'
)

assert.equal(attachmentApiSource.includes('/attachment/upload'), false)
assert.equal(attachmentApiSource.includes('/attachment/groups'), true)
assert.equal(attachmentApiSource.includes('/files'), true)
assert.match(attachmentApiSource, /downloadAttachment/)
assert.match(requestSource, /requestBlob/)
assert.equal(uploadButtonSource.includes('businessType: props.businessType'), false)
assert.equal(uploadButtonSource.includes('businessId: props.businessId'), false)
assert.equal(listButtonSource.includes('listAttachmentsByGroupId'), true)
assert.doesNotMatch(listButtonSource, /:href="attachmentDownloadUrl/)
