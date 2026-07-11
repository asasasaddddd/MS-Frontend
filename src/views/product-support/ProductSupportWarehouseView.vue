<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, PrinterOutlined, SaveOutlined } from '@ant-design/icons-vue'
import { createProductSupportOrder } from '@/api/productSupport'
import { listUsersByDeptAndRole, type SysUserVO } from '@/api/system'
import { useSessionStore } from '@/stores/session'
import type { ProductSupportItemRequest, ProductSupportRatioRequest } from '@/types/productSupport'
import { defaultItemRows, defaultRatioRows } from './productSupportDisplayModel'

type EditableRatio = ProductSupportRatioRequest & { lineNo: number }
type EditableItem = ProductSupportItemRequest & { lineNo: number }

const session = useSessionStore()
const submitting = ref(false)
const verifierLoading = ref(false)
const verifiers = ref<SysUserVO[]>([])
const ratios = ref<EditableRatio[]>(defaultRatioRows().map((row, index) => ({ ...row, lineNo: index + 1 })))
const items = ref<EditableItem[]>(defaultItemRows().map((row, index) => ({ ...row, lineNo: index + 1 })))

const form = reactive({
  contractNo: 'HT-2026-00458',
  projectNo: 'XM-2026-00123',
  projectType: '出口',
  inspectionDate: new Date().toISOString().slice(0, 10),
  supplierName: '重工机械制造有限公司',
  applyDeptId: session.user?.deptId || '',
  applyDeptName: session.user?.deptName || '质量管理部',
  verifierId: '',
  verifierName: '',
  remark: ''
})

const ratioColumns = [
  { title: '序号', key: 'lineNo', width: 64 },
  { title: '名称', key: 'name', width: 180 },
  { title: '合同数量', key: 'contractQuantity', width: 120 },
  { title: '抽检数量', key: 'sampleQuantity', width: 120 },
  { title: '备注', key: 'remark' },
  { title: '', key: 'action', width: 72 }
]

const itemColumns = [
  { title: '序号', key: 'lineNo', width: 64 },
  { title: '名称', key: 'name', width: 180 },
  { title: '物料编码', key: 'materialCode', width: 180 },
  { title: '规格型号', key: 'modelSpec', width: 180 },
  { title: '数量', key: 'quantity', width: 110 },
  { title: '', key: 'action', width: 72 }
]

const verifierOptions = computed(() =>
  verifiers.value.map((user) => ({
    label: `${user.employeeName || user.employeeId}（${user.employeeId}）`,
    value: user.employeeId
  }))
)

function renumber<T extends { lineNo: number }>(rows: T[]) {
  rows.forEach((row, index) => {
    row.lineNo = index + 1
  })
}

function addRatioRow() {
  ratios.value = [...ratios.value, { lineNo: ratios.value.length + 1, name: '', contractQuantity: 0, sampleQuantity: 0, remark: '' }]
}

function removeRatioRow(lineNo: number) {
  if (ratios.value.length <= 1) {
    message.warning('至少保留一行抽检比例')
    return
  }
  ratios.value = ratios.value.filter((row) => row.lineNo !== lineNo)
  renumber(ratios.value)
}

function addItemRow() {
  items.value = [...items.value, { lineNo: items.value.length + 1, name: '', materialCode: '', modelSpec: '', quantity: 0 }]
}

function removeItemRow(lineNo: number) {
  if (items.value.length <= 1) {
    message.warning('至少保留一行送检明细')
    return
  }
  items.value = items.value.filter((row) => row.lineNo !== lineNo)
  renumber(items.value)
}

function chooseVerifier(employeeId?: string) {
  const user = verifiers.value.find((item) => item.employeeId === employeeId)
  form.verifierId = employeeId || ''
  form.verifierName = user?.employeeName || ''
}

