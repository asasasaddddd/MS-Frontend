import type {
  UserWorkScopeEntry,
  UserWorkScopeMatrixRequest,
  WorkScopeCommonScopeCode,
  WorkScopeRolePolicyVO,
  WorkScopeVerificationMethod
} from '@/types/nodePermission'

/** 角色表单能力：决定弹窗中每个角色可配置哪些维度以及固定值。 */
export interface RoleFormCapabilities {
  roleCode: string
  configurable: boolean
  subjectRequired: boolean
  commonRequired: boolean
  fixedSubjectSubcategory: string | null
  fixedVerificationMethod: WorkScopeVerificationMethod | null
  fixedCommonScope: WorkScopeCommonScopeCode | null
}

/** 作业范围选择输入；多选值在保存前展开为可审计规则行。 */
export interface WorkScopeSelection {
  roleCode: string
  unitIds: string[]
  subjectSubcategories?: string[]
  commonScopes?: WorkScopeCommonScopeCode[]
}

/** 作业范围矩阵差异。 */
export interface WorkScopeDiff {
  added: UserWorkScopeEntry[]
  removed: UserWorkScopeEntry[]
  retained: UserWorkScopeEntry[]
}

/** 封闭角色策略目录，与后端 WorkScopeRolePolicy 一一对应。 */
const ROLE_FORM_CAPABILITY_TABLE: Record<string, RoleFormCapabilities> = {
  MEASURE_ADMIN: {
    roleCode: 'MEASURE_ADMIN',
    configurable: true,
    subjectRequired: false,
    commonRequired: false,
    fixedSubjectSubcategory: 'ALL',
    fixedVerificationMethod: 'NOT_APPLICABLE',
    fixedCommonScope: 'NOT_APPLICABLE'
  },
  VERIFIER_SELF: {
    roleCode: 'VERIFIER_SELF',
    configurable: true,
    subjectRequired: true,
    commonRequired: false,
    fixedSubjectSubcategory: null,
    fixedVerificationMethod: 'self',
    fixedCommonScope: 'NOT_APPLICABLE'
  },
  VERIFIER_EXTERNAL: {
    roleCode: 'VERIFIER_EXTERNAL',
    configurable: true,
    subjectRequired: true,
    commonRequired: true,
    fixedSubjectSubcategory: null,
    fixedVerificationMethod: 'send_out',
    fixedCommonScope: null
  },
  CONFIRMER: {
    roleCode: 'CONFIRMER',
    configurable: true,
    subjectRequired: true,
    commonRequired: false,
    fixedSubjectSubcategory: null,
    fixedVerificationMethod: 'NOT_APPLICABLE',
    fixedCommonScope: 'NOT_APPLICABLE'
  },
  DEPT_LEADER: { roleCode: 'DEPT_LEADER', configurable: false, subjectRequired: false, commonRequired: false, fixedSubjectSubcategory: null, fixedVerificationMethod: null, fixedCommonScope: null },
  MEASURE_LEADER: { roleCode: 'MEASURE_LEADER', configurable: false, subjectRequired: false, commonRequired: false, fixedSubjectSubcategory: null, fixedVerificationMethod: null, fixedCommonScope: null },
  RESPONSIBLE_ENGINEER: { roleCode: 'RESPONSIBLE_ENGINEER', configurable: false, subjectRequired: false, commonRequired: false, fixedSubjectSubcategory: null, fixedVerificationMethod: null, fixedCommonScope: null },
  PLANNER: { roleCode: 'PLANNER', configurable: false, subjectRequired: false, commonRequired: false, fixedSubjectSubcategory: null, fixedVerificationMethod: null, fixedCommonScope: null },
  SUPPLIER: { roleCode: 'SUPPLIER', configurable: false, subjectRequired: false, commonRequired: false, fixedSubjectSubcategory: null, fixedVerificationMethod: null, fixedCommonScope: null },
  EXTERNAL_OPERATOR: { roleCode: 'EXTERNAL_OPERATOR', configurable: false, subjectRequired: false, commonRequired: false, fixedSubjectSubcategory: null, fixedVerificationMethod: null, fixedCommonScope: null }
}

/** 不可配置角色的只读说明。 */
export const READONLY_ROLE_DESCRIPTIONS: Record<string, string> = {
  DEPT_LEADER: '本单位',
  MEASURE_LEADER: '全视角',
  RESPONSIBLE_ENGINEER: '全视角',
  PLANNER: '按角色模板',
  SUPPLIER: '仅发起',
  EXTERNAL_OPERATOR: '共享候选池'
}

function normalizeRoleCode(roleCode: string | null | undefined) {
  return String(roleCode || '').trim().toUpperCase()
}

