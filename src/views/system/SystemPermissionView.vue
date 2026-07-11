<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import {
  assignUserRoles,
  getUserRoles,
  listSystemOrgs,
  listSystemRoles,
  listSystemUsers,
  type SysOrgVO,
  type SysRoleVO,
  type SysUserVO
} from '@/api/system'
import { roleNameMap } from '@/types/common'

interface OrgOption {
  key: string
  name: string
  fullPath: string
  level?: string
  cate?: string
  descendantIds: string[]
}

interface OrgTreeNode {
  value: string
  title: string
  searchText: string
  children?: OrgTreeNode[]
}

const loading = ref(false)
const orgLoading = ref(false)
const roleLoading = ref(false)
const saveLoading = ref(false)
const modalOpen = ref(false)

const orgTree = ref<SysOrgVO[]>([])
const orgs = ref<OrgOption[]>([])
const users = ref<SysUserVO[]>([])
const roles = ref<SysRoleVO[]>([])
const selectedUser = ref<SysUserVO | null>(null)
const selectedRoleCodes = ref<string[]>([])
const selectedDeptId = ref('')
const tempSelectedDeptId = ref('')
const defaultExpandedOrgKeys = ref<string[]>([])
const orgExpandedKeys = ref<string[]>([])
const orgModalOpen = ref(false)

const filters = reactive({
  employeeId: '',
  employeeName: ''
})

const pager = reactive({
  current: 1,
  size: 20,
  total: 0
})

const tempSelectedDeptKeys = computed(() => (tempSelectedDeptId.value ? [tempSelectedDeptId.value] : []))

const selectedDeptIds = computed(() => {
  if (!selectedDeptId.value) return []
  const org = orgs.value.find((item) => item.key === selectedDeptId.value)
  return org?.descendantIds.length ? org.descendantIds : [selectedDeptId.value]
})

const orgTreeData = computed(() => {
  return toOrgTreeNodes(orgTree.value)
})

const selectedDeptName = computed(() => {
  if (!selectedDeptId.value) return '全部部门'
  return orgs.value.find((org) => org.key === selectedDeptId.value)?.name || selectedDeptId.value
})

const selectedDeptDescription = computed(() => {
  if (!selectedDeptId.value) return '未选择组织时显示全系统人员'
  const org = orgs.value.find((item) => item.key === selectedDeptId.value)
  if (!org) return selectedDeptId.value
  const childCount = Math.max(org.descendantIds.length - 1, 0)
  return `${org.key}${childCount ? ` · 含${childCount}个下级组织` : ''}`
})

const roleOptions = computed(() =>
  roles.value.map((role) => ({
    label: role.roleName || roleNameMap[role.roleCode] || role.roleCode,
    value: role.roleCode
  }))
)

const columns = [
  { title: '工号', dataIndex: 'employeeId', width: 150 },
  { title: '姓名', dataIndex: 'employeeName', width: 140 },
  { title: '部门', dataIndex: 'deptName', ellipsis: true },
  { title: '部门编号', dataIndex: 'deptId', width: 160 },
  { title: '联系电话', dataIndex: 'phone', width: 140 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '操作', dataIndex: 'action', width: 120, fixed: 'right' }
]

const visibleOrgLevels = new Set(['4', '5', '6'])

function formatOrgName(org: SysOrgVO) {
  return org.orgSimpleCName || org.orgFullCName || org.orgId
}

function formatOrgTitle(org: SysOrgVO) {
  return formatOrgName(org)
}

function isVisibleOrgLevel(level?: string) {
  return visibleOrgLevels.has(String(level || '').trim())
}

function flattenOrgs(input: SysOrgVO[], bucket: OrgOption[] = []): string[] {
  const ids: string[] = []
  for (const org of input) {
    const childIds = flattenOrgs(org.children || [], bucket)
    if (org.orgId && isVisibleOrgLevel(org.orgLevel)) {
      const descendantIds = [org.orgId, ...childIds]
      bucket.push({
        key: org.orgId,
        name: formatOrgName(org),
        fullPath: org.orgFullPath || org.orgFullCName || org.orgSimpleCName || org.orgId,
        level: org.orgLevel,
        cate: org.orgCate,
        descendantIds
      })
      ids.push(...descendantIds)
    } else {
      ids.push(...childIds)
    }
  }
  return ids
}

