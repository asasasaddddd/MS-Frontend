import assert from 'node:assert/strict'

import {
  categoryTargetOptions,
  haveUniformOriginalCategory
} from '../src/views/change/changeDisplayModel.ts'

const categoryA = { id: '1', deviceCode: 'A-1', manageCategory: 'A' }
const categoryA2 = { id: '2', deviceCode: 'A-2', manageCategory: 'A类' }
const categoryB = { id: '3', deviceCode: 'B-1', manageCategory: 'B' }

assert.deepEqual(categoryTargetOptions('A').map((item) => item.value), ['B类', 'C类'])
assert.deepEqual(categoryTargetOptions('B类').map((item) => item.value), ['A类', 'C类'])
assert.deepEqual(categoryTargetOptions('C').map((item) => item.value), ['A类', 'B类'])

assert.equal(haveUniformOriginalCategory([categoryA, categoryA2]), true)
assert.equal(haveUniformOriginalCategory([categoryA, categoryB]), false)
assert.equal(haveUniformOriginalCategory([]), true)
