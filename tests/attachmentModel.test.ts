import assert from 'node:assert/strict'

import {
  attachmentDownloadUrl,
  createAttachmentFormData,
  resolveUploadedAttachmentGroupId
} from '../src/api/attachmentModel.ts'

const file = new Blob(['firstcheck attachment'], { type: 'text/plain' })
const formData = createAttachmentFormData({
  file,
  fileName: 'firstcheck.txt',
  businessType: 'FIRST_CHECK',
  businessId: '2070143016618696705',
  attachmentGroupId: '2070143016618696710',
  remark: '供应商申请附件'
})

assert.equal(formData.get('businessType'), 'FIRST_CHECK')
assert.equal(formData.get('businessId'), '2070143016618696705')
assert.equal(formData.get('attachmentGroupId'), '2070143016618696710')
assert.equal(formData.get('remark'), '供应商申请附件')

const uploaded = {
  id: '2070143016618696720',
  attachmentGroupId: '2070143016618696710'
}

assert.equal(resolveUploadedAttachmentGroupId(uploaded), '2070143016618696710')
assert.equal(attachmentDownloadUrl(uploaded), '/api/attachment/file/2070143016618696720')
