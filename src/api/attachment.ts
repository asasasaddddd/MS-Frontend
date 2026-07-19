import { request } from '@/api/request'
import {
  attachmentDownloadUrl,
  createAttachmentFormData,
  type AttachmentId,
  type AttachmentRecord,
  type AttachmentUploadInput
} from '@/api/attachmentModel'
import type { AttachmentCaseGroupVO } from '@/types/device'

export type { AttachmentId, AttachmentRecord, AttachmentUploadInput }
export { attachmentDownloadUrl }

export function uploadAttachment(input: AttachmentUploadInput) {
  return request<AttachmentRecord>({
    url: '/attachment/upload',
    method: 'POST',
    data: createAttachmentFormData(input)
  })
}

export function listAttachmentsByGroupId(groupId: AttachmentId) {
  return request<AttachmentRecord[]>({
    url: `/attachment/group/${groupId}`,
    method: 'GET'
  })
}

export function listAttachmentsByCaseId(caseId: string | number) {
  return request<AttachmentCaseGroupVO[]>({
    url: `/attachment/cases/${encodeURIComponent(String(caseId))}`,
    method: 'GET'
  })
}
