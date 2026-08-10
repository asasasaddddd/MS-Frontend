<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import {
  approveChange,
  cancelRevisionChange,
  getChangeOrderDetail,
  rejectChange,
  reviseChange
} from '@/api/change'
import { listWorkflowTasks } from '@/api/workflow'
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import { useRoleTodoSummary } from '@/composables/useRoleTodoSummary'
import { useSessionStore } from '@/stores/session'
import type { ChangeOrderVO, ChangeSubmitRequest, ChangeType } from '@/types/change'
import type { DeviceVO } from '@/types/device'
import type { WorkflowTask } from '@/types/workflow'
import {
  CHANGE_APPROVE_ACTION,
  CHANGE_REVISE_ACTION,
  changeNodeName,
  changeStatusName,
  changeTagColor,
  changeTypeName,
  display,
  formatDateTime,
  hasChangeAction,
  statusTagColor,
  type ChangeTaskRow
} from '@/views/change/changeDisplayModel'
import { isPendingWorkflowTask, matchesBusinessType } from '@/workflows/metrologyWorkflow'
import ChangeApprovalDialog from '@/views/change/components/ChangeApprovalDialog.vue'
import ChangeApplyDialog from '@/views/change/components/ChangeApplyDialog.vue'

const route = useRoute()
const session = useSessionStore()
const loading = ref(false)
const submitting = ref(false)
const rows = ref<ChangeTaskRow[]>([])
const activeOrders = ref<ChangeOrderVO[]>([])
const dialogOpen = ref(false)
const reviseOpen = ref(false)
const revisionOrder = ref<ChangeOrderVO | null>(null)
const revisionDevices = ref<DeviceVO[]>([])
const revisionType = computed(() => revisionOrder.value?.changeType as ChangeType | undefined)
const routeOrderId = computed(() => {
  const value = route.query.orderId
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value ? String(value) : ''
})
const workflowIdentity = computed(() => {
  const user = session.user
  return user ? `${user.employeeId}|${user.roleCode}` : ''
})
const summaryScope = computed(() => routeOrderId.value
  ? { businessType: 'CHANGE', scopeType: 'order' as const, scopeId: routeOrderId.value }
  : { businessType: 'CHANGE' })
const {
  summary: changeFlowSummary,
  loading: summaryLoading,
  error: summaryError,
  refresh: refreshSummary
} = useRoleTodoSummary({
  identityKey: workflowIdentity,
  query: summaryScope,
  immediate: false
})

const columns = [
  { title: '申请编号', key: 'orderNo', width: 180 },
  { title: '申请时间', key: 'applyTime', width: 160 },
  { title: '设备数量', key: 'itemCount', width: 100 },
  { title: '变更类型', key: 'changeType', width: 130 },
  { title: '当前节点', key: 'nodeName', width: 170 },
  { title: '当前状态', key: 'status', width: 120 },
  { title: '扫码状态', key: 'scanStatus', width: 120 },
  { title: '接收签字', key: 'receiveSignature', width: 190 },
  { title: '操作', key: 'action', fixed: 'right', width: 90 }
]

function isTransferOrder(order: ChangeOrderVO) {
  return order.changeType === 'transfer'
}

function transferReceiptReady(order: ChangeOrderVO) {
  if (!isTransferOrder(order)) return true
  const items = order.items || []
  return items.length > 0 && items.every((item) =>
    item.physicalStatus === 'transfer_received'
    && Boolean(item.lastScanRecordId)
    && item.lastScanScene === 'change_transfer_receive'
    && Boolean(item.lastScanUserId)
  )
}

function transferScanStatus(order: ChangeOrderVO) {
  if (!isTransferOrder(order)) return '-'
  const items = order.items || []
  const received = items.filter((item) => item.physicalStatus === 'transfer_received' && item.lastScanRecordId).length
  if (items.length > 0 && received === items.length) return '已扫码'
  return received > 0 ? `部分扫码 ${received}/${items.length}` : '待扫码'
}

function transferReceiptSignature(order: ChangeOrderVO) {
  if (!isTransferOrder(order)) return '-'
  const signatures = (order.items || [])
    .filter((item) => item.lastScanUserId)
    .map((item) => `${item.lastScanUserId} / ${formatDateTime(item.lastScanTime)}`)
  return signatures.length > 0 ? Array.from(new Set(signatures)).join('；') : '待接收人扫码签字'
}

function toRow(task: WorkflowTask, order: ChangeOrderVO): ChangeTaskRow {
  const actionableOrder: ChangeOrderVO = {
    ...order,
    taskId: task.taskId,
    rowVersion: task.rowVersion,
    allowedActions: [...task.allowedActions]
  }
  return {
    key: String(task.businessId),
    taskId: task.taskId,
    rowVersion: task.rowVersion,
    allowedActions: [...task.allowedActions],
    nodeCode: task.nodeCode,
    nodeName: task.nodeName,
    order: actionableOrder
  }
}

function rowKey(row: ChangeTaskRow) {
  return row.key
}

