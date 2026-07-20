<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  attachmentDownloadUrl,
  uploadAttachment,
  type AttachmentId,
  type AttachmentRecord
} from '@/api/attachment'
import { resolveUploadedAttachmentGroupId } from '@/api/attachmentModel'

const props = withDefaults(
  defineProps<{
    modelValue?: AttachmentId
    businessType: string
    businessId?: AttachmentId
    remark?: string
    buttonText?: string
    disabled?: boolean
    size?: 'small' | 'middle' | 'large'
  }>(),
  {
    buttonText: '上传文件',
    disabled: false,
    size: 'middle'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: AttachmentId]
  uploaded: [value: AttachmentRecord]
}>()

const inputRef = ref<HTMLInputElement>()
const uploading = ref(false)
const uploadedRecords = ref<AttachmentRecord[]>([])

function chooseFile() {
  if (props.disabled || uploading.value) return
  inputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  uploading.value = true
  try {
    const record = await uploadAttachment({
      file,
      fileName: file.name,
      attachmentGroupId: props.modelValue,
      remark: props.remark
    })
    const groupId = resolveUploadedAttachmentGroupId(record)
    uploadedRecords.value = [record, ...uploadedRecords.value]
    emit('update:modelValue', groupId)
    emit('uploaded', record)
    message.success('文件上传成功')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '文件上传失败')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="attachment-upload-button">
    <a-button :size="size" :loading="uploading" :disabled="disabled" @click="chooseFile">{{ buttonText }}</a-button>
    <input ref="inputRef" class="file-input" type="file" style="display: none" @change="handleFileChange" />
    <div v-if="uploadedRecords.length > 0" class="uploaded-list">
      <a
        v-for="record in uploadedRecords"
        :key="String(record.id)"
        :href="attachmentDownloadUrl(record)"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ record.fileName || record.id }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.attachment-upload-button {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.file-input {
  display: none;
}

.uploaded-list {
  min-width: 0;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  color: #1769e0;
  font-size: 12px;
}

.uploaded-list a {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