function validateRows() {
  if (!form.contractNo.trim()) return '请填写合同号'
  if (!form.projectNo.trim()) return '请填写项目号'
  if (!form.projectType.trim()) return '请选择项目类型'
  if (!form.inspectionDate) return '请选择送检时间'
  if (!form.supplierName.trim()) return '请填写供方'
  if (!form.applyDeptName.trim()) return '请填写申请部门'
  if (ratios.value.some((row) => !row.name.trim() || Number(row.contractQuantity) <= 0 || Number(row.sampleQuantity) <= 0)) {
    return '请完整填写抽检比例的名称、合同数量、抽检数量'
  }
  if (items.value.some((row) => !row.name.trim() || !row.materialCode.trim() || Number(row.quantity) <= 0)) {
    return '请完整填写送检明细的名称、物料编码、数量'
  }
  return ''
}

function resetForm() {
  form.contractNo = ''
  form.projectNo = ''
  form.projectType = ''
  form.inspectionDate = new Date().toISOString().slice(0, 10)
  form.supplierName = ''
  form.applyDeptId = session.user?.deptId || ''
  form.applyDeptName = session.user?.deptName || ''
  form.verifierId = ''
  form.verifierName = ''
  form.remark = ''
  ratios.value = [{ lineNo: 1, name: '', contractQuantity: 0, sampleQuantity: 0, remark: '' }]
  items.value = [{ lineNo: 1, name: '', materialCode: '', modelSpec: '', quantity: 0 }]
}

function printPage() {
  window.print()
}

function ratioRowKey(row: EditableRatio) {
  return row.lineNo
}

function itemRowKey(row: EditableItem) {
  return row.lineNo
}

async function submitOrder() {
  const error = validateRows()
  if (error) {
    message.warning(error)
    return
  }
  submitting.value = true
  try {
    const orderId = await createProductSupportOrder({
      contractNo: form.contractNo.trim(),
      projectNo: form.projectNo.trim(),
      projectType: form.projectType.trim(),
      inspectionDate: form.inspectionDate,
      supplierName: form.supplierName.trim(),
      applyDeptId: form.applyDeptId || session.user?.deptId,
      applyDeptName: form.applyDeptName.trim(),
      verifierId: form.verifierId || undefined,
      verifierName: form.verifierName || undefined,
      ratios: ratios.value.map((row) => ({
        name: row.name.trim(),
        contractQuantity: Number(row.contractQuantity),
        sampleQuantity: Number(row.sampleQuantity),
        remark: row.remark
      })),
      items: items.value.map((row) => ({
        name: row.name.trim(),
        materialCode: row.materialCode.trim(),
        modelSpec: row.modelSpec,
        quantity: Number(row.quantity)
      })),
      remark: form.remark
    })
    message.success(`产品配套送检清单已提交：${orderId}`)
    resetForm()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '产品配套送检清单提交失败')
  } finally {
    submitting.value = false
  }
}

async function loadVerifiers() {
  verifierLoading.value = true
  try {
    const deptId = session.user?.deptId || form.applyDeptId
    const [selfResult, externalResult] = await Promise.allSettled([
      deptId ? listUsersByDeptAndRole(deptId, 'VERIFIER_SELF') : Promise.resolve([]),
      deptId ? listUsersByDeptAndRole(deptId, 'VERIFIER_EXTERNAL') : Promise.resolve([])
    ])
    const users = [
      ...(selfResult.status === 'fulfilled' ? selfResult.value : []),
      ...(externalResult.status === 'fulfilled' ? externalResult.value : [])
    ]
    const dedup = new Map(users.map((user) => [user.employeeId, user]))
    verifiers.value = Array.from(dedup.values())
  } catch {
    verifiers.value = []
  } finally {
    verifierLoading.value = false
  }
}

onMounted(loadVerifiers)
</script>