function toOrgTreeNodes(input: SysOrgVO[]): OrgTreeNode[] {
  const nodes: OrgTreeNode[] = []
  for (const org of input) {
    const children = org.children?.length ? toOrgTreeNodes(org.children) : []
    if (!org.orgId || !isVisibleOrgLevel(org.orgLevel)) {
      nodes.push(...children)
      continue
    }
    nodes.push({
      value: org.orgId,
      title: formatOrgTitle(org),
      searchText: [
        org.orgId,
        org.orgFullCName,
        org.orgSimpleCName,
        org.orgFullPath,
        org.orgCate,
        org.orgLevel
      ].filter(Boolean).join(' '),
      children: children.length ? children : undefined
    })
  }
  return nodes
}

function findOrgNode(nodes: OrgTreeNode[], value: string): OrgTreeNode | null {
  for (const node of nodes) {
    if (node.value === value) return node
    const child = node.children?.length ? findOrgNode(node.children, value) : null
    if (child) return child
  }
  return null
}

function collectKeys(nodes: OrgTreeNode[], maxDepth = Number.POSITIVE_INFINITY, depth = 0): string[] {
  const keys: string[] = []
  for (const node of nodes) {
    if (depth <= maxDepth) {
      keys.push(node.value)
    }
    if (node.children?.length) {
      keys.push(...collectKeys(node.children, maxDepth, depth + 1))
    }
  }
  return keys
}

async function loadOrgs() {
  orgLoading.value = true
  try {
    orgTree.value = await listSystemOrgs()
    const flattened: OrgOption[] = []
    flattenOrgs(orgTree.value, flattened)
    orgs.value = flattened
    defaultExpandedOrgKeys.value = collectKeys(toOrgTreeNodes(orgTree.value), 1)
    orgExpandedKeys.value = defaultExpandedOrgKeys.value
  } finally {
    orgLoading.value = false
  }
}

async function loadRoles() {
  roleLoading.value = true
  try {
    roles.value = await listSystemRoles()
  } finally {
    roleLoading.value = false
  }
}

async function loadUsers(page = pager.current) {
  loading.value = true
  try {
    const result = await listSystemUsers({
      current: page,
      size: pager.size,
      deptId: selectedDeptId.value || undefined,
      deptIds: selectedDeptId.value ? selectedDeptIds.value : undefined,
      employeeId: filters.employeeId.trim() || undefined,
      employeeName: filters.employeeName.trim() || undefined,
      status: 'enabled'
    })
    users.value = result.records || []
    pager.current = Number(result.current || page)
    pager.size = Number(result.size || pager.size)
    pager.total = Number(result.total || 0)
  } finally {
    loading.value = false
  }
}

function handleSelectDept(deptId: string) {
  selectedDeptId.value = deptId
  pager.current = 1
  loadUsers(1)
}

function openOrgPicker() {
  tempSelectedDeptId.value = selectedDeptId.value
  orgExpandedKeys.value = defaultExpandedOrgKeys.value
  orgModalOpen.value = true
}

function handleOrgTreeSelect(keys: (string | number)[]) {
  const nextKey = keys[0] ? String(keys[0]) : ''
  tempSelectedDeptId.value = nextKey

  const node = findOrgNode(orgTreeData.value, nextKey)
  if (!node?.children?.length) return

  const expanded = new Set(orgExpandedKeys.value)
  if (expanded.has(nextKey)) {
    expanded.delete(nextKey)
  } else {
    expanded.add(nextKey)
  }
  orgExpandedKeys.value = Array.from(expanded)
}

function handleOrgTreeExpand(keys: (string | number)[]) {
  orgExpandedKeys.value = keys.map(String)
}

function handleSelectAllDept() {
  tempSelectedDeptId.value = ''
}

function handleOrgConfirm() {
  orgModalOpen.value = false
  handleSelectDept(tempSelectedDeptId.value)
}

function handleSearch() {
  pager.current = 1
  loadUsers(1)
}

function handleReset() {
  filters.employeeId = ''
  filters.employeeName = ''
  selectedDeptId.value = ''
  pager.current = 1
  loadUsers(1)
}

function handleTableChange(nextPager: TablePaginationConfig) {
  pager.current = Number(nextPager.current || 1)
  pager.size = Number(nextPager.pageSize || pager.size)
  loadUsers(pager.current)
}

