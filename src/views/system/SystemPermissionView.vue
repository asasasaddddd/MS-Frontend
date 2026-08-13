<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import {
  listAllowedOrganizationUsers,
  listAllowedUnits,
  listSystemRoles,
  type SysRoleVO,
  type SysUserVO
} from '@/api/system'
import type { AllowedUnitVO } from '@/types/nodePermission'
import UserWorkScopeDialog from '@/views/system/components/UserWorkScopeDialog.vue'

const loading = ref(false)
const unitLoading = ref(false)
const roleLoading = ref(false)
const units = ref<AllowedUnitVO[]>([])
const roles = ref<SysRoleVO[]>([])
const users = ref<SysUserVO[]>([])
const selectedUnitId = ref<string>()
const selectedUser = ref<SysUserVO | null>(null)
const permissionDialogOpen = ref(false)
let userRequestSerial = 0

const filters = reactive({
  employeeId: '',
  employeeName: ''
})

const pagination = reactive({
  current: 1,
  pageSize: 20
})

const columns = [
  { title: '工号', dataIndex: 'employeeId', width: 150 },
  { title: '姓名', dataIndex: 'employeeName', width: 120 },
  { title: '部门', dataIndex: 'deptName', width: 180, ellipsis: true },
  { title: '组', dataIndex: 'groupName', width: 180, ellipsis: true },
  { title: '已有角色', dataIndex: 'roles', minWidth: 260 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '操作', dataIndex: 'action', width: 120, fixed: 'right' }
]

const unitOptions = computed(() => units.value.map((unit) => ({
  label: unit.unitName ? `${unit.unitName}（${unit.unitId}）` : unit.unitId,
  value: unit.unitId,
  searchText: [unit.unitId, unit.unitName, unit.orgFullPath]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
})))

const selectedOrganizationIds = computed(() => selectedUnitId.value ? [selectedUnitId.value] : [])

const filteredUsers = computed(() => {
  const employeeId = filters.employeeId.trim().toLowerCase()
  const employeeName = filters.employeeName.trim().toLowerCase()
  return users.value.filter((user) => {
    const idMatched = !employeeId || user.employeeId.toLowerCase().includes(employeeId)
    const nameMatched = !employeeName
      || String(user.employeeName || '').toLowerCase().includes(employeeName)
    return idMatched && nameMatched
  })
})

function filterUnitOption(input: string, option: { searchText: string }) {
  return option.searchText.includes(input.trim().toLowerCase())
}

function roleCodes(user: SysUserVO) {
  if (Array.isArray(user.roles)) return user.roles.filter(Boolean)
  return String(user.role || '').split(',').map((role) => role.trim()).filter(Boolean)
}

function roleLabel(roleCode: string) {
  const role = roles.value.find((item) => item.roleCode === roleCode)
  return role?.roleName || roleCode
}

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
    const direct = (error as { message?: string }).message
    if (direct) return direct
  }
  return fallback
}

async function loadUnits() {
  unitLoading.value = true
  try {
    units.value = await listAllowedUnits()
  } catch (error) {
    message.error(errorMessage(error, '平级单位列表加载失败'))
  } finally {
    unitLoading.value = false
  }
}

async function loadRoles() {
  roleLoading.value = true
  try {
    roles.value = await listSystemRoles()
  } catch (error) {
    message.error(errorMessage(error, '角色列表加载失败'))
  } finally {
    roleLoading.value = false
  }
}

async function loadUsers() {
  const requestId = ++userRequestSerial
  loading.value = true
  try {
    const result = await listAllowedOrganizationUsers(selectedOrganizationIds.value)
    if (requestId !== userRequestSerial) return
    users.value = result || []
    pagination.current = 1
  } catch (error) {
    if (requestId === userRequestSerial) {
      message.error(errorMessage(error, '允许范围人员加载失败'))
    }
  } finally {
    if (requestId === userRequestSerial) loading.value = false
  }
}

function handleUnitChange() {
  loadUsers()
}

function handleReset() {
  filters.employeeId = ''
  filters.employeeName = ''
  selectedUnitId.value = undefined
  loadUsers()
}

function handleTableChange(next: TablePaginationConfig) {
  pagination.current = Number(next.current || 1)
  pagination.pageSize = Number(next.pageSize || pagination.pageSize)
}

