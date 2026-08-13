import assert from 'node:assert/strict'

import {
  buildWorkScopeMatrixRequest,
  diffWorkScopeEntries,
  entryKey,
  expandWorkScopeSelections,
  isMatrixVersionConflict,
  normalizeWorkScopeEntries,
  resolveRoleFormCapabilities,
  sortWorkScopeEntries,
  validateWorkScopeDraft,
  workScopeErrorMessage
} from '../src/views/system/workScopeModel.ts'

// 角色表单能力：管理员只配置单位，自检加学科小类，外委再加通用性，确认员为单位加学科。
assert.deepEqual(resolveRoleFormCapabilities('MEASURE_ADMIN'), {
  roleCode: 'MEASURE_ADMIN',
  configurable: true,
  subjectRequired: false,
  commonRequired: false,
  fixedSubjectSubcategory: 'ALL',
  fixedVerificationMethod: 'NOT_APPLICABLE',
  fixedCommonScope: 'NOT_APPLICABLE'
})
assert.deepEqual(resolveRoleFormCapabilities('VERIFIER_SELF'), {
  roleCode: 'VERIFIER_SELF',
  configurable: true,
  subjectRequired: true,
  commonRequired: false,
  fixedSubjectSubcategory: null,
  fixedVerificationMethod: 'self',
  fixedCommonScope: 'NOT_APPLICABLE'
})
assert.deepEqual(resolveRoleFormCapabilities('verifier_external'), {
  roleCode: 'VERIFIER_EXTERNAL',
  configurable: true,
  subjectRequired: true,
  commonRequired: true,
  fixedSubjectSubcategory: null,
  fixedVerificationMethod: 'send_out',
  fixedCommonScope: null
})
assert.deepEqual(resolveRoleFormCapabilities('CONFIRMER'), {
  roleCode: 'CONFIRMER',
  configurable: true,
  subjectRequired: true,
  commonRequired: false,
  fixedSubjectSubcategory: null,
  fixedVerificationMethod: 'NOT_APPLICABLE',
  fixedCommonScope: 'NOT_APPLICABLE'
})
// 主管领导、计量领导、责任工程师、计划员、供应商、外扩人员不可在矩阵中配置。
for (const roleCode of [
  'DEPT_LEADER',
  'MEASURE_LEADER',
  'RESPONSIBLE_ENGINEER',
  'PLANNER',
  'SUPPLIER',
  'EXTERNAL_OPERATOR'
]) {
  assert.equal(resolveRoleFormCapabilities(roleCode).configurable, false, roleCode)
}

// 管理员多单位展开：每个单位一条可审计规则，学科与检定维度固定。
const adminRows = expandWorkScopeSelections({
  roleCode: 'MEASURE_ADMIN',
  unitIds: ['G10030500', 'G50169058']
})
assert.deepEqual(adminRows, [
  {
    roleCode: 'MEASURE_ADMIN',
    unitId: 'G10030500',
    subjectSubcategory: 'ALL',
    verificationMethod: 'NOT_APPLICABLE',
    commonScope: 'NOT_APPLICABLE'
  },
  {
    roleCode: 'MEASURE_ADMIN',
    unitId: 'G50169058',
    subjectSubcategory: 'ALL',
    verificationMethod: 'NOT_APPLICABLE',
    commonScope: 'NOT_APPLICABLE'
  }
])

// 自检：单位 × 学科小类展开为可审计行，通用性输入被忽略并固定为 NOT_APPLICABLE。
const selfRows = expandWorkScopeSelections({
  roleCode: 'VERIFIER_SELF',
  unitIds: ['G10030500'],
  subjectSubcategories: ['050102', '041400'],
  commonScopes: ['COMMON']
})
assert.deepEqual(selfRows.map((row) => entryKey(row)), [
  'VERIFIER_SELF|G10030500|041400|self|NOT_APPLICABLE',
  'VERIFIER_SELF|G10030500|050102|self|NOT_APPLICABLE'
])

// 外委：通用性必选，未选择时展开拒绝。
assert.throws(() => expandWorkScopeSelections({
  roleCode: 'VERIFIER_EXTERNAL',
  unitIds: ['G10030500'],
  subjectSubcategories: ['041400'],
  commonScopes: []
}), /WORK_SCOPE_EXTERNAL_COMMON_REQUIRED/)
const externalRows = expandWorkScopeSelections({
  roleCode: 'VERIFIER_EXTERNAL',
  unitIds: ['G10030500', 'G50169058'],
  subjectSubcategories: ['041400'],
  commonScopes: ['COMMON', 'NON_COMMON']
})
assert.equal(externalRows.length, 4)
assert.ok(externalRows.every((row) => row.verificationMethod === 'send_out'))

