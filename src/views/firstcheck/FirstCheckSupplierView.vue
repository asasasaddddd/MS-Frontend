<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { startFirstCheck } from '@/api/firstcheck'
import { getAllowedOrganizationTree } from '@/api/system'
import AttachmentUploadButton from '@/components/AttachmentUploadButton.vue'
import { useSessionStore } from '@/stores/session'
import type { AttachmentId } from '@/types/firstcheck'
import type { AllowedOrganizationNodeVO } from '@/types/nodePermission'

const session = useSessionStore()
const router = useRouter()
const submitting = ref(false)
const orgLoading = ref(false)
const allowedOrganizations = ref<AllowedOrganizationNodeVO[]>([])

const form = reactive({
  purchaseOrderNo: '',
  materialCode: '',
  materialName: '',
  quantity: 1,
  responsibilityOrgId: '',
  supplierName: session.user?.employeeName || '',
  attachmentGroupId: undefined as AttachmentId | undefined,
  applyTime: new Date().toLocaleDateString('zh-CN'),
  remark: ''
})

interface ResponsibilityOrganizationTreeNode {
  value: string
  title: string
  searchText: string
  orgType: 'DEPARTMENT' | 'GROUP'
  children: ResponsibilityOrganizationTreeNode[]
}

function mapAllowedOrganizationNode(node: AllowedOrganizationNodeVO): ResponsibilityOrganizationTreeNode {
  const organizationName = node.orgName || node.orgId
  const organizationPath = node.orgFullPath || organizationName
  const typeName = node.orgType === 'GROUP' ? '组' : '部门'
  return {
    value: node.orgId,
    title: `${organizationPath} · ${typeName}`,
    searchText: [node.orgId, node.orgName, node.orgFullPath, node.orgType]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
    orgType: node.orgType,
    children: (node.children || []).map(mapAllowedOrganizationNode)
  }
}

const responsibilityOrgTreeData = computed(() =>
  allowedOrganizations.value.map(mapAllowedOrganizationNode)
)

function filterResponsibilityOrg(input: string, node: { searchText?: string }) {
  return String(node.searchText || '').includes(input.trim().toLowerCase())
}

async function loadAllowedOrganizations() {
  orgLoading.value = true
  try {
    allowedOrganizations.value = await getAllowedOrganizationTree()
  } catch (error) {
    allowedOrganizations.value = []
    message.error(error instanceof Error ? error.message : '责任部门/组加载失败')
  } finally {
    orgLoading.value = false
  }
}

function resetForm() {
  form.purchaseOrderNo = ''
  form.materialCode = ''
  form.materialName = ''
  form.quantity = 1
  form.responsibilityOrgId = ''
  form.supplierName = session.user?.employeeName || ''
  form.attachmentGroupId = undefined
  form.applyTime = new Date().toLocaleDateString('zh-CN')
  form.remark = ''
}

function searchPurchaseOrder() {
  if (!form.purchaseOrderNo.trim()) {
    message.warning('请先填写采购订单编号')
    return
  }
  message.info('采购订单查询接口未单独暴露，请继续填写物料信息后提交')
}

async function submit() {
  if (!form.purchaseOrderNo.trim()) {
    message.warning('请填写采购订单编号')
    return
  }
  if (!form.materialCode.trim()) {
    message.warning('请填写物料编号')
    return
  }
  if (!form.materialName.trim()) {
    message.warning('请填写物料描述')
    return
  }
  if (!form.quantity || form.quantity < 1) {
    message.warning('数量必须大于 0')
    return
  }
  if (!form.responsibilityOrgId) {
    message.warning('请选择责任部门/组')
    return
  }
  if (!form.supplierName.trim()) {
    message.warning('请填写供应商名称')
    return
  }
  submitting.value = true
  try {
    const orderId = await startFirstCheck({
      purchaseOrderNo: form.purchaseOrderNo.trim(),
      supplierName: form.supplierName.trim(),
      attachmentGroupId: form.attachmentGroupId,
      responsibilityOrgId: form.responsibilityOrgId,
      material: {
        materialCode: form.materialCode.trim(),
        materialName: form.materialName.trim(),
        deviceName: form.materialName.trim(),
        quantity: Number(form.quantity),
        remark: form.remark.trim() || undefined
      },
      remark: form.remark.trim() || undefined
    })
    message.success(`首检申请已提交，单据ID：${orderId}，请打印临时首检标签`)
    resetForm()
    await router.push({ path: '/label/print', query: { mode: 'pending' } })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '首检申请提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadAllowedOrganizations)
</script>

<template>
  <section class="firstcheck-supplier-page form-page">
    <a-card class="panel" :bordered="false">
      <template #title>
        <div class="panel-title">
          <h2>基本信息</h2>
          <a-tag class="tag blue">编号 自动生成</a-tag>
        </div>
      </template>

      <div class="form-grid cols-4">
        <label class="field">
          <span>采购订单编号</span>
          <a-input-group compact>
            <a-input v-model:value="form.purchaseOrderNo" class="po-input" placeholder="填写采购订单编号" />
            <a-button @click="searchPurchaseOrder">搜索</a-button>
          </a-input-group>
        </label>
        <label class="field"><span>物料编号</span><a-input v-model:value="form.materialCode" placeholder="填写物料编号" /></label>
        <label class="field"><span>物料描述</span><a-input v-model:value="form.materialName" placeholder="填写物料描述" /></label>
        <label class="field">
          <span>数量</span>
          <a-input-number v-model:value="form.quantity" class="full-input" :min="1" placeholder="填写数量" />
        </label>
        <label class="field">
          <span>责任部门/组</span>
          <a-tree-select
            v-model:value="form.responsibilityOrgId"
            class="full-input"
            :tree-data="responsibilityOrgTreeData"
            :field-names="{ value: 'value', label: 'title', children: 'children' }"
            :filter-tree-node="filterResponsibilityOrg"
            :loading="orgLoading"
            tree-node-filter-prop="searchText"
            show-search
            allow-clear
            placeholder="选择责任部门/组（显示完整路径与类型）"
          />
        </label>
        <label class="field"><span>供应商名称</span><a-input v-model:value="form.supplierName" placeholder="填写供应商名称" /></label>
        <label class="field">
          <span>附件</span>
          <AttachmentUploadButton
            v-model="form.attachmentGroupId"
            business-type="FIRST_CHECK"
            remark="供应商首检申请附件"
            button-text="上传文件"
          />
        </label>
        <label class="field"><span>申请时间</span><a-input v-model:value="form.applyTime" /></label>
      </div>
    </a-card>

    <div class="form-actions">
      <a-button @click="resetForm">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">提交</a-button>
    </div>
  </section>
</template>

<style scoped>
.firstcheck-supplier-page {
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
  min-height: 49px;
  padding: 0 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel :deep(.ant-card-body) {
  padding: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.form-grid {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.form-grid.cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field span {
  color: #344054;
  font-size: 13px;
  font-weight: 600;
}

.po-input {
  width: calc(100% - 66px);
}

.full-input {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

@media (max-width: 980px) {
  .form-grid.cols-4 {
    grid-template-columns: 1fr;
  }
}
</style>