function openPermissionDialog(user: SysUserVO) {
  selectedUser.value = user
  permissionDialogOpen.value = true
}

async function handleMatrixSaved() {
  await loadUsers()
}

onMounted(async () => {
  await Promise.all([loadUnits(), loadRoles()])
  await loadUsers()
})
</script>

<template>
  <section class="permission-page">
    <header class="page-heading">
      <div>
        <h1>人员权限配置</h1>
        <p>按平级单位与设备属性配置人员作业范围；流程节点操作继续由后端统一模板控制。</p>
      </div>
      <div class="page-metrics">
        <span>平级单位 <strong>{{ units.length }}</strong></span>
        <span>当前人员 <strong>{{ filteredUsers.length }}</strong></span>
        <span>可配置角色 <strong>{{ roles.length }}</strong></span>
      </div>
    </header>

    <a-card :bordered="false" class="filter-card">
      <div class="filter-grid">
        <label>
          <span>单位</span>
          <a-select
            v-model:value="selectedUnitId"
            :options="unitOptions"
            :filter-option="filterUnitOption"
            :loading="unitLoading"
            show-search
            allow-clear
            placeholder="全部平级单位"
            @change="handleUnitChange"
          />
        </label>
        <label>
          <span>工号</span>
          <a-input v-model:value="filters.employeeId" allow-clear placeholder="输入工号模糊查询" />
        </label>
        <label>
          <span>姓名</span>
          <a-input v-model:value="filters.employeeName" allow-clear placeholder="输入姓名模糊查询" />
        </label>
        <div class="filter-actions">
          <a-button @click="handleReset">重置</a-button>
        </div>
      </div>
    </a-card>

    <a-card :bordered="false" class="person-card">
      <template #title>
        <div class="card-title">
          <div>
            <strong>人员列表</strong>
            <span>点击“配置权限”设置该人员的平级单位与设备属性作业范围。</span>
          </div>
        </div>
      </template>

      <a-table
        row-key="employeeId"
        :columns="columns"
        :data-source="filteredUsers"
        :loading="loading || roleLoading"
        :pagination="{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: filteredUsers.length,
          showSizeChanger: true,
          showTotal: (total: number) => `共 ${total} 人`
        }"
        :scroll="{ x: 1080 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'roles'">
            <a-space v-if="roleCodes(record).length" :size="[4, 6]" wrap>
              <a-tag v-for="roleCode in roleCodes(record)" :key="roleCode" color="blue">
                {{ roleLabel(roleCode) }}
              </a-tag>
            </a-space>
            <span v-else class="muted">未配置</span>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="String(record.status || 'enabled').toLowerCase() === 'disabled' ? 'default' : 'green'">
              {{ String(record.status || 'enabled').toLowerCase() === 'disabled' ? '停用' : '启用' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-button type="link" @click="openPermissionDialog(record)">配置权限</a-button>
          </template>
        </template>
        <template #emptyText>
          <a-empty image="simple" description="当前范围暂无人员" />
        </template>
      </a-table>
    </a-card>

    <UserWorkScopeDialog
      v-model:open="permissionDialogOpen"
      :user="selectedUser"
      :roles="roles"
      @saved="handleMatrixSaved"
    />
  </section>
</template>

<style scoped>
.permission-page {
  display: grid;
  gap: 16px;
}

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e5eaf1;
}

.page-heading h1,
.page-heading p {
  margin: 0;
}

.page-heading h1 {
  color: #172033;
  font-size: 20px;
}

.page-heading p,
.card-title span,
.muted {
  color: #667085;
  font-size: 13px;
}

.page-heading p {
  margin-top: 5px;
}

.page-metrics {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 16px;
  color: #667085;
  font-size: 13px;
}

.page-metrics strong {
  margin-left: 5px;
  color: #172033;
}

.filter-card,
.person-card {
  border: 1px solid #e5eaf1;
  border-radius: 10px;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) minmax(180px, 1fr) minmax(180px, 1fr) auto;
  align-items: end;
  gap: 14px;
}

.filter-grid label {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.filter-grid label > span {
  color: #475467;
  font-size: 13px;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.card-title > div {
  display: grid;
  gap: 3px;
}

@media (max-width: 900px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .page-metrics {
    justify-content: flex-start;
  }

  .filter-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 620px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
