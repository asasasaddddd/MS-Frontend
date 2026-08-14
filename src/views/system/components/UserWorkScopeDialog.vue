<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  getUserWorkScopes,
  replaceUserWorkScopes
} from '@/api/nodePermission'
import {
  assignUserRoles,
  getUserRoles,
  listAllowedUnits,
  type SysRoleVO,
  type SysUserVO
} from '@/api/system'
import { listDictItems, productionDictionaryTypes, type DictItemVO } from '@/api/dict'
import type {
  AllowedUnitVO,
  UserWorkScopeEntry,
  WorkScopeCommonScopeCode
} from '@/types/nodePermission'
import {
  READONLY_ROLE_DESCRIPTIONS,
  buildWorkScopeMatrixRequest,
  diffWorkScopeEntries,
  expandWorkScopeSelections,
  isMatrixVersionConflict,
  resolveRoleFormCapabilities,
  sortWorkScopeEntries,
  validateWorkScopeDraft,
  workScopeErrorMessage
} from '@/views/system/workScopeModel'

const COMMON_SCOPE_OPTIONS = [
  { label: '通用', value: 'COMMON' as WorkScopeCommonScopeCode },
  { label: '否通用', value: 'NON_COMMON' as WorkScopeCommonScopeCode }
]

const props = defineProps<{
  open: boolean
  user: SysUserVO | null
  roles: SysRoleVO[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const matrixVersion = ref('')
const homeUnitId = ref('')
const homeUnitName = ref('')
const baselineEntries = ref<UserWorkScopeEntry[]>([])
const draftEntries = ref<UserWorkScopeEntry[]>([])
const units = ref<AllowedUnitVO[]>([])
const subjects = ref<DictItemVO[]>([])

const formRoleCode = ref('')
const formUnitIds = ref<string[]>([])
const formSubjects = ref<string[]>([])
const formCommonScopes = ref<WorkScopeCommonScopeCode[]>([])
const formError = ref('')

const fetchedUserRoleCodes = ref<string[]>([])
const roleLoading = ref(false)

/** 弹窗打开期间的角色分配真值：左栏勾选立即写库并同步到此处。 */
const assignedRoleCodes = ref<string[]>([])
const roleAssigning = ref(false)

let loadSerial = 0

function roleLabel(roleCode: string) {
  const role = props.roles.find((item) => item.roleCode === roleCode)
  return role?.roleName || roleCode
}

/** 可配置角色取“已分配角色 ∩ 封闭角色策略目录”；左栏授予新角色后立即出现。 */
const configurableRoleOptions = computed(() => assignedRoleCodes.value
  .map((roleCode) => resolveRoleFormCapabilities(roleCode))
  .filter((capabilities) => capabilities.configurable)
  .map((capabilities) => ({
    label: roleLabel(capabilities.roleCode),
    value: capabilities.roleCode
  })))

const formCapabilities = computed(() => resolveRoleFormCapabilities(formRoleCode.value))

const unitOptions = computed(() => units.value.map((unit) => ({
  label: unit.unitName ? `${unit.unitName}（${unit.unitId}）` : unit.unitId,
  value: unit.unitId
})))

const subjectOptions = computed(() => subjects.value.map((item) => ({
  label: `${item.itemCode} ${item.itemName || ''}`.trim(),
  value: item.itemCode
})))

const matrixDiff = computed(() => diffWorkScopeEntries(
  baselineEntries.value,
  draftEntries.value
))

const sortedDraftEntries = computed(() => sortWorkScopeEntries(draftEntries.value))

const userDisabled = computed(() =>
  String(props.user?.status || 'enabled').toLowerCase() === 'disabled')

function unitName(unitId: string) {
  return units.value.find((unit) => unit.unitId === unitId)?.unitName || unitId
}

function verificationMethodLabel(method: string) {
  if (method === 'self') return '自检'
  if (method === 'send_out') return '外委'
  return '不适用'
}

function commonScopeLabel(commonScope: string) {
  if (commonScope === 'COMMON') return '通用'
  if (commonScope === 'NON_COMMON') return '否通用'
  return '不适用'
}

function resetForm() {
  formRoleCode.value = ''
  formUnitIds.value = []
  formSubjects.value = []
  formCommonScopes.value = []
  formError.value = ''
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

/**
 * 当列表未返回角色时，回调查询该人员的真实角色，避免角色分配面板为空。
 */
async function loadUserRolesIfNeeded() {
  const record = props.user
  if (!record?.employeeId) return
  const hasRolesFromList = (Array.isArray(record.roles) && record.roles.length)
    || String(record.role || '').split(',').filter(Boolean).length > 0
  if (hasRolesFromList) {
    fetchedUserRoleCodes.value = []
    return
  }
  roleLoading.value = true
  try {
    fetchedUserRoleCodes.value = await getUserRoles(record.employeeId)
  } catch (error) {
    fetchedUserRoleCodes.value = []
  } finally {
    roleLoading.value = false
  }
}

/** 计算打开弹窗时的初始角色集：列表行优先，其次旧角色字段，最后回调查询结果。 */
function initialRoleCodes() {
  const record = props.user
  if (!record) return [] as string[]
  if (Array.isArray(record.roles) && record.roles.length) {
    return record.roles.filter(Boolean)
  }
  const fromRoleField = String(record.role || '').split(',').map((item) => item.trim()).filter(Boolean)
  if (fromRoleField.length) return fromRoleField
  return (fetchedUserRoleCodes.value || []).filter(Boolean)
}

async function initializeDialog() {
  await loadUserRolesIfNeeded()
  assignedRoleCodes.value = initialRoleCodes()
  loadMatrix()
}

/**
 * 左栏勾选角色：立即调用覆盖式角色分配接口。
 * 失败（如角色仍有活动规则或已认领任务）时保持原勾选状态并提示后端原因。
 */
async function handleRoleToggle(roleCode: string, checked: boolean) {
  const employeeId = props.user?.employeeId
  if (!employeeId || roleAssigning.value) return
  const current = assignedRoleCodes.value
  if (checked === current.includes(roleCode)) return
  if (!checked) {
    const draftCount = draftEntries.value.filter((entry) => entry.roleCode === roleCode).length
    if (draftCount > 0) {
      message.warning(`角色 ${roleLabel(roleCode)} 还有 ${draftCount} 条未保存的规则，请先在下方移除`)
      return
    }
  }
  const next = checked
    ? [...current, roleCode]
    : current.filter((code) => code !== roleCode)
  roleAssigning.value = true
  try {
    await assignUserRoles(employeeId, next)
    assignedRoleCodes.value = next
    message.success(checked
      ? `已授予角色：${roleLabel(roleCode)}`
      : `已移除角色：${roleLabel(roleCode)}`)
    emit('saved')
  } catch (error) {
    message.error(errorMessage(error, '角色分配失败'))
  } finally {
    roleAssigning.value = false
  }
}

function onRoleCheckboxChange(roleCode: string, event: { target?: { checked?: boolean } }) {
  handleRoleToggle(roleCode, Boolean(event?.target?.checked))
}

async function loadMatrix() {
  const employeeId = props.user?.employeeId
  if (!props.open || !employeeId) return
  const requestId = ++loadSerial
  loading.value = true
  loadError.value = ''
  try {
    const [matrix, unitRows, subjectRows] = await Promise.all([
      getUserWorkScopes(employeeId),
      listAllowedUnits(),
      listDictItems(productionDictionaryTypes.subjectSubcategory)
    ])
    if (requestId !== loadSerial || props.user?.employeeId !== employeeId) return
    baselineEntries.value = sortWorkScopeEntries(matrix.entries || [])
    draftEntries.value = sortWorkScopeEntries(matrix.entries || [])
    matrixVersion.value = matrix.matrixVersion || ''
    homeUnitId.value = matrix.homeUnitId || ''
    homeUnitName.value = matrix.homeUnitName || ''
    units.value = unitRows || []
    subjects.value = (subjectRows || [])
      .filter((item) => /^\d{6}$/.test(String(item.itemCode || '')))
    resetForm()
  } catch (error) {
    if (requestId !== loadSerial) return
    loadError.value = workScopeErrorMessage(error, '权限配置加载失败')
  } finally {
    if (requestId === loadSerial) loading.value = false
  }
}

function handleAddRules() {
  formError.value = ''
  try {
    const rows = expandWorkScopeSelections({
      roleCode: formRoleCode.value,
      unitIds: formUnitIds.value,
      subjectSubcategories: formSubjects.value,
      commonScopes: formCommonScopes.value
    })
    draftEntries.value = sortWorkScopeEntries([...draftEntries.value, ...rows])
    resetForm()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : String(error)
  }
}

function handleRemoveRule(row: UserWorkScopeEntry) {
  const index = draftEntries.value.findIndex((entry) =>
    entry.roleCode === row.roleCode
    && entry.unitId === row.unitId
    && entry.subjectSubcategory === row.subjectSubcategory
    && entry.verificationMethod === row.verificationMethod
    && entry.commonScope === row.commonScope)
  if (index >= 0) {
    draftEntries.value = draftEntries.value.filter((_, position) => position !== index)
  }
}


async function handleSave() {
  const employeeId = props.user?.employeeId
  if (!employeeId || !matrixVersion.value || loading.value || loadError.value) return
  const errors = validateWorkScopeDraft(draftEntries.value)
  if (errors.length) {
    message.error(errors[0])
    return
  }
  saving.value = true
  try {
    const result = await replaceUserWorkScopes(
      employeeId,
      buildWorkScopeMatrixRequest(draftEntries.value, matrixVersion.value)
    )
    baselineEntries.value = sortWorkScopeEntries(result.entries || [])
    draftEntries.value = sortWorkScopeEntries(result.entries || [])
    matrixVersion.value = result.matrixVersion || ''
    message.success('作业范围配置已保存')
    emit('saved')
  } catch (error) {
    if (isMatrixVersionConflict(error)) {
      message.error(workScopeErrorMessage(error, '作业范围配置已被他人修改，请重新加载后再保存'))
    } else {
      message.error(workScopeErrorMessage(error, '作业范围配置保存失败'))
    }
  } finally {
    saving.value = false
  }
}

function closeDialog() {
  emit('update:open', false)
}

watch(
  () => [props.open, props.user?.employeeId] as const,
  ([open]) => {
    if (open) {
      initializeDialog()
    } else {
      loadSerial += 1
      assignedRoleCodes.value = []
      fetchedUserRoleCodes.value = []
    }
  },
  { immediate: true }
)
</script>

<template>
  <a-modal
    :open="open"
    wrap-class-name="permission-config-modal"
    width="min(1280px, calc(100vw - 32px))"
    :footer="null"
    :mask-closable="false"
    destroy-on-close
    @cancel="closeDialog"
  >
    <template #title>
      <div class="dialog-title">
        <div>
          <strong>人员权限配置</strong>
          <span>{{ user?.employeeName || '-' }} · {{ user?.employeeId || '-' }}</span>
        </div>
      </div>
    </template>

    <a-spin :spinning="loading">
      <a-alert
        v-if="loadError"
        type="error"
        show-icon
        :message="loadError"
        class="load-error"
      >
        <template #action>
          <a-button size="small" @click="loadMatrix">重新加载</a-button>
        </template>
      </a-alert>

      <div v-else class="work-scope-layout">
        <div class="scope-columns">
          <section class="role-panel">
            <header class="panel-heading">
              <div>
                <h3>角色分配</h3>
                <p>勾选立即生效；仅“可配置”角色能在右侧配置作业范围。</p>
              </div>
            </header>
            <a-spin :spinning="roleLoading" size="small">
              <ul class="role-list">
                <li v-for="role in roles" :key="role.roleCode" class="role-item" :title="role.roleCode">
                  <a-checkbox
                    :checked="assignedRoleCodes.includes(role.roleCode)"
                    :disabled="roleAssigning"
                    @change="onRoleCheckboxChange(role.roleCode, $event)"
                  >
                    <span class="role-item-name">{{ role.roleName || role.roleCode }}</span>
                  </a-checkbox>
                  <a-tag
                    v-if="resolveRoleFormCapabilities(role.roleCode).configurable"
                    color="green"
                    class="role-item-tag"
                  >
                    可配置
                  </a-tag>
                  <a-tag v-else class="role-item-tag">
                    {{ READONLY_ROLE_DESCRIPTIONS[role.roleCode] || '只读' }}
                  </a-tag>
                </li>
                <li v-if="!roles.length" class="role-list-empty">角色目录加载中或为空</li>
              </ul>
            </a-spin>
          </section>

          <section class="info-panel">
            <header class="panel-heading">
              <div>
                <h3>人员信息</h3>
                <p>来自人员主数据，只读展示。</p>
              </div>
            </header>
            <dl class="info-grid">
              <div>
                <dt>工号</dt>
                <dd>{{ user?.employeeId || '-' }}</dd>
              </div>
              <div>
                <dt>姓名</dt>
                <dd>{{ user?.employeeName || '-' }}</dd>
              </div>
              <div>
                <dt>部门</dt>
                <dd>{{ user?.deptName || '-' }}</dd>
              </div>
              <div>
                <dt>组</dt>
                <dd>{{ user?.groupName || '-' }}</dd>
              </div>
              <div>
                <dt>岗位</dt>
                <dd>{{ user?.jobFullName || user?.positionDesc || '-' }}</dd>
              </div>
              <div>
                <dt>主单位</dt>
                <dd>{{ homeUnitName ? `${homeUnitName}（${homeUnitId}）` : '-' }}</dd>
              </div>
              <div>
                <dt>状态</dt>
                <dd>
                  <a-tag :color="userDisabled ? 'default' : 'green'">
                    {{ userDisabled ? '停用' : '启用' }}
                  </a-tag>
                </dd>
              </div>
              <div>
                <dt>已分配角色</dt>
                <dd>
                  <a-space v-if="assignedRoleCodes.length" :size="[4, 6]" wrap>
                    <a-tag v-for="roleCode in assignedRoleCodes" :key="roleCode" color="blue">
                      {{ roleLabel(roleCode) }}
                    </a-tag>
                  </a-space>
                  <span v-else class="muted">未分配</span>
                </dd>
              </div>
            </dl>
          </section>

          <section class="rule-panel">
            <header class="panel-heading">
              <div>
                <h3>作业范围规则</h3>
                <p>按角色选择平级单位和设备属性；多选保存前展开为可审计规则行。</p>
              </div>
            </header>

            <div class="rule-form">
              <label>
                <span>角色</span>
                <a-select
                  v-model:value="formRoleCode"
                  :options="configurableRoleOptions"
                  :loading="roleLoading"
                  placeholder="选择可配置角色"
                  allow-clear
                />
              </label>
              <label>
                <span>单位（可多选）</span>
                <a-select
                  v-model:value="formUnitIds"
                  :options="unitOptions"
                  mode="multiple"
                  show-search
                  option-filter-prop="label"
                  placeholder="选择平级单位"
                  :disabled="!formCapabilities.configurable"
                />
              </label>
              <label v-if="formCapabilities.subjectRequired">
                <span>学科小类（可多选）</span>
                <a-select
                  v-model:value="formSubjects"
                  :options="subjectOptions"
                  mode="multiple"
                  show-search
                  option-filter-prop="label"
                  placeholder="选择六位学科小类"
                />
              </label>
              <label v-if="formCapabilities.commonRequired">
                <span>通用 / 否通用（必选）</span>
                <a-checkbox-group
                  v-model:value="formCommonScopes"
                  :options="COMMON_SCOPE_OPTIONS"
                />
              </label>
              <div class="rule-actions">
                <a-button
                  type="primary"
                  :disabled="!formCapabilities.configurable || !formUnitIds.length"
                  @click="handleAddRules"
                >
                  添加规则
                </a-button>
              </div>
            </div>
            <a-alert v-if="formError" type="error" show-icon :message="formError" />

            <a-table
              row-key="id"
              size="small"
              :data-source="sortedDraftEntries"
              :pagination="false"
              :scroll="{ y: 260 }"
              class="rule-table"
            >
              <a-table-column title="角色" key="roleCode">
                <template #default="{ record }">
                  {{ roleLabel(record.roleCode) }}
                </template>
              </a-table-column>
              <a-table-column title="单位" key="unitId">
                <template #default="{ record }">
                  {{ record.unitName || unitName(record.unitId) }}
                </template>
              </a-table-column>
              <a-table-column title="学科小类" data-index="subjectSubcategory" />
              <a-table-column title="检定方式" key="verificationMethod">
                <template #default="{ record }">
                  {{ verificationMethodLabel(record.verificationMethod) }}
                </template>
              </a-table-column>
              <a-table-column title="通用性" key="commonScope">
                <template #default="{ record }">
                  {{ commonScopeLabel(record.commonScope) }}
                </template>
              </a-table-column>
              <a-table-column title="操作" key="action" :width="80">
                <template #default="{ record }">
                  <a-button type="link" danger @click="handleRemoveRule(record)">移除</a-button>
                </template>
              </a-table-column>
              <template #emptyText>
                <a-empty image="simple" description="尚未配置作业范围规则" />
              </template>
            </a-table>
          </section>
        </div>

        
      </div>
    </a-spin>

    <footer class="dialog-footer">
      <div class="change-summary">
        <span>角色勾选立即生效；作业范围规则保存时整组校验并事务替换，版本冲突返回 HTTP 409。</span>
        <a-space :size="6" wrap>
          <a-tag color="green">新增 {{ matrixDiff.added.length }}</a-tag>
          <a-tag color="red">移除 {{ matrixDiff.removed.length }}</a-tag>
          <a-tag>保留 {{ matrixDiff.retained.length }}</a-tag>
        </a-space>
      </div>
      <a-space>
        <a-button @click="closeDialog">取消</a-button>
        <a-button
          type="primary"
          :loading="saving"
          :disabled="loading || !matrixVersion || Boolean(loadError)"
          @click="handleSave"
        >
          保存配置
        </a-button>
      </a-space>
    </footer>
  </a-modal>
</template>

<style scoped>
:global(.permission-config-modal .ant-modal) {
  top: 16px;
  max-width: calc(100vw - 32px);
  padding-bottom: 16px;
}

:global(.permission-config-modal .ant-modal-content) {
  display: flex;
  max-height: calc(100vh - 32px);
  flex-direction: column;
  overflow: hidden;
}

:global(.permission-config-modal .ant-modal-body) {
  min-height: 0;
  overflow-y: auto;
}

.dialog-title > div {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.dialog-title span,
.panel-heading p,
.change-summary > span,
.muted {
  color: #667085;
  font-size: 13px;
}

.load-error {
  margin-bottom: 16px;
}

.work-scope-layout {
  display: grid;
  gap: 16px;
}

.scope-columns {
  display: grid;
  grid-template-columns: 300px 240px minmax(0, 1fr);
  align-items: stretch;
  gap: 16px;
}

.role-panel,
.info-panel,
.rule-panel {
  min-width: 0;
  padding: 16px;
  border: 1px solid #e5eaf1;
  border-radius: 10px;
  background: #fff;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-heading h3,
.panel-heading p {
  margin: 0;
}

.panel-heading p {
  margin-top: 4px;
}

.role-list {
  display: grid;
  max-height: 320px;
  margin: 0;
  padding: 0;
  gap: 2px;
  overflow-y: auto;
  list-style: none;
}

.role-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 32px;
  padding: 2px 6px;
  border-radius: 6px;
}

.role-item:hover {
  background: #f5f7fa;
}

.role-item :deep(.ant-checkbox-wrapper) {
  min-width: 0;
  flex: 1;
  white-space: nowrap;
}

.role-item-name {
  color: #172033;
  font-weight: 500;
}

.role-item-tag {
  flex-shrink: 0;
  margin-inline-end: 0;
}

.role-list-empty {
  padding: 12px 6px;
  color: #98a2b3;
  font-size: 13px;
}

.info-grid {
  display: grid;
  margin: 0;
  gap: 12px;
}

.info-grid > div {
  display: grid;
  gap: 2px;
}

.info-grid dt {
  color: #667085;
  font-size: 12px;
}

.info-grid dd {
  margin: 0;
  color: #172033;
  font-size: 13px;
  word-break: break-all;
}

.rule-form {
  display: grid;
  grid-template-columns: 1fr;
  align-items: end;
  gap: 12px;
  margin-bottom: 12px;
}

.rule-form label {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.rule-form label > span {
  color: #475467;
  font-size: 13px;
}

.rule-actions {
  display: flex;
  gap: 8px;
}

.rule-table {
  margin-top: 14px;
}



.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #edf0f5;
}

.change-summary {
  display: grid;
  gap: 6px;
}

@media (max-width: 1100px) {
  .scope-columns {
    grid-template-columns: 1fr;
  }

  .dialog-footer,
  .panel-heading {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