/**
 * 解析角色表单能力；优先使用后端矩阵返回的策略目录，缺失时回退封闭目录。
 * 入参：roleCode 角色编码，policies 后端返回的角色策略列表（可为空）。
 * 返回：角色表单能力；未知角色返回不可配置能力。
 */
export function resolveRoleFormCapabilities(
  roleCode: string,
  policies?: WorkScopeRolePolicyVO[] | null
): RoleFormCapabilities {
  const normalized = normalizeRoleCode(roleCode)
  const fallback = ROLE_FORM_CAPABILITY_TABLE[normalized]
  const remote = (policies || []).find(
    (policy) => normalizeRoleCode(policy.roleCode) === normalized
  )
  if (!remote) {
    return fallback || {
      roleCode: normalized,
      configurable: false,
      subjectRequired: false,
      commonRequired: false,
      fixedSubjectSubcategory: null,
      fixedVerificationMethod: null,
      fixedCommonScope: null
    }
  }
  return {
    roleCode: normalized,
    configurable: Boolean(remote.configurable),
    subjectRequired: Boolean(remote.subjectRequired),
    commonRequired: Boolean(remote.commonRequired),
    fixedSubjectSubcategory: fallback?.fixedSubjectSubcategory ?? null,
    fixedVerificationMethod: fallback?.fixedVerificationMethod ?? null,
    fixedCommonScope: fallback?.fixedCommonScope ?? null
  }
}

/** 规则完整键：角色、单位、学科小类、检定方式、通用性。 */
export function entryKey(entry: UserWorkScopeEntry) {
  return [
    normalizeRoleCode(entry.roleCode),
    String(entry.unitId || '').trim(),
    String(entry.subjectSubcategory || '').trim(),
    String(entry.verificationMethod || '').trim(),
    String(entry.commonScope || '').trim()
  ].join('|')
}

/**
 * 标准化规则行：大写角色、修剪单位、剥离展示字段，并按完整键去重。
 * 入参：entries 原始规则行。
 * 返回：标准化且去重后的规则行。
 */
export function normalizeWorkScopeEntries(
  entries: UserWorkScopeEntry[]
): UserWorkScopeEntry[] {
  const seen = new Set<string>()
  const result: UserWorkScopeEntry[] = []
  for (const entry of entries || []) {
    if (!entry) continue
    const normalized: UserWorkScopeEntry = {
      roleCode: normalizeRoleCode(entry.roleCode),
      unitId: String(entry.unitId || '').trim(),
      subjectSubcategory: String(entry.subjectSubcategory || '').trim(),
      verificationMethod: String(entry.verificationMethod || '').trim() as WorkScopeVerificationMethod,
      commonScope: String(entry.commonScope || '').trim() as WorkScopeCommonScopeCode
    }
    const key = entryKey(normalized)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }
  return result
}

/** 稳定排序：角色、单位、学科小类、检定方式、通用性。 */
export function sortWorkScopeEntries(
  entries: UserWorkScopeEntry[]
): UserWorkScopeEntry[] {
  return normalizeWorkScopeEntries(entries)
    .sort((left, right) => entryKey(left).localeCompare(entryKey(right)))
}

function requireSelectionValues(values: string[] | undefined, errorCode: string) {
  const normalized = (values || [])
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  if (!normalized.length) {
    throw new Error(errorCode)
  }
  return Array.from(new Set(normalized)).sort((left, right) => left.localeCompare(right))
}

/**
 * 把多选输入展开为可审计的标准规则行。
 * 单位和学科小类的笛卡尔积逐行展开，不隐藏为无法审计的 JSON 条件；
 * 自检行固定 self/NOT_APPLICABLE，外委行必须显式选择通用性。
 * 入参：selection 角色与多选值。
 * 返回：标准化排序后的规则行；非法组合抛出带稳定错误码的异常。
 */
