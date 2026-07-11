<script setup lang="ts">
import type { SamplingPlanVO, SamplingTaskVO } from '@/types/sampling'
import { display, formatDate, samplingCommonName, samplingMethodName, samplingNodeName, samplingResultName } from '../samplingDisplayModel'

defineProps<{
  open: boolean
  task?: SamplingTaskVO | null
  plan?: SamplingPlanVO | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

function close() {
  emit('update:open', false)
}
</script>

<template>
  <a-modal :open="open" width="920px" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div>
        <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / C类抽检 / {{ display(task?.taskNo) }}</div>
        <strong>C类抽检任务详情</strong>
      </div>
    </template>

    <div class="dialog-body">
      <section class="panel">
        <div class="panel-header">
          <h2>计划基本信息</h2>
          <a-tag class="tag blue">{{ display(plan?.planNo || task?.planNo) }}</a-tag>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>计划编号</span><a-input :value="display(plan?.planNo || task?.planNo)" readonly /></label>
          <label><span>计划名称</span><a-input :value="display(plan?.planName || task?.planName)" readonly /></label>
          <label><span>检定日期</span><a-input :value="formatDate(plan?.verificationDate || task?.verificationDate)" readonly /></label>
          <label><span>使用部门</span><a-input :value="display(plan?.deptName || task?.deptName)" readonly /></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>设备信息</h2>
          <a-tag class="tag orange">{{ samplingNodeName(task?.currentNode) }}</a-tag>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>计量编号</span><a-input :value="display(task?.deviceCode)" readonly /></label>
          <label><span>设备名称</span><a-input :value="display(task?.deviceName)" readonly /></label>
          <label><span>规格型号</span><a-input :value="display(task?.modelSpec)" readonly /></label>
          <label><span>出厂编号</span><a-input :value="display(task?.factoryCode)" readonly /></label>
          <label><span>使用部门</span><a-input :value="display(task?.deptName)" readonly /></label>
          <label><span>类别</span><a-input :value="display(task?.manageCategory)" readonly /></label>
          <label><span>检定方式</span><a-input :value="samplingMethodName(task?.verificationMethod)" readonly /></label>
          <label><span>是否通用设备</span><a-input :value="samplingCommonName(task?.isCommon)" readonly /></label>
          <label><span>检定员</span><a-input :value="display(task?.assignedVerifierName)" readonly /></label>
          <label><span>确认员</span><a-input :value="display(task?.confirmerName)" readonly /></label>
          <label><span>检定结果</span><a-input :value="samplingResultName(task?.result)" readonly /></label>
          <label><span>有效期</span><a-input :value="formatDate(task?.validUntil)" readonly /></label>
          <label class="span-2"><span>不合格原因</span><a-input :value="display(task?.nonconformingReason)" readonly /></label>
          <label><span>处理方式</span><a-input :value="samplingResultName(task?.disposalType)" readonly /></label>
          <label><span>费用</span><a-input :value="display(task?.costAmount)" readonly /></label>
          <label class="span-4"><span>备注</span><a-textarea :value="display(task?.remark)" :rows="3" readonly /></label>
        </div>
      </section>

      <div class="dialog-actions">
        <a-button type="primary" @click="close">关闭</a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.dialog-breadcrumb {
  margin-bottom: 4px;
  color: #667085;
  font-size: 12px;
  font-weight: 400;
}

.dialog-body {
  display: grid;
  gap: 16px;
}

.panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel-header {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
}

.form-grid {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.form-grid.cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.form-grid label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-grid span {
  color: #667085;
  font-size: 12px;
}

.span-2 {
  grid-column: span 2;
}

.span-4 {
  grid-column: span 4;
}

.readonly-area :deep(.ant-input),
.readonly-area :deep(.ant-input[readonly]),
.readonly-area :deep(textarea) {
  color: #344054;
  background: #f9fafb;
}

.tag {
  border-radius: 999px;
  font-weight: 600;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 980px) {
  .form-grid.cols-4 {
    grid-template-columns: 1fr;
  }

  .span-2,
  .span-4 {
    grid-column: span 1;
  }
}
</style>