<template>
  <section class="product-support-page">
    <a-card class="panel" :bordered="false">
      <template #title><h2>产品基本信息</h2></template>
      <a-form layout="vertical" class="info-grid">
        <a-form-item label="合同号" required><a-input v-model:value="form.contractNo" /></a-form-item>
        <a-form-item label="项目号" required><a-input v-model:value="form.projectNo" /></a-form-item>
        <a-form-item label="项目类型" required>
          <a-select
            v-model:value="form.projectType"
            :options="[
              { label: '核电', value: '核电' },
              { label: '出口', value: '出口' },
              { label: '常规', value: '常规' }
            ]"
          />
        </a-form-item>
        <a-form-item label="送检时间" required><a-input v-model:value="form.inspectionDate" type="date" /></a-form-item>
        <a-form-item label="供方" required><a-input v-model:value="form.supplierName" /></a-form-item>
        <a-form-item label="申请部门" required><a-input v-model:value="form.applyDeptName" /></a-form-item>
        <a-form-item label="指定检定员">
          <a-select
            :value="form.verifierId"
            :loading="verifierLoading"
            :options="verifierOptions"
            allow-clear
            placeholder="不选则全部检定员可见"
            @change="chooseVerifier"
          />
        </a-form-item>
        <a-form-item label="备注"><a-input v-model:value="form.remark" /></a-form-item>
      </a-form>
    </a-card>

    <a-card class="panel" :bordered="false">
      <template #title>
        <div class="panel-title">
          <h2>抽检比例</h2>
          <a-button type="primary" ghost @click="addRatioRow"><PlusOutlined />新增</a-button>
        </div>
      </template>
      <a-table :columns="ratioColumns" :data-source="ratios" :pagination="false" :row-key="ratioRowKey" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'lineNo'">{{ record.lineNo }}</template>
          <template v-else-if="column.key === 'name'"><a-input v-model:value="record.name" placeholder="请输入类别名称" /></template>
          <template v-else-if="column.key === 'contractQuantity'"><a-input-number v-model:value="record.contractQuantity" :min="0" /></template>
          <template v-else-if="column.key === 'sampleQuantity'"><a-input-number v-model:value="record.sampleQuantity" :min="0" /></template>
          <template v-else-if="column.key === 'remark'"><a-input v-model:value="record.remark" /></template>
          <template v-else-if="column.key === 'action'"><a-button danger size="small" @click="removeRatioRow(record.lineNo)">删除</a-button></template>
        </template>
      </a-table>
    </a-card>

    <a-card class="panel" :bordered="false">
      <template #title>
        <div class="panel-title">
          <h2>送检明细</h2>
          <div class="panel-actions">
            <a-button>导入</a-button>
            <a-button>导出</a-button>
            <a-button type="primary" ghost @click="addItemRow"><PlusOutlined />新增</a-button>
          </div>
        </div>
      </template>
      <a-table
        :columns="itemColumns"
        :data-source="items"
        :pagination="false"
        :row-key="itemRowKey"
        :scroll="{ x: 900 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'lineNo'">{{ record.lineNo }}</template>
          <template v-else-if="column.key === 'name'"><a-input v-model:value="record.name" placeholder="请输入名称" /></template>
          <template v-else-if="column.key === 'materialCode'"><a-input v-model:value="record.materialCode" placeholder="请输入物料编码" /></template>
          <template v-else-if="column.key === 'modelSpec'"><a-input v-model:value="record.modelSpec" placeholder="请输入规格型号" /></template>
          <template v-else-if="column.key === 'quantity'"><a-input-number v-model:value="record.quantity" :min="0" /></template>
          <template v-else-if="column.key === 'action'"><a-button danger size="small" @click="removeItemRow(record.lineNo)">删除</a-button></template>
        </template>
      </a-table>
      <div class="table-footer">共 <strong>{{ items.length }}</strong> 项</div>
    </a-card>

    <div class="form-actions">
      <a-button @click="resetForm">取消</a-button>
      <a-button @click="printPage"><PrinterOutlined />打印</a-button>
      <a-button type="primary" :loading="submitting" @click="submitOrder"><SaveOutlined />提交</a-button>
    </div>
  </section>
</template>

<style scoped>
.product-support-page {
  display: grid;
  gap: 16px;
}

.panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel :deep(.ant-card-head) {
  min-height: 52px;
  padding: 0 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel :deep(.ant-card-body) {
  padding: 0;
}

.panel h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
}

.panel-title,
.panel-actions,
.form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  width: 100%;
  justify-content: space-between;
}

.table-footer {
  padding: 10px 14px 14px;
  color: #667085;
  font-size: 12px;
}

.table-footer strong {
  color: #175cd3;
}

.form-actions {
  justify-content: flex-end;
}

:deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

@media (max-width: 980px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .panel-title,
  .form-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