export function expandWorkScopeSelections(
  selection: WorkScopeSelection
): UserWorkScopeEntry[] {
  const capabilities = resolveRoleFormCapabilities(selection.roleCode)
  if (!capabilities.configurable) {
    throw new Error(`WORK_SCOPE_ROLE_NOT_CONFIGURABLE: ${capabilities.roleCode}`)
  }
  const unitIds = requireSelectionValues(selection.unitIds, 'WORK_SCOPE_UNIT_REQUIRED')
  const subjects = capabilities.fixedSubjectSubcategory
    ? [capabilities.fixedSubjectSubcategory]
    : requireSelectionValues(selection.subjectSubcategories, 'WORK_SCOPE_SUBJECT_REQUIRED')
  const commonScopes: WorkScopeCommonScopeCode[] = capabilities.fixedCommonScope
    ? [capabilities.fixedCommonScope]
    : requireSelectionValues(
        selection.commonScopes,
        'WORK_SCOPE_EXTERNAL_COMMON_REQUIRED'
      ) as WorkScopeCommonScopeCode[]
  const verificationMethod = capabilities.fixedVerificationMethod
  if (!verificationMethod) {
    throw new Error(`WORK_SCOPE_METHOD_REQUIRED: ${capabilities.roleCode}`)
  }

  const rows: UserWorkScopeEntry[] = []
  for (const unitId of unitIds) {
    for (const subjectSubcategory of subjects) {
      for (const commonScope of commonScopes) {
        rows.push({
          roleCode: capabilities.roleCode,
          unitId,
          subjectSubcategory,
          verificationMethod,
          commonScope
        })
      }
    }
  }
  return sortWorkScopeEntries(rows)
}

/** 计算草稿相对基线的差异，按完整规则键比较。 */
export function diffWorkScopeEntries(
  baseline: UserWorkScopeEntry[],
  draft: UserWorkScopeEntry[]
): WorkScopeDiff {
  const baselineRows = sortWorkScopeEntries(baseline)
  const draftRows = sortWorkScopeEntries(draft)
  const baselineKeys = new Set(baselineRows.map(entryKey))
  const draftKeys = new Set(draftRows.map(entryKey))
  return {
    added: draftRows.filter((row) => !baselineKeys.has(entryKey(row))),
    removed: baselineRows.filter((row) => !draftKeys.has(entryKey(row))),
    retained: draftRows.filter((row) => baselineKeys.has(entryKey(row)))
  }
}

/**
 * 组装矩阵整组替换请求。
 * 入参：draft 标准化规则行，matrixVersion 读取矩阵时返回的并发版本。
 * 返回：替换请求体。
 */
export function buildWorkScopeMatrixRequest(
  draft: UserWorkScopeEntry[],
  matrixVersion: string
): UserWorkScopeMatrixRequest {
  return {
    matrixVersion: String(matrixVersion || ''),
    entries: sortWorkScopeEntries(draft)
  }
}

/** 仅把 HTTP 409 识别为矩阵版本并发冲突。 */
export function isMatrixVersionConflict(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const response = (error as { response?: { status?: number } }).response
  return response?.status === 409
}

/** 服务端错误原样显示；无服务端消息时回退到本地提示。 */
export function workScopeErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const response = (error as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
    const direct = (error as { message?: string }).message
    if (direct) return direct
  }
  return fallback
}

/**
 * 提交前草稿校验，返回稳定错误码列表；空列表表示可提交。
 * 与后端校验顺序一致：角色可配置性、单位、学科、检定方式、通用性。
 */
export function validateWorkScopeDraft(entries: UserWorkScopeEntry[]): string[] {
  const errors: string[] = []
  for (const entry of normalizeWorkScopeEntries(entries)) {
    const capabilities = resolveRoleFormCapabilities(entry.roleCode)
    if (!capabilities.configurable) {
      errors.push(`WORK_SCOPE_ROLE_NOT_CONFIGURABLE: ${capabilities.roleCode}`)
      continue
    }
    if (!entry.unitId) {
      errors.push('WORK_SCOPE_UNIT_REQUIRED')
      continue
    }
    if (capabilities.fixedSubjectSubcategory) {
      if (entry.subjectSubcategory !== capabilities.fixedSubjectSubcategory
          || entry.verificationMethod !== capabilities.fixedVerificationMethod
          || entry.commonScope !== capabilities.fixedCommonScope) {
        errors.push('WORK_SCOPE_ADMIN_COMBINATION_INVALID')
      }
      continue
    }
    if (!/^\d{6}$/.test(entry.subjectSubcategory)) {
      errors.push(`WORK_SCOPE_SUBJECT_INVALID: ${entry.subjectSubcategory}`)
      continue
    }
    if (entry.verificationMethod !== capabilities.fixedVerificationMethod) {
      errors.push(`WORK_SCOPE_METHOD_INVALID: ${capabilities.roleCode}`)
      continue
    }
    if (capabilities.commonRequired
        && entry.commonScope !== 'COMMON'
        && entry.commonScope !== 'NON_COMMON') {
      errors.push('WORK_SCOPE_EXTERNAL_COMMON_REQUIRED')
      continue
    }
    if (!capabilities.commonRequired && entry.commonScope !== 'NOT_APPLICABLE') {
      errors.push(`WORK_SCOPE_COMMON_NOT_ALLOWED: ${capabilities.roleCode}`)
    }
  }
  return errors
}
