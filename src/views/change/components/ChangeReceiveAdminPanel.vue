<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import { approveChange, getChangeOrderDetail, rejectChange } from '@/api/change'
import { listWorkflowTasks } from '@/api/workflow'
import type { ChangeOrderVO } from '@/types/change'
import type { WorkflowTask } from '@/types/workflow'
import {
  changeNodeName,
  changeStatusName,
  changeTagColor,
  changeTypeName,
  display,
  formatDateTime,
  statusTagColor,
  type ChangeTaskRow
} from '@/views/change/changeDisplayModel'
import { changeNodeCodesByRole, isPendingWorkflowTask, matchesBusinessType } from '@/workflows/metrologyWorkflow'
import ChangeApprovalDialog from '@/views/change/components/ChangeApprovalDialog.vue'

const route = useRoute()
const loading = ref(false)
const submitting = ref(false)
const rows = ref<ChangeTaskRow[]>([])
const activeOrders = ref<ChangeOrderVO[]>([])
const dialogOpen = ref(false)

const columns = [
  { title: '申请编号', key: 'orderNo', width: 180 },
  { title: '申请时间', key: 'applyTime', width: 160 },
  { title: '设备数量', key: 'itemCount', width: 100 },
  { title: '变更类型', key: 'changeType', width: 130 },
  { title: '当前节点', key: 'nodeName', width: 170 },
  { title: '当前状态', key: 'status', width: 120 },
  { title: '操作', key: 'action', fixed: 'right', width: 90 }
]

const pendingCount = computed(() => rows.value.length)

function toRow(task: WorkflowTask, order: ChangeOrderVO): ChangeTaskRow {
  return {
    key: String(task.businessId),
    taskId: task.id,
    nodeCode: task.nodeCode,
    nodeName: task.nodeName,
    order
  }
}

function rowKey(row: ChangeTaskRow) {
  return row.key
}

function openOrder(row: ChangeTaskRow) {
  activeOrders.value = [row.order]
  dialogOpen.value = true
}

async function loadRows() {
  loading.value = true
  try {
    const nodeSet = new Set<string>(changeNodeCodesByRole.MEASURE_ADMIN || [])
    const tasks = (await listWorkflowTasks()).filter(
      (task) => isPendingWorkflowTask(task) && matchesBusinessType(task.businessType, 'change') && nodeSet.has(task.nodeCode)
    )
    const details = await Promise.allSettled(
      tasks.map(async (task) => ({
        task,
        order: await getChangeOrderDetail(task.businessId)
      }))
    )
    rows.value = details
      .filter((item): item is PromiseFulfilledResult<{ task: WorkflowTask; order: ChangeOrderVO }> => item.status === 'fulfilled')
      .map((item) => toRow(item.value.task, item.value.order))

    const targetOrderId = route.query.orderId ? String(route.query.orderId) : ''
    const targetRow = targetOrderId ? rows.value.find((row) => String(row.order.id) === targetOrderId) : undefined
    if (targetRow) openOrder(targetRow)
  } catch (error) {
    rows.value = []
    message.error(error instanceof Error ? error.message : '接收管理员待办加载失败')
  } finally {
    loading.value = false
  }
}

async function handleApprove(opinion: string) {
  const order = activeOrders.value[0]
  if (!order) return
  submitting.value = true
  try {
    await approveChange({ orderId: order.id, opinion })
    message.success('接收管理员确认已提交')
    dialogOpen.value = false
    activeOrders.value = []
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '接收管理员确认失败')
  } finally {
    submitting.value = false
  }
}

async function handleReject(reason: string) {
  const order = activeOrders.value[0]
  if (!order) return
  submitting.value = true
  try {
    await rejectChange({ orderId: order.id, reason })
    message.success('接收管理员已退回变更单')
    dialogOpen.value = false
    activeOrders.value = []
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '接收管理员退回失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadRows)
</script>

<template>
  <section class="receive-panel">
    <div class="panel-header">
      <h2>接收部门管理员待办</h2>
      <a-tag color="orange">{{ pendingCount }} 单待确认</a-tag>
    </div>

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="{ pageSize: 8, showSizeChanger: false }"
      :row-key="rowKey"
      :scroll="{ x: 1050 }"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'orderNo'">{{ display(record.order.orderNo) }}</template>
        <template v-else-if="column.key === 'applyTime'">{{ formatDateTime(record.order.applyTime) }}</template>
        <template v-else-if="column.key === 'itemCount'">{{ display(record.order.itemCount || record.order.items?.length) }}</template>
        <template v-else-if="column.key === 'changeType'">
          <a-tag :class="['tag', changeTagColor(record.order.changeType)]">{{ changeTypeName(record.order.changeType) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'nodeName'">{{ record.nodeName || changeNodeName(record.nodeCode) }}</template>
        <template v-else-if="column.key === 'status'">
          <a-tag :class="['tag', statusTagColor(record.order.status)]">{{ changeStatusName(record.order.status) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button type="link" class="button-link" @click="openOrder(record)">处理</a-button>
        </template>
      </template>
      <template #emptyText>
        <a-empty description="暂无接收部门管理员待办" />
      </template>
    </a-table>

    <ChangeApprovalDialog
      v-model:open="dialogOpen"
      :orders="activeOrders"
      :submitting="submitting"
      @approve="handleApprove"
      @reject="handleReject"
    />
  </section>
</template>

<style scoped>
.receive-panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel-header {
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel-header h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.button-link {
  padding: 0;
  color: #1769e0;
}

.receive-panel :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

.receive-panel :deep(.ant-table-cell) {
  white-space: nowrap;
}

.tag {
  border-radius: 6px;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.tag.green {
  border-color: #b7e4c7;
  background: #ecfdf3;
  color: #027a48;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.tag.red {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

.tag.cyan {
  border-color: #a5f3fc;
  background: #ecfeff;
  color: #0e7490;
}
</style>
