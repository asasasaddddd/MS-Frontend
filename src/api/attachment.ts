import { request } from '@/api/request'
import {
  attachmentDownloadUrl,
  createAttachmentFormData,
  type AttachmentGroupCreateInput,
  type AttachmentGroupRecord,
  type AttachmentId,
  type AttachmentRecord,
  type AttachmentUploadInput
} from '@/api/attachmentModel'
import type { AttachmentCaseGroupVO } from '@/types/device'

export type {
  AttachmentGroupCreateInput,
  AttachmentGroupRecord,
  AttachmentId,
  AttachmentRecord,
  AttachmentUploadInput
}
export { attachmentDownloadUrl }

export function createAttachmentGroup(input: AttachmentGroupCreateInput = {}) {
  return request<AttachmentGroupRecord>({
    url: '/attachment/groups',
    method: 'POST',
    data: input
  })
}

export function getAttachmentGroup(groupId: AttachmentId) {
  return request<AttachmentGroupRecord>({
    url: `/attachment/groups/${encodeURIComponent(String(groupId))}`,
    method: 'GET'
  })
}

export async function uploadAttachment(input: AttachmentUploadInput) {
  let groupId = input.attachmentGroupId
  if (groupId === undefined || groupId === null || groupId === '') {
    const group = await createAttachmentGroup()
    groupId = group.id
  }

  return request<AttachmentRecord>({
    url: `/attachment/groups/${encodeURIComponent(String(groupId))}/files`,
    method: 'POST',
    data: createAttachmentFormData(input)
  })
}

export async function listAttachmentsByGroupId(groupId: AttachmentId) {
  const group = await getAttachmentGroup(groupId)
  return group.files || []
}

export function listAttachmentsByCaseId(caseId: string | number) {
  return request<AttachmentCaseGroupVO[]>({
    url: `/attachment/cases/${encodeURIComponent(String(caseId))}`,
    method: 'GET'
  })
}
