import assert from 'node:assert/strict'

import {
  mapProductSupportOrderRow,
  productSupportNodeName,
  productSupportStatusName,
  sumRatioAmount
} from '../src/views/product-support/productSupportDisplayModel.ts'

const order = {
  id: '2075000000000000001',
  orderNo: 'CP20260707001',
  contractNo: 'HT-2026-00458',
  projectNo: 'XM-2026-00123',
  projectType: '出口',
  inspectionDate: '2026-06-15',
  supplierName: '重工机械制造有限公司',
  applyDeptName: '质量管理部',
  currentNode: 'verifier_verify',
  orderStatus: 'pending',
  ratioCount: 2,
  itemCount: 3,
  ratios: [
    { id: '1', name: '转子类', contractQuantity: 50, sampleQuantity: 10, unitPrice: 180, totalAmount: 1800 },
    { id: '2', name: '结构件类', contractQuantity: 95, sampleQuantity: 19, unitPrice: 120, totalAmount: 2280 }
  ],
  items: [{ id: '11', name: '转子组件', materialCode: 'WL-2026-ROT-001', modelSpec: 'ROT-5000-A-01', quantity: 10 }]
}

assert.equal(productSupportNodeName('verifier_verify'), '检定员填写检定信息')
assert.equal(productSupportNodeName('completed'), '已完成')
assert.equal(productSupportStatusName('pending'), '待处理')
assert.equal(productSupportStatusName('completed'), '已完成')

const row = mapProductSupportOrderRow(order)
assert.equal(row.orderId, '2075000000000000001')
assert.equal(row.contractNo, 'HT-2026-00458')
assert.equal(row.projectNo, 'XM-2026-00123')
assert.equal(row.currentNodeName, '检定员填写检定信息')
assert.equal(row.orderStatusName, '待处理')
assert.equal(row.primaryName, '转子类')
assert.equal(row.sampleQuantity, 29)
assert.equal(row.ratioCount, 2)
assert.equal(row.itemCount, 3)

assert.equal(sumRatioAmount(order.ratios), 4080)
