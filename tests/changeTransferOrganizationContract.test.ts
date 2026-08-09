import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import * as changeDisplayModel from '../src/views/change/changeDisplayModel.ts'

const applyDialogSource = readFileSync(
  new URL('../src/views/change/components/ChangeApplyDialog.vue', import.meta.url),
  'utf8'
)

assert.equal(
  typeof (changeDisplayModel as Record<string, unknown>).buildTransferDepartmentOptions,
  'function',
  '状态变更必须通过统一 helper 从允许组织树生成真实部门选项'
)

const buildTransferDepartmentOptions = (
  changeDisplayModel as unknown as {
    buildTransferDepartmentOptions: (input: Array<Record<string, unknown>>) => Array<{ label: string, value: string }>
  }
).buildTransferDepartmentOptions

assert.deepEqual(
  buildTransferDepartmentOptions([
    {
      orgId: 'DEPT-1',
      orgName: '质量检验部',
      orgType: 'DEPARTMENT',
      children: [
        { orgId: 'GROUP-1', orgName: '总装组', orgType: 'GROUP', children: [] }
      ]
    },
    {
      orgId: 'DEPT-2',
      orgName: '电站服务事业部',
      orgType: 'DEPARTMENT',
      children: []
    }
  ]),
  [
    { label: '质量检验部', value: 'DEPT-1' },
    { label: '电站服务事业部', value: 'DEPT-2' }
  ],
  '设备转移只能选择允许范围中的真实部门，不能混入组或显示名称作为编码'
)

assert.match(applyDialogSource, /getAllowedOrganizationTree/)
assert.match(applyDialogSource, /buildTransferDepartmentOptions/)
assert.match(applyDialogSource, /v-model:value="form\.transferToDeptId"/)
assert.match(applyDialogSource, /form\.transferToDeptName\s*=\s*selected\?\.label/)
assert.doesNotMatch(applyDialogSource, /const transferDeptOptions = \[/)
assert.doesNotMatch(applyDialogSource, /transferToDeptId:\s*form\.transferToDeptId\s*\|\|\s*form\.transferToDeptName/)