async function openRoleModal(user: SysUserVO) {
  selectedUser.value = user
  modalOpen.value = true
  roleLoading.value = true
  try {
    selectedRoleCodes.value = await getUserRoles(user.employeeId)
  } finally {
    roleLoading.value = false
  }
}

async function handleSaveRoles() {
  if (!selectedUser.value) return
  saveLoading.value = true
  try {
    await assignUserRoles(selectedUser.value.employeeId, selectedRoleCodes.value)
    message.success('角色配置已保存')
    modalOpen.value = false
    await loadUsers(pager.current)
  } finally {
    saveLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadOrgs(), loadRoles()])
  await loadUsers(1)
})
</script>

<template>
  <div class="permission-page">
    <section class="stats-strip">
      <a-card size="small">
        <span>当前部门</span>
        <strong>{{ selectedDeptName }}</strong>
      </a-card>
      <a-card size="small">
        <span>人员数量</span>
        <strong>{{ pager.total }}</strong>
      </a-card>
      <a-card size="small">
        <span>可分配角色</span>
        <strong>{{ roles.length }}</strong>
      </a-card>
    </section>

    <section class="permission-layout">
      <aside class="dept-panel">
        <div class="panel-title">
          <h2>部门人员</h2>
          <span>点击选择组织</span>
        </div>
        <a-spin :spinning="orgLoading">
          <div class="dept-picker">
            <button class="dept-selector-button" type="button" @click="openOrgPicker">
              <span>{{ selectedDeptName }}</span>
              <small>点击展开组织树选择</small>
            </button>
            <div class="dept-current">
              <span>当前选择</span>
              <strong>{{ selectedDeptName }}</strong>
              <small>{{ selectedDeptDescription }}</small>
            </div>
          </div>
        </a-spin>
      </aside>

      <main class="user-panel">
        <div class="filter-card">
          <a-form layout="inline" :model="filters">
            <a-form-item label="工号">
              <a-input v-model:value="filters.employeeId" placeholder="输入工号模糊查询" allow-clear />
            </a-form-item>
            <a-form-item label="姓名">
              <a-input v-model:value="filters.employeeName" placeholder="输入姓名模糊查询" allow-clear />
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" @click="handleSearch">查询</a-button>
                <a-button @click="handleReset">重置</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </div>

        <a-table
          row-key="employeeId"
          :columns="columns"
          :data-source="users"
          :loading="loading"
          :scroll="{ x: 980 }"
          :pagination="{ current: pager.current, pageSize: pager.size, total: pager.total, showSizeChanger: true }"
          size="middle"
          @change="handleTableChange"
          @row="(record: SysUserVO) => ({ onClick: () => openRoleModal(record) })"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'status'">
              <a-tag :color="record.status === 'enabled' ? 'green' : 'red'">
                {{ record.status === 'enabled' ? '启用' : '停用' }}
              </a-tag>
            </template>
            <template v-if="column.dataIndex === 'action'">
              <a-button type="link" size="small" @click.stop="openRoleModal(record)">分配角色</a-button>
            </template>
          </template>
        </a-table>
      </main>
    </section>

    <a-modal
      v-model:open="orgModalOpen"
      title="选择组织"
      width="760px"
      ok-text="确认"
      cancel-text="取消"
      @ok="handleOrgConfirm"
    >
      <div class="org-picker-modal">
        <div class="org-picker-actions">
          <a-button :type="!tempSelectedDeptId ? 'primary' : 'default'" @click="handleSelectAllDept">
            全部部门
          </a-button>
          <span>点击组织名称可选中并展开下级</span>
        </div>
        <a-spin :spinning="orgLoading">
          <a-tree
            v-if="orgTreeData.length"
            class="org-picker-tree"
            block-node
            show-line
            :tree-data="orgTreeData"
            :field-names="{ key: 'value', title: 'title', children: 'children' }"
            :selected-keys="tempSelectedDeptKeys"
            :expanded-keys="orgExpandedKeys"
            @select="handleOrgTreeSelect"
            @expand="handleOrgTreeExpand"
          />
          <a-empty v-else image="simple" description="未找到组织" />
        </a-spin>
      </div>
    </a-modal>

    <a-modal
      v-model:open="modalOpen"
      title="分配人员角色"
      width="720px"
      :confirm-loading="saveLoading"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleSaveRoles"
    >
      <a-spin :spinning="roleLoading">
        <div v-if="selectedUser" class="role-modal">
          <div class="user-summary">
            <div>
              <span>工号</span>
              <strong>{{ selectedUser.employeeId }}</strong>
            </div>
            <div>
              <span>姓名</span>
              <strong>{{ selectedUser.employeeName || '-' }}</strong>
            </div>
            <div>
              <span>部门</span>
              <strong>{{ selectedUser.deptName || selectedUser.deptId || '-' }}</strong>
            </div>
          </div>

          <a-alert
            type="warning"
            show-icon
            message="保存会覆盖该人员原有角色，请确认后提交。"
          />

          <a-checkbox-group v-model:value="selectedRoleCodes" class="role-grid">
            <a-checkbox v-for="role in roleOptions" :key="role.value" :value="role.value">
              <span class="role-name">{{ role.label }}</span>
              <small>{{ role.value }}</small>
            </a-checkbox>
          </a-checkbox-group>
        </div>
      </a-spin>
    </a-modal>
  </div>
