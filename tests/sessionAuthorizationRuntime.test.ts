import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

const moduleUrl = new URL('../src/auth/sessionAuthorization.ts', import.meta.url)
assert.equal(
  existsSync(moduleUrl),
  true,
  '缺少服务端有效角色与本地会话的对齐实现',
)

const { reconcileAuthorizedSessionUser } = await import(moduleUrl.href)

const currentUser = {
  token: 'token-1',
  employeeId: 'U03016119',
  employeeName: '王熙然',
  roleCode: 'SUPPLIER',
  roleName: '采购供应商',
  roles: ['MEASURE_ADMIN', 'SUPPLIER', 'EXTERNAL_OPERATOR'],
  deptId: 'D1',
  deptName: '数智部',
  groupId: 'G1',
  groupName: '软件组',
  homePath: '/todo',
}

const refreshed = reconcileAuthorizedSessionUser(currentUser, {
  userId: 'U03016119',
  employeeId: 'U03016119',
  employeeName: '王熙然',
  role: 'MEASURE_ADMIN',
  roles: ['MEASURE_ADMIN', 'VERIFIER_SELF', 'VERIFIER_EXTERNAL'],
  deptId: 'D1',
  deptName: '数智部',
  groupId: 'G1',
  groupName: '软件组',
})

assert.deepEqual(refreshed.roles, ['MEASURE_ADMIN', 'VERIFIER_SELF', 'VERIFIER_EXTERNAL'])
assert.equal(refreshed.roleCode, 'MEASURE_ADMIN')
assert.equal(refreshed.roleName, 'MEASURE_ADMIN')
assert.equal(refreshed.token, 'token-1')
assert.equal(refreshed.deptName, '数智部')
assert.equal(refreshed.groupName, '软件组')

const preservedRole = reconcileAuthorizedSessionUser(
  { ...currentUser, roleCode: 'VERIFIER_SELF', roleName: '自检检定员' },
  {
    userId: 'U03016119',
    employeeId: 'U03016119',
    employeeName: '王熙然',
    role: 'MEASURE_ADMIN',
    roles: ['MEASURE_ADMIN', 'VERIFIER_SELF'],
    deptId: 'D1',
    deptName: '数智部',
    groupId: 'G1',
    groupName: '软件组',
  },
)

assert.equal(preservedRole.roleCode, 'VERIFIER_SELF')

assert.throws(
  () => reconcileAuthorizedSessionUser(currentUser, {
    userId: 'U03016119',
    employeeId: 'U03016119',
    employeeName: '王熙然',
    role: '',
    roles: [],
  }),
  /当前账号暂无有效角色/,
)
assert.equal(preservedRole.roleName, '自检检定员')
