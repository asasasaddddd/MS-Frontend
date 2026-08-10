<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  getUserRoleScopeMatrix,
  replaceUserRoleScopeMatrix
} from '@/api/nodePermission'
import type { SysRoleVO, SysUserVO } from '@/api/system'
import type { AllowedOrganizationNodeVO } from '@/types/nodePermission'
import {
  buildRoleScopeMatrix,
  diffRoleScopeMatrices,
  roleCountForScope,
  rolesForScope,
  toRoleScopeMatrixRequest,
  updateScopeRoles,
  type RoleScopeMatrix
} from '@/views/system/roleScopeMatrixModel'

interface ScopeTreeNode {
  key: string
  title: string
  path: string
  orgType: 'DEPARTMENT' | 'GROUP'
  children?: ScopeTreeNode[]
}

const props = defineProps<{
  open: boolean
  user: SysUserVO | null
  organizationTree: AllowedOrganizationNodeVO[]
  roles: SysRoleVO[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const searchKeyword = ref('')
const selectedScopeOrgId = ref('')
const draftMatrix = ref<RoleScopeMatrix>(new Map())
const baselineMatrix = ref<RoleScopeMatrix>(new Map())
const matrixVersion = ref('')
const activeLegacyNodeGrantCount = ref(0)
let loadSerial = 0

const blockedRoleCodes = new Set(['SUPER_ADMIN', 'SUPPLIER', 'EXTERNAL_OPERATOR'])

const configurableRoles = computed(() => props.roles
  .filter((role) => String(role.status || 'enabled').toLowerCase() !== 'disabled')
  .filter((role) => !blockedRoleCodes.has(role.roleCode.trim().toUpperCase()))
  .sort((left, right) => (left.sortNo ?? 9999) - (right.sortNo ?? 9999)
    || left.roleCode.localeCompare(right.roleCode)))

const roleOptions = computed(() => configurableRoles.value.map((role) => ({
  label: role.roleName || role.roleCode,
  value: role.roleCode
})))

function buildScopeTree(nodes: AllowedOrganizationNodeVO[]): ScopeTreeNode[] {
  return (nodes || []).map((node) => ({
    key: node.orgId,
    title: node.orgName || node.orgId,
    path: node.orgFullPath || node.orgName || node.orgId,
    orgType: node.orgType,
    children: node.children?.length ? buildScopeTree(node.children) : undefined
  }))
}

const fullScopeTree = computed(() => buildScopeTree(props.organizationTree))

function filterScopeTree(nodes: ScopeTreeNode[], keyword: string): ScopeTreeNode[] {
  if (!keyword) return nodes
  const normalized = keyword.toLowerCase()
  const result: ScopeTreeNode[] = []
  for (const node of nodes) {
    const children = filterScopeTree(node.children || [], normalized)
    const matched = `${node.title} ${node.path} ${node.key}`.toLowerCase().includes(normalized)
    if (matched || children.length) result.push({ ...node, children: children.length ? children : undefined })
  }
  return result
}

const scopeTree = computed(() => filterScopeTree(
  fullScopeTree.value,
  searchKeyword.value.trim()
))

function flattenScopeTree(nodes: ScopeTreeNode[], target: ScopeTreeNode[] = []) {
  for (const node of nodes) {
    target.push(node)
    flattenScopeTree(node.children || [], target)
  }
  return target
}

const scopeById = computed(() => new Map(
  flattenScopeTree(fullScopeTree.value).map((node) => [node.key, node])
))

const selectedRoleCodes = computed<string[]>({
  get: () => rolesForScope(draftMatrix.value, selectedScopeOrgId.value),
  set: (roleCodes) => {
    draftMatrix.value = updateScopeRoles(
      draftMatrix.value,
      selectedScopeOrgId.value,
      roleCodes
    )
  }
})

const selectedScope = computed(() => scopeById.value.get(selectedScopeOrgId.value) || null)

const configuredScopes = computed(() => Array.from(draftMatrix.value.keys())
  .sort((left, right) => left.localeCompare(right))
  .map((scopeOrgId) => ({
    scopeOrgId,
    name: scopeById.value.get(scopeOrgId)?.title || scopeOrgId,
    count: roleCountForScope(draftMatrix.value, scopeOrgId)
  })))

const matrixDiff = computed(() => diffRoleScopeMatrices(
  baselineMatrix.value,
  draftMatrix.value
))

function defaultScopeOrgId() {
  const candidates = [props.user?.groupId, props.user?.deptId].filter(Boolean) as string[]
  return candidates.find((orgId) => scopeById.value.has(orgId))
    || flattenScopeTree(fullScopeTree.value)[0]?.key
    || ''
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

async function loadMatrix() {
  const employeeId = props.user?.employeeId
  if (!props.open || !employeeId) return
  const requestId = ++loadSerial
  loading.value = true
  loadError.value = ''
  try {
    const result = await getUserRoleScopeMatrix(employeeId)
    if (requestId !== loadSerial || props.user?.employeeId !== employeeId) return
    const entries = result.entries || []
    draftMatrix.value = buildRoleScopeMatrix(entries)
    baselineMatrix.value = buildRoleScopeMatrix(entries)
    matrixVersion.value = result.matrixVersion || ''
    activeLegacyNodeGrantCount.value = result.activeLegacyNodeGrantCount || 0
    selectedScopeOrgId.value = defaultScopeOrgId()
  } catch (error) {
    if (requestId !== loadSerial) return
    loadError.value = errorMessage(error, '权限配置加载失败')
  } finally {
    if (requestId === loadSerial) loading.value = false
  }
}

function handleTreeSelect(keys: Array<string | number>) {
  const scopeOrgId = keys[0] == null ? '' : String(keys[0])
  if (scopeOrgId) selectedScopeOrgId.value = scopeOrgId
}

async function handleSave() {
  const employeeId = props.user?.employeeId
  if (!employeeId || !matrixVersion.value || loading.value || loadError.value) return
  saving.value = true
  try {
    const result = await replaceUserRoleScopeMatrix(
      employeeId,
      toRoleScopeMatrixRequest(draftMatrix.value, matrixVersion.value)
    )
    const entries = result.entries || []
    draftMatrix.value = buildRoleScopeMatrix(entries)
    baselineMatrix.value = buildRoleScopeMatrix(entries)
    matrixVersion.value = result.matrixVersion || ''
    activeLegacyNodeGrantCount.value = result.activeLegacyNodeGrantCount || 0
    message.success('权限范围和角色配置已保存')
    emit('saved')
  } catch (error) {
    message.error(errorMessage(error, '权限配置保存失败'))
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

      <div v-else class="matrix-layout">
        <section class="scope-panel">
          <header class="panel-heading">
            <div>
              <h3>权限范围</h3>
              <p>选择允许部门或其下属组。部门自动覆盖下属组，组仅覆盖本组。</p>
            </div>
            <a-tag color="blue">已配置 {{ configuredScopes.length }} 个范围</a-tag>
          </header>

          <a-input-search
            v-model:value="searchKeyword"
            allow-clear
            placeholder="搜索部门、组或组织编码"
          />

          <div class="scope-tree-shell">
            <a-tree
              :tree-data="scopeTree"
              :selected-keys="selectedScopeOrgId ? [selectedScopeOrgId] : []"
              :field-names="{ key: 'key', title: 'title', children: 'children' }"
              block-node
              show-line
              @select="handleTreeSelect"
            >
              <template #title="node">
                <span class="scope-node-title">
                  <span>{{ node.title }}</span>
                  <a-tag>{{ node.orgType === 'DEPARTMENT' ? '部门' : '组' }}</a-tag>
                  <a-badge
                    v-if="roleCountForScope(draftMatrix, String(node.key))"
                    :count="roleCountForScope(draftMatrix, String(node.key))"
                    :number-style="{ backgroundColor: '#1677ff' }"
                  />
                </span>
              </template>
            </a-tree>
            <a-empty v-if="!scopeTree.length" image="simple" description="没有匹配的组织" />
          </div>
        </section>

        <section class="role-panel">
          <header class="panel-heading">
            <div>
              <h3>角色配置</h3>
              <p v-if="selectedScope">
                当前范围：{{ selectedScope.title }}（{{ selectedScope.orgType === 'DEPARTMENT' ? '部门及下属组' : '仅本组' }}）
              </p>
              <p v-else>请先在上方选择权限范围。</p>
            </div>
          </header>

          <a-checkbox-group
            v-model:value="selectedRoleCodes"
            :options="roleOptions"
            :disabled="!selectedScopeOrgId"
            class="role-checkbox-grid"
          />

          <a-empty
            v-if="!roleOptions.length"
            image="simple"
            description="暂无可配置角色"
          />

          <div v-if="configuredScopes.length" class="configured-summary">
            <strong>已配置范围</strong>
            <div class="configured-tags">
              <a-tag
                v-for="scope in configuredScopes"
                :key="scope.scopeOrgId"
                color="blue"
                @click="selectedScopeOrgId = scope.scopeOrgId"
              >
                {{ scope.name }} · {{ scope.count }} 个角色
              </a-tag>
            </div>
          </div>

          <a-alert
            v-if="activeLegacyNodeGrantCount"
            type="info"
            show-icon
            :message="`系统保留 ${activeLegacyNodeGrantCount} 条历史高级授权供运行时兼容，本页面不再编辑节点粒度。`"
          />
        </section>
      </div>
    </a-spin>

    <footer class="dialog-footer">
      <div class="change-summary">
        <span>保存时整体校验并事务更新，不会删除历史高级授权。</span>
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

.matrix-layout {
  display: grid;
  gap: 16px;
}

.scope-panel,
.role-panel {
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

.scope-tree-shell {
  min-height: 190px;
  max-height: 280px;
  margin-top: 12px;
  padding: 8px;
  overflow: auto;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fafbfc;
}

.scope-node-title {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 6px;
}

.scope-node-title > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 14px;
  width: 100%;
}

.role-checkbox-grid :deep(.ant-checkbox-wrapper) {
  min-width: 0;
  margin-inline-start: 0;
  padding: 10px 12px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
}

.configured-summary {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #edf0f5;
}

.configured-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.configured-tags :deep(.ant-tag) {
  cursor: pointer;
}

.role-panel :deep(.ant-alert) {
  margin-top: 16px;
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
  .role-checkbox-grid {
    grid-template-columns: 1fr;
  }

  .dialog-footer,
  .panel-heading {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