</template>

<style scoped>
.permission-page {
  display: grid;
  gap: 16px;
}

.stats-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stats-strip :deep(.ant-card-body) {
  display: grid;
  gap: 6px;
}

.stats-strip span {
  color: #667085;
  font-size: 13px;
}

.stats-strip strong {
  color: #172033;
  font-size: 20px;
}

.permission-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
}

.dept-panel,
.user-panel,
.filter-card {
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.dept-panel {
  min-height: calc(100vh - 190px);
  padding: 16px;
}

.panel-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-title h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
}

.panel-title span {
  color: #667085;
  font-size: 12px;
}

.dept-picker {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.dept-selector-button {
  display: grid;
  width: 100%;
  min-height: 76px;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid #d3dae6;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.dept-selector-button:hover {
  border-color: #1769e0;
  background: #f8fbff;
  box-shadow: 0 0 0 3px rgba(23, 105, 224, 0.1);
}

.dept-selector-button span {
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dept-selector-button small {
  color: #667085;
  font-size: 12px;
}

.dept-selector {
  width: 100%;
}

.dept-current {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid #e5eaf1;
  border-radius: 6px;
  background: #f8fafc;
}

.dept-current span {
  color: #667085;
  font-size: 12px;
}

.dept-current strong {
  overflow: hidden;
  color: #172033;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dept-current small {
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-panel {
  min-width: 0;
  padding: 16px;
}

.filter-card {
  margin-bottom: 14px;
  padding: 14px;
}

.org-picker-modal {
  display: grid;
  gap: 14px;
}

.org-picker-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #f8fafc;
}

.org-picker-actions span {
  color: #667085;
  font-size: 13px;
}

.org-picker-tree {
  max-height: 56vh;
  overflow: auto;
  padding: 8px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.org-picker-tree :deep(.ant-tree-node-content-wrapper) {
  min-height: 30px;
  line-height: 30px;
  border-radius: 6px;
}

.org-picker-tree :deep(.ant-tree-node-content-wrapper:hover) {
  background: #eef5ff;
}

.org-picker-tree :deep(.ant-tree-node-selected) {
  background: #dbeafe !important;
  color: #1769e0;
  font-weight: 600;
}

.role-modal {
  display: grid;
  gap: 16px;
}

.user-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.user-summary div {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid #e5eaf1;
  border-radius: 6px;
  background: #f8fafc;
}

.user-summary span {
  color: #667085;
  font-size: 12px;
}

.user-summary strong {
  overflow: hidden;
  color: #172033;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.role-grid :deep(.ant-checkbox-wrapper) {
  min-height: 54px;
  align-items: center;
  margin-inline-start: 0;
  padding: 10px 12px;
  border: 1px solid #e5eaf1;
  border-radius: 6px;
}

.role-name {
  display: block;
  color: #172033;
  font-weight: 600;
}

.role-grid small {
  display: block;
  color: #667085;
}

@media (max-width: 980px) {
  .stats-strip,
  .permission-layout,
  .user-summary,
  .role-grid {
    grid-template-columns: 1fr;
  }

  .dept-panel {
    min-height: auto;
  }

  .dept-picker {
    margin-bottom: 4px;
  }
}
</style>
