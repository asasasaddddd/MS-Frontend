<script setup lang="ts">
import { computed } from 'vue'
import AttachmentListButton from '../../../components/AttachmentListButton.vue'
import type { EntityId, PeriodicPlanVO, PeriodicTaskVO } from '../../../types/periodic'
import { displayValue, mapPeriodicTaskRow } from '../periodicDisplayModel'

type TaskWithAttachment = PeriodicTaskVO & {
  certificateAttachmentGroupId?: EntityId
  recordAttachmentGroupId?: EntityId
  attachmentGroupId?: EntityId
}

const props = withDefaults(
  defineProps<{
    open: boolean
    task?: PeriodicTaskVO | null
    plan?: PeriodicPlanVO | null
    title?: string
  }>(),
  {
    task: null,
    plan: null,
    title: '周检任务详情'
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const row = computed(() => (props.task ? mapPeriodicTaskRow(props.task) : null))
const attachmentTask = computed(() => props.task as TaskWithAttachment | null)
</script>

<template>
  <a-modal
    v-model:open="modalOpen"
    :title="title"
    width="95vw"
    wrap-class-name="periodic-detail-dialog"
    :footer="null"
    destroy-on-close
  >
    <a-empty v-if="!task || !row" description="暂无周检任务详情" />
    <div v-else class="periodic-detail">
      <section class="detail-section">
        <div class="detail-section-title">
          <h3>计划基本信息</h3>
        </div>
        <a-descriptions bordered size="small" :column="{ xs: 1, sm: 2, lg: 4 }">
          <a-descriptions-item label="计划编号">{{ displayValue(plan?.planNo) }}</a-descriptions-item>
          <a-descriptions-item label="计划名称">{{ displayValue(plan?.planName) }}</a-descriptions-item>
          <a-descriptions-item label="所属部门">{{ displayValue(plan?.deptName) }}</a-descriptions-item>
          <a-descriptions-item label="负责人">{{ displayValue(plan?.ownerName) }}</a-descriptions-item>
        </a-descriptions>
      </section>

      <section class="detail-section">
        <div class="detail-section-title">
          <h3>设备状态基础信息</h3>
          <a-tag :class="['periodic-tag', row.tagColor]">{{ row.currentNodeName }}</a-tag>
        </div>
        <a-descriptions bordered size="small" :column="{ xs: 1, sm: 2, lg: 4 }">
          <a-descriptions-item label="计量编号">{{ row.deviceCode }}</a-descriptions-item>
          <a-descriptions-item label="设备名称">{{ row.deviceName }}</a-descriptions-item>
          <a-descriptions-item label="生产厂商">{{ row.manufacturer }}</a-descriptions-item>
          <a-descriptions-item label="出厂编号">{{ row.factoryCode }}</a-descriptions-item>
          <a-descriptions-item label="规格型号">{{ row.modelSpec }}</a-descriptions-item>
          <a-descriptions-item label="有效期">{{ row.validUntil }}</a-descriptions-item>
          <a-descriptions-item label="检定周期">{{ row.verificationCycle }}</a-descriptions-item>
          <a-descriptions-item label="使用部门">{{ row.deptName }}</a-descriptions-item>
          <a-descriptions-item label="设备状态">{{ row.deviceStatusName }}</a-descriptions-item>
          <a-descriptions-item label="管理类别">{{ row.manageCategory }}</a-descriptions-item>
          <a-descriptions-item label="检定方法">{{ row.verificationMethodName }}</a-descriptions-item>
          <a-descriptions-item label="学科分类">{{ row.subjectCategory }}</a-descriptions-item>
        </a-descriptions>
      </section>

      <section class="detail-section">
        <div class="detail-section-title">
          <h3>检定 / 确认 / 异常信息</h3>
        </div>
        <a-descriptions bordered size="small" :column="{ xs: 1, sm: 2, lg: 4 }">
          <a-descriptions-item label="当前节点">{{ row.currentNodeName }}</a-descriptions-item>
          <a-descriptions-item label="当前状态">{{ row.taskStatusName }}</a-descriptions-item>
          <a-descriptions-item label="计量管理员">{{ row.measureManagerName }}</a-descriptions-item>
          <a-descriptions-item label="计量检定员">{{ row.assignedVerifierName }}</a-descriptions-item>
          <a-descriptions-item label="是否通用">{{ row.isCommonName }}</a-descriptions-item>
          <a-descriptions-item label="检定结果">{{ row.result }}</a-descriptions-item>
          <a-descriptions-item label="检定时间">{{ row.verificationTime }}</a-descriptions-item>
          <a-descriptions-item label="新有效期">{{ row.newValidUntil }}</a-descriptions-item>
          <a-descriptions-item label="责任工程师">{{ row.responsibleEngineerName }}</a-descriptions-item>
          <a-descriptions-item label="关联状态变更单">{{ displayValue(task.relatedChangeOrderId) }}</a-descriptions-item>
          <a-descriptions-item label="要求完成时间">{{ row.requiredFinishTime }}</a-descriptions-item>
          <a-descriptions-item label="检定附件">
            <AttachmentListButton
              :group-id="attachmentTask?.certificateAttachmentGroupId || attachmentTask?.recordAttachmentGroupId || attachmentTask?.attachmentGroupId"
              button-text="查看文件"
              title="周检附件"
              size="small"
            />
          </a-descriptions-item>
          <a-descriptions-item label="备注">{{ row.remark }}</a-descriptions-item>
        </a-descriptions>
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.periodic-detail {
  max-height: 78vh;
  overflow: auto;
  padding-right: 4px;
}

.detail-section {
  margin-bottom: 14px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.detail-section-title {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid #e5eaf1;
  background: #fbfcfe;
}

.detail-section-title h3 {
  margin: 0;
  color: #172033;
  font-size: 15px;
  font-weight: 700;
}

.detail-section :deep(.ant-descriptions) {
  padding: 14px;
}

.detail-section :deep(.ant-descriptions-item-label) {
  width: 120px;
  color: #667085;
  font-weight: 600;
}

.detail-section :deep(.ant-descriptions-item-content) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.periodic-tag {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  font-size: 12px;
}

.periodic-tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.periodic-tag.green {
  border-color: #b7e4c7;
  background: #ecfdf3;
  color: #027a48;
}

.periodic-tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.periodic-tag.red {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

.periodic-tag.cyan {
  border-color: #a5f3fc;
  background: #ecfeff;
  color: #0e7490;
}
</style>
