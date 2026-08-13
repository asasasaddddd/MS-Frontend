<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  getUserWorkScopes,
  previewWorkScopeCandidates,
  replaceUserWorkScopes
} from '@/api/nodePermission'
import { listAllowedUnits, type SysRoleVO, type SysUserVO } from '@/api/system'
import { listDictItems, productionDictionaryTypes, type DictItemVO } from '@/api/dict'
import type {
  AllowedUnitVO,
  UserWorkScopeEntry,
  WorkScopeCandidateVO,
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

/** 候选预览使用的代表节点操作；候选匹配只依赖角色策略与四维属性。 */
const PREVIEW_OPERATIONS: Record<string, {
  businessType: string
  nodeCode: string
  operationCode: string
  permissionCode: string
}> = {
  MEASURE_ADMIN: {
    businessType: 'PHYSICAL',
    nodeCode: 'take_back',
    operationCode: 'TAKE_BACK',
    permissionCode: 'physical.main.take_back.take_back'
  },
  VERIFIER_SELF: {
    businessType: 'PHYSICAL',
    nodeCode: 'receive',
    operationCode: 'RECEIVE',
    permissionCode: 'physical.main.receive.receive'
  },
  VERIFIER_EXTERNAL: {
    businessType: 'PHYSICAL',
    nodeCode: 'receive',
    operationCode: 'RECEIVE',
    permissionCode: 'physical.main.receive.receive'
  },
  CONFIRMER: {
    businessType: 'PERIODIC',
    nodeCode: 'confirmer_confirm',
    operationCode: 'APPROVE_REJECT',
    permissionCode: 'periodic.main.confirmer_confirm.approve_reject'
  }
}

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

const previewRoleCode = ref('')
const previewUnitId = ref<string>()
const previewSubject = ref<string>()
const previewCommonScope = ref<WorkScopeCommonScopeCode>()
const previewLoading = ref(false)
const previewRows = ref<WorkScopeCandidateVO[]>([])
const previewError = ref('')
const previewExecuted = ref(false)

let loadSerial = 0

const userRoleCodes = computed(() => {
  const record = props.user
  if (!record) return [] as string[]
  if (Array.isArray(record.roles) && record.roles.length) {
    return record.roles.filter(Boolean)
  }
  return String(record.role || '').split(',').map((item) => item.trim()).filter(Boolean)
})

function roleLabel(roleCode: string) {
  const role = props.roles.find((item) => item.roleCode === roleCode)
  return role?.roleName || roleCode
}

/** 可配置角色取“用户已具备角色 ∩ 封闭角色策略目录”。 */
const configurableRoleOptions = computed(() => userRoleCodes.value
  .map((roleCode) => resolveRoleFormCapabilities(roleCode))
  .filter((capabilities) => capabilities.configurable)
  .map((capabilities) => ({
    label: roleLabel(capabilities.roleCode),
    value: capabilities.roleCode
  })))

const readonlyRoleNotes = computed(() => userRoleCodes.value
  .map((roleCode) => resolveRoleFormCapabilities(roleCode))
  .filter((capabilities) => !capabilities.configurable
    && READONLY_ROLE_DESCRIPTIONS[capabilities.roleCode])
  .map((capabilities) => ({
    roleCode: capabilities.roleCode,
    roleName: roleLabel(capabilities.roleCode),
    description: READONLY_ROLE_DESCRIPTIONS[capabilities.roleCode]
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

function resetPreview() {
  previewRoleCode.value = ''
  previewUnitId.value = undefined
  previewSubject.value = undefined
  previewCommonScope.value = undefined
  previewRows.value = []
  previewError.value = ''
  previewExecuted.value = false
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
    resetPreview()
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

async function handlePreview() {
  previewError.value = ''
  previewExecuted.value = false
  previewRows.value = []
  const operation = PREVIEW_OPERATIONS[previewRoleCode.value]
  const capabilities = resolveRoleFormCapabilities(previewRoleCode.value)
  if (!operation || !capabilities.configurable) {
    previewError.value = '请选择可配置角色'
    return
  }
  if (!previewUnitId.value) {
    previewError.value = 'WORK_SCOPE_UNIT_REQUIRED'
    return
  }
  if (capabilities.subjectRequired && !previewSubject.value) {
    previewError.value = 'WORK_SCOPE_SUBJECT_REQUIRED'
    return
  }
  if (capabilities.commonRequired && !previewCommonScope.value) {
    previewError.value = 'WORK_SCOPE_EXTERNAL_COMMON_REQUIRED'
    return
  }
  previewLoading.value = true
  try {
    previewRows.value = await previewWorkScopeCandidates({
      ...operation,
      requiredRoleCode: capabilities.roleCode,
      routingContext: {
        unitId: previewUnitId.value,
        subjectSubcategory: capabilities.fixedSubjectSubcategory
          || previewSubject.value
          || null,
        verificationMethod: capabilities.fixedVerificationMethod,
        commonScope: capabilities.fixedCommonScope || previewCommonScope.value || null
      }
    })
    previewExecuted.value = true
  } catch (error) {
    previewError.value = workScopeErrorMessage(error, '候选预览失败')
  } finally {
    previewLoading.value = false
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
    if (open) loadMatrix()
    else loadSerial += 1
  },
  { immediate: true }
)
</script>

<template>
  <a-modal
    :open="open"
    wrap-class-name="permission-config-modal"
    width="min(980px, calc(100vw - 32px))"
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
          <span v-if="homeUnitName">主单位：{{ homeUnitName }}（{{ homeUnitId }}）</span>
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

          <div v-if="readonlyRoleNotes.length" class="readonly-notes">
            <a-tag v-for="note in readonlyRoleNotes" :key="note.roleCode">
              {{ note.roleName }}：{{ note.description }}
            </a-tag>
          </div>
        </section>

        <section class="preview-panel">
          <header class="panel-heading">
            <div>
              <h3>候选预览</h3>
              <p>选择单位、学科小类、检定方式和通用性，查看统一候选解析的最终候选人。</p>
            </div>
          </header>
          <div class="preview-form">
            <a-select
              v-model:value="previewRoleCode"
              :options="configurableRoleOptions"
              placeholder="角色"
              class="preview-field"
            />
            <a-select
              v-model:value="previewUnitId"
              :options="unitOptions"
              show-search
              option-filter-prop="label"
              placeholder="单位"
              class="preview-field"
            />
            <a-select
              v-if="resolveRoleFormCapabilities(previewRoleCode).subjectRequired"
              v-model:value="previewSubject"
              :options="subjectOptions"
              show-search
              option-filter-prop="label"
              placeholder="学科小类"
              class="preview-field"
            />
            <a-select
              v-if="resolveRoleFormCapabilities(previewRoleCode).commonRequired"
              v-model:value="previewCommonScope"
              :options="COMMON_SCOPE_OPTIONS"
              placeholder="通用性"
              class="preview-field"
            />
            <a-button :loading="previewLoading" @click="handlePreview">预览候选人</a-button>
          </div>
          <a-alert v-if="previewError" type="error" show-icon :message="previewError" />
          <a-table
            v-else
            row-key="userId"
            size="small"
            :data-source="previewRows"
            :pagination="false"
            :scroll="{ y: 180 }"
          >
            <a-table-column title="工号" data-index="userId" />
            <a-table-column title="姓名" data-index="userName" />
            <a-table-column title="命中说明" data-index="matchReason" />
            <template #emptyText>
              <a-empty
                image="simple"
                :description="previewExecuted ? '当前条件下无候选人' : '选择条件后点击预览'"
              />
            </template>
          </a-table>
        </section>
      </div>
    </a-spin>

    <footer class="dialog-footer">
      <div class="change-summary">
        <span>保存时整组校验并事务替换，版本冲突会返回 HTTP 409。</span>
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
.change-summary > span {
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

.rule-panel,
.preview-panel {
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

.rule-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
  gap: 12px 16px;
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
  margin-top: 12px;
}

.readonly-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #edf0f5;
}

.preview-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.preview-field {
  min-width: 180px;
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

@media (max-width: 760px) {
  .rule-form {
    grid-template-columns: 1fr;
  }

  .dialog-footer,
  .panel-heading {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
