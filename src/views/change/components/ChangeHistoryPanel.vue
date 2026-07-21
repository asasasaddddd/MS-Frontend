<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getChangeOrderDetail } from '@/api/change'
import { getWorkflowProcessByBusiness, listWorkflowHistory } from '@/api/workflow'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import type { ChangeOrderVO } from '@/types/change'
import type { WorkflowProcess, WorkflowTask } from '@/types/workflow'
import { changeTypeName, display, formatDateTime } from '@/views/change/changeDisplayModel'
import { changeNodeCodesByRole, matchesBusinessType } from '@/workflows/metrologyWorkflow'

interface HistoryRow {
  key: string
  task: WorkflowTask
  order: ChangeOrderVO
  process?: WorkflowProcess | null
}

const props = defineProps<{
  roleCode: string
  orderId?: string
}>()

const loading = ref(false)
const rows = ref<HistoryRow[]>([])
const detailOpen = ref(false)
const activeRow = ref<HistoryRow>()

const columns = [
  { title: '变更单号', key: 'orderNo', width: 170 },
  { title: '变更类型', key: 'changeType', width: 130 },
  { title: '设备数量', key: 'itemCount', width: 100 },
  { title: '使用部门', key: 'deptName', width: 160 },
  { title: '本人已办节点', key: 'nodeName', width: 180 },
  { title: '处理结果', key: 'action', width: 110 },
  { title: '完成时间', key: 'completedAt', width: 180 },
  { title: '当前流转节点', key: 'currentNodeName', width: 180 },
  { title: '操作', key: 'operation', fixed: 'right', width: 90 }
]

function actionName(action?: string) {
  const names: Record<string, string> = {
    approve: '同意',
    reject: '驳回',
    return: '退回',
    complete: '完成'
  }
  return action ? names[action.toLowerCase()] || '已处理' : '已处理'
}

function openDetail(row: HistoryRow) {
  activeRow.value = row
  detailOpen.value = true
}

async function loadRows() {
  loading.value = true
  try {
    const tasks = (await listWorkflowHistory())
      .filter((task) => matchesBusinessType(task.businessType, 'change'))
      .filter((task) => changeNodeCodesByRole[props.roleCode as keyof typeof changeNodeCodesByRole]?.includes(task.nodeCode))
      .filter((task) => !props.orderId || String(task.businessId) === props.orderId)
    const taskByOrder = new Map<string, WorkflowTask>()
    tasks.forEach((task) => {
      const orderId = String(task.businessId)
      if (!taskByOrder.has(orderId)) taskByOrder.set(orderId, task)
    })

    const details = await Promise.allSettled(
      Array.from(taskByOrder.values()).map(async (task) => {
        const [order, process] = await Promise.all([
          getChangeOrderDetail(task.businessId),
          getWorkflowProcessByBusiness('change', task.businessId)
        ])
        return { task, order, process }
      })
    )
    rows.value = details
      .filter((item): item is PromiseFulfilledResult<{ task: WorkflowTask; order: ChangeOrderVO; process: WorkflowProcess | null }> => item.status === 'fulfilled')
      .map((item) => ({
        key: String(item.value.task.businessId),
        task: item.value.task,
        order: item.value.order,
        process: item.value.process
      }))
  } catch (error) {
    rows.value = []
    message.error(error instanceof Error ? error.message : '状态变更已办加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadRows)
</script>

<template>
  <a-card class="history-panel" :bordered="false">
    <template #title><h2>状态变更已办记录</h2></template>
    <a-table :columns="columns" :data-source="rows" :loading="loading" :pagination="{ pageSize: 10, showSizeChanger: false }" :scroll="{ x: 1250 }" row-key="key" size="middle">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'orderNo'">{{ display(record.order.orderNo) }}</template>
        <template v-else-if="column.key === 'changeType'"><a-tag color="blue">{{ changeTypeName(record.order.changeType) }}</a-tag></template>
        <template v-else-if="column.key === 'itemCount'">{{ display(record.order.itemCount || record.order.items?.length) }}</template>
        <template v-else-if="column.key === 'deptName'">{{ display(record.order.applyDeptName) }}</template>
        <template v-else-if="column.key === 'nodeName'">{{ display(record.task.nodeName) }}</template>
        <template v-else-if="column.key === 'action'"><a-tag color="green">{{ actionName(record.task.action) }}</a-tag></template>
        <template v-else-if="column.key === 'completedAt'">{{ formatDateTime(record.task.completedAt) }}</template>
        <template v-else-if="column.key === 'currentNodeName'"><a-tag color="blue">{{ display(record.process?.currentNodeName || record.order.workflowStatus || record.order.statusName) }}</a-tag></template>
        <template v-else-if="column.key === 'operation'"><a-button type="link" @click="openDetail(record)">查看</a-button></template>
      </template>
    </a-table>
  </a-card>

  <a-modal v-model:open="detailOpen" title="状态变更已办详情" width="960px" :footer="null">
    <div v-if="activeRow" class="history-detail-grid">
      <div><span>变更单号</span><strong>{{ display(activeRow.order.orderNo) }}</strong></div>
      <div><span>当前流转节点</span><strong>{{ display(activeRow.process?.currentNodeName || activeRow.order.workflowStatus || activeRow.order.statusName) }}</strong></div>
      <div><span>本人已办节点</span><strong>{{ display(activeRow.task.nodeName) }}</strong></div>
      <div><span>本人处理结果</span><strong>{{ actionName(activeRow.task.action) }}</strong></div>
      <div class="full"><span>本人处理意见</span><strong>{{ display(activeRow.task.opinion) }}</strong></div>
      <div><span>变更类型</span><strong>{{ changeTypeName(activeRow.order.changeType) }}</strong></div>
      <div><span>申请部门</span><strong>{{ display(activeRow.order.applyDeptName) }}</strong></div>
      <div><span>申请原因</span><strong>{{ display(activeRow.order.reason) }}</strong></div>
      <div><span>涉及设备</span><strong>{{ display(activeRow.order.itemCount || activeRow.order.items?.length) }}</strong></div>
      <div>
        <span>申请附件</span>
        <AttachmentListButton :group-id="activeRow.order.attachmentGroupId" title="状态变更申请附件" size="small" />
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.history-panel { overflow: hidden; border: 1px solid #e5eaf1; border-radius: 8px; }
.history-panel :deep(.ant-card-body) { padding: 0; }
.history-panel h2 { margin: 0; font-size: 16px; }
.history-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid #e5eaf1; border-left: 1px solid #e5eaf1; }
.history-detail-grid > div { min-height: 72px; padding: 14px 12px; border-right: 1px solid #e5eaf1; border-bottom: 1px solid #e5eaf1; }
.history-detail-grid .full { grid-column: 1 / -1; }
.history-detail-grid span { display: block; margin-bottom: 8px; color: #667085; font-size: 12px; }
.history-detail-grid strong { color: #172033; font-size: 15px; }
@media (max-width: 760px) { .history-detail-grid { grid-template-columns: 1fr; } .history-detail-grid .full { grid-column: auto; } }
</style>
