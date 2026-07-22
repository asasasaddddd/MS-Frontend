<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { downloadAttachment, listAttachmentsByGroupId, type AttachmentId, type AttachmentRecord } from '@/api/attachment'

const props = withDefaults(
  defineProps<{
    groupId?: AttachmentId
    buttonText?: string
    title?: string
    size?: 'small' | 'middle' | 'large'
  }>(),
  {
    buttonText: '查看文件',
    title: '附件列表',
    size: 'middle'
  }
)

const open = ref(false)
const loading = ref(false)
const downloadingId = ref<string>()
const records = ref<AttachmentRecord[]>([])

function formatSize(size?: number) {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

async function showAttachments() {
  open.value = true
  records.value = []
  if (!props.groupId) return

  loading.value = true
  try {
    records.value = await listAttachmentsByGroupId(props.groupId)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '附件列表加载失败')
  } finally {
    loading.value = false
  }
}

async function handleDownload(record: AttachmentRecord) {
  const id = String(record.id)
  downloadingId.value = id
  try {
    await downloadAttachment(record)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '附件下载失败')
  } finally {
    if (downloadingId.value === id) {
      downloadingId.value = undefined
    }
  }
}
</script>

<template>
  <span class="attachment-list-button">
    <a-button :size="size" @click="showAttachments">{{ buttonText }}</a-button>
    <a-modal v-model:open="open" :title="title" width="640px" :footer="null">
      <a-empty v-if="!groupId" description="暂无附件组" />
      <a-spin v-else :spinning="loading">
        <a-empty v-if="!loading && records.length === 0" description="暂无附件" />
        <a-list v-else :data-source="records" item-layout="horizontal">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #title>
                  <a-button
                    type="link"
                    class="file-link"
                    :loading="downloadingId === String(item.id)"
                    @click="handleDownload(item)"
                  >
                    {{ item.fileName || item.id }}
                  </a-button>
                </template>
                <template #description>
                  {{ item.fileMime || item.fileExt || '文件' }} · {{ formatSize(item.fileSize) }}
                  <span v-if="item.uploaderName"> · 上传人：{{ item.uploaderName }}</span>
                </template>
              </a-list-item-meta>
              <a-button type="link" :loading="downloadingId === String(item.id)" @click="handleDownload(item)">
                下载
              </a-button>
            </a-list-item>
          </template>
        </a-list>
      </a-spin>
    </a-modal>
  </span>
</template>

<style scoped>
.attachment-list-button {
  display: inline-flex;
}

.file-link {
  height: auto;
  padding: 0;
  text-align: left;
  white-space: normal;
}
</style>
