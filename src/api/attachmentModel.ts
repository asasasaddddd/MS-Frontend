export type AttachmentId = string | number

export interface AttachmentRecord {
  id: AttachmentId
  attachmentGroupId?: AttachmentId
  businessType?: string
  businessId?: AttachmentId
  fileName?: string
  fileExt?: string
  fileMime?: string
  fileSize?: number
  fileUrl?: string
  uploaderId?: string
  uploaderName?: string
  uploadedAt?: string
  remark?: string
}

export interface AttachmentUploadInput {
  file: Blob
  fileName?: string
  businessType: string
  businessId?: AttachmentId
  attachmentGroupId?: AttachmentId
  remark?: string
}

function appendIfPresent(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return
  formData.append(key, String(value))
}

export function createAttachmentFormData(input: AttachmentUploadInput) {
  const formData = new FormData()
  formData.append('file', input.file, input.fileName || 'attachment.bin')
  appendIfPresent(formData, 'businessType', input.businessType)
  appendIfPresent(formData, 'businessId', input.businessId)
  appendIfPresent(formData, 'attachmentGroupId', input.attachmentGroupId)
  appendIfPresent(formData, 'remark', input.remark)
  return formData
}

export function resolveUploadedAttachmentGroupId(record: AttachmentRecord) {
  if (record.attachmentGroupId === undefined || record.attachmentGroupId === null || record.attachmentGroupId === '') {
    throw new Error('附件上传成功但未返回附件组ID')
  }
  return record.attachmentGroupId
}

export function attachmentDownloadUrl(recordOrId: AttachmentRecord | AttachmentId) {
  const id = typeof recordOrId === 'object' ? recordOrId.id : recordOrId
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  return `${apiBaseUrl}/attachment/file/${encodeURIComponent(String(id))}`
}