function openOrder(row: ChangeTaskRow) {
  if (row.nodeCode === 'manager_revise') {
    if (!hasChangeAction(row, CHANGE_REVISE_ACTION)) {
      message.warning('当前退回任务已无法修订，请刷新后重试')
      return
    }
    revisionOrder.value = row.order
    revisionDevices.value = (row.order.items || []).map((item) => ({
      id: item.deviceId ?? item.id,
      deviceCode: item.deviceCode,
      deviceName: item.deviceName,
      modelSpec: item.modelSpec,
      factoryCode: item.factoryCode,
      deptId: item.deptId,
      deptName: item.deptName,
      manageCategory: item.oldCategory,
      verificationMethod: item.oldVerificationMethod,
      verificationCycleMonth: item.oldCycleMonth,
      validUntil: item.oldValidUntil,
      confirmInterval: item.confirmInterval,
      responsibleEngineerId: item.responsibleEngineerId,
      responsibleEngineerName: item.responsibleEngineerName
    }))
    reviseOpen.value = true
    return
  }
  if (!transferReceiptReady(row.order)) {
    message.warning('设备转移实物尚未全部扫码接收，不能确认完成')
    return
  }
  if (!hasChangeAction(row, CHANGE_APPROVE_ACTION)) {
    message.warning('当前任务已无审批权限，请刷新后重试')
    return
  }
  activeOrders.value = [row.order]
  dialogOpen.value = true
}

async function handleRevise(payload: ChangeSubmitRequest & { opinion?: string }) {
  const order = revisionOrder.value
  if (!order) return
  submitting.value = true
  try {
    if (order.taskId === undefined || order.rowVersion === undefined) {
      throw new Error('状态变更修订任务身份不完整，请刷新后重试')
    }
    const originalDeviceIds = new Set((order.items || []).map((item) => String(item.deviceId)))
    const revisedDeviceIds = new Set(payload.items.map((item) => String(item.deviceId)))
    if (
      originalDeviceIds.size !== revisedDeviceIds.size ||
      [...originalDeviceIds].some((deviceId) => !revisedDeviceIds.has(deviceId))
    ) {
      throw new Error('修订设备范围已变化，请刷新后重试')
    }
    await reviseChange({
      orderId: order.id,
      taskId: order.taskId,
      rowVersion: order.rowVersion,
      reason: payload.reason,
      remark: payload.remark,
      attachmentGroupId: payload.attachmentGroupId,
      opinion: payload.opinion || '已按退回意见修订并重新提交',
      items: payload.items
    })
    message.success('状态变更修订已重新提交')
    reviseOpen.value = false
    revisionOrder.value = null
    revisionDevices.value = []
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '状态变更修订提交失败')
  } finally {
    submitting.value = false
  }
}

async function handleCancelRevision() {
  const order = revisionOrder.value
  if (!order) return
  submitting.value = true
  try {
    if (order.taskId === undefined || order.rowVersion === undefined) {
      throw new Error('状态变更修订任务身份不完整，请刷新后重试')
    }
    await cancelRevisionChange({
      orderId: order.id,
      taskId: order.taskId,
      rowVersion: order.rowVersion,
      reason: '管理员确认不再修订并终止申请'
    })
    message.success('状态变更申请已终止')
    reviseOpen.value = false
    revisionOrder.value = null
    revisionDevices.value = []
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '状态变更申请终止失败')
  } finally {
    submitting.value = false
  }
}

async function loadRows() {
  loading.value = true
  const summaryPromise = refreshSummary().catch(() => undefined)
  const [taskResult] = await Promise.allSettled([listWorkflowTasks('CHANGE')])

  if (taskResult.status === 'fulfilled') {
    const tasks = taskResult.value.filter(
      (task) => isPendingWorkflowTask(task) && matchesBusinessType(task.businessType, 'change')
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
  } else {
    rows.value = []
    message.error(taskResult.reason instanceof Error ? taskResult.reason.message : '接收管理员待办加载失败')
  }
  loading.value = false
  await summaryPromise
}

async function handleApprove(opinion: string) {
  const order = activeOrders.value[0]
  if (!order) return
  submitting.value = true
  try {
    if (order.taskId === undefined || order.rowVersion === undefined) {
      throw new Error('状态变更任务身份不完整，请刷新后重试')
    }
    await approveChange({
      orderId: order.id,
      taskId: order.taskId,
      rowVersion: order.rowVersion,
      opinion
    })
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
    if (order.taskId === undefined || order.rowVersion === undefined) {
      throw new Error('状态变更任务身份不完整，请刷新后重试')
    }
    await rejectChange({
      orderId: order.id,
      taskId: order.taskId,
      rowVersion: order.rowVersion,
      reason
    })
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
  <section class="receive-workspace">
    <FlowStatusSummary
      :summary="changeFlowSummary"
      :loading="summaryLoading"
      :error="summaryError"
      title="状态变更流程汇总（当前待办）"
    />

    <section class="receive-panel">
      <div class="panel-header">
        <h2>接收部门管理员待办</h2>
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
          <template v-else-if="column.key === 'scanStatus'">{{ transferScanStatus(record.order) }}</template>
          <template v-else-if="column.key === 'receiveSignature'">{{ transferReceiptSignature(record.order) }}</template>
          <template v-else-if="column.key === 'action'">
            <a-button
              v-if="hasChangeAction(record, CHANGE_APPROVE_ACTION) || hasChangeAction(record, CHANGE_REVISE_ACTION)"
              type="link"
              class="button-link"
              :disabled="!transferReceiptReady(record.order)"
              @click="openOrder(record)"
            >处理</a-button>
            <span v-else>-</span>
          </template>
        </template>
        <template #emptyText>
          <a-empty description="暂无接收部门管理员待办" />
        </template>
      </a-table>
    </section>

    <ChangeApprovalDialog
      v-model:open="dialogOpen"
      :orders="activeOrders"
      :submitting="submitting"
      @approve="handleApprove"
      @reject="handleReject"
    />
    <ChangeApplyDialog
      v-model:open="reviseOpen"
      :type="revisionType"
      :devices="revisionDevices"
      :order="revisionOrder"
      :submitting="submitting"
      @submit="handleRevise"
      @terminate="handleCancelRevision"
    />
  </section>
</template>

<style scoped>
.receive-workspace {
  display: grid;
  gap: 16px;
}

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