// 同一精确规则可以配置给多人；单人员矩阵内重复行必须去重。
const deduped = normalizeWorkScopeEntries([
  ...adminRows,
  { ...adminRows[0] },
  { ...adminRows[1], unitName: '冗余展示字段' }
])
assert.equal(deduped.length, 2)
assert.deepEqual(deduped.map((row) => row.unitId), ['G10030500', 'G50169058'])

// 标准化：角色大写、单位修剪、稳定排序（角色、单位、学科、通用性）。
const sorted = sortWorkScopeEntries([
  {
    roleCode: 'verifier_self',
    unitId: 'G10030500',
    subjectSubcategory: '050102',
    verificationMethod: 'self',
    commonScope: 'NOT_APPLICABLE'
  },
  ...adminRows
])
assert.deepEqual(sorted.map((row) => entryKey(row)), [
  'MEASURE_ADMIN|G10030500|ALL|NOT_APPLICABLE|NOT_APPLICABLE',
  'MEASURE_ADMIN|G50169058|ALL|NOT_APPLICABLE|NOT_APPLICABLE',
  'VERIFIER_SELF|G10030500|050102|self|NOT_APPLICABLE'
])

// 差异：新增、撤销、保留按完整规则键计算。
const diff = diffWorkScopeEntries(deduped, [
  deduped[0],
  {
    roleCode: 'VERIFIER_SELF',
    unitId: 'G10030500',
    subjectSubcategory: '041400',
    verificationMethod: 'self',
    commonScope: 'NOT_APPLICABLE'
  }
])
assert.equal(diff.added.length, 1)
assert.equal(diff.removed.length, 1)
assert.equal(diff.retained.length, 1)
assert.equal(diff.added[0].roleCode, 'VERIFIER_SELF')
assert.equal(diff.removed[0].unitId, 'G50169058')

// 提交请求携带读取时的矩阵版本。
const request = buildWorkScopeMatrixRequest(deduped, 'v-hash-1')
assert.equal(request.matrixVersion, 'v-hash-1')
assert.equal(request.entries.length, 2)
assert.deepEqual(request.entries[0], {
  roleCode: 'MEASURE_ADMIN',
  unitId: 'G10030500',
  subjectSubcategory: 'ALL',
  verificationMethod: 'NOT_APPLICABLE',
  commonScope: 'NOT_APPLICABLE'
})

// 矩阵版本冲突：仅 HTTP 409 识别为并发冲突。
assert.equal(isMatrixVersionConflict({ response: { status: 409 } }), true)
assert.equal(isMatrixVersionConflict({ response: { status: 400 } }), false)
assert.equal(isMatrixVersionConflict(new Error('network')), false)

// 服务端错误原样显示，不做本地改写。
assert.equal(
  workScopeErrorMessage(
    { response: { data: { message: 'WORK_SCOPE_MATRIX_VERSION_CONFLICT' } } },
    '保存失败'
  ),
  'WORK_SCOPE_MATRIX_VERSION_CONFLICT'
)
assert.equal(workScopeErrorMessage(new Error('boom'), '保存失败'), 'boom')
assert.equal(workScopeErrorMessage(null, '保存失败'), '保存失败')

// 草稿校验：缺单位、非法学科、非法组合在提交前拦截。
assert.deepEqual(validateWorkScopeDraft([
  {
    roleCode: 'VERIFIER_SELF',
    unitId: '',
    subjectSubcategory: '041400',
    verificationMethod: 'self',
    commonScope: 'NOT_APPLICABLE'
  }
]), ['WORK_SCOPE_UNIT_REQUIRED'])
assert.deepEqual(validateWorkScopeDraft([
  {
    roleCode: 'VERIFIER_SELF',
    unitId: 'G10030500',
    subjectSubcategory: '卡尺',
    verificationMethod: 'self',
    commonScope: 'NOT_APPLICABLE'
  }
]), ['WORK_SCOPE_SUBJECT_INVALID: 卡尺'])
assert.deepEqual(validateWorkScopeDraft([
  {
    roleCode: 'VERIFIER_EXTERNAL',
    unitId: 'G10030500',
    subjectSubcategory: '041400',
    verificationMethod: 'send_out',
    commonScope: 'NOT_APPLICABLE'
  }
]), ['WORK_SCOPE_EXTERNAL_COMMON_REQUIRED'])
assert.deepEqual(validateWorkScopeDraft([
  {
    roleCode: 'DEPT_LEADER',
    unitId: 'G10030500',
    subjectSubcategory: 'ALL',
    verificationMethod: 'NOT_APPLICABLE',
    commonScope: 'NOT_APPLICABLE'
  }
]), ['WORK_SCOPE_ROLE_NOT_CONFIGURABLE: DEPT_LEADER'])
assert.deepEqual(validateWorkScopeDraft(adminRows), [])

console.log('work scope model contract tests passed')
