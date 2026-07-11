import type {
  ProductSupportDisplayRow,
  ProductSupportOrderVO,
  ProductSupportRatioVO,
  ProductSupportSummary
} from '@/types/productSupport'

export type ProductSupportTagColor = 'blue' | 'orange' | 'green' | 'red'

export function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export function formatDate(value: unknown, length = 10) {
  const text = display(value)
  if (text === '-') return text
  return text.replace('T', ' ').slice(0, length)
}

export function toNumber(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

export function formatMoney(value: unknown) {
  return `¥ ${toNumber(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function productSupportNodeName(value?: string) {
  const map: Record<string, string> = {
    verifier_verify: '检定员填写检定信息',
    completed: '已完成'
  }
  return value ? map[value] || value : '-'
}

export function productSupportStatusName(value?: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    completed: '已完成'
  }
  return value ? map[value] || value : '-'
}

export function productSupportTagColor(value?: string): ProductSupportTagColor {
  const text = String(value || '').toLowerCase()
  if (text === 'completed') return 'green'
  if (text === 'cancelled' || text === 'rejected') return 'red'
  if (text === 'pending' || text === 'verifier_verify') return 'orange'
  return 'blue'
}

export function sumRatioSampleQuantity(ratios?: ProductSupportRatioVO[]) {
  return (ratios || []).reduce((sum, item) => sum + toNumber(item.sampleQuantity), 0)
}

export function sumRatioAmount(ratios?: ProductSupportRatioVO[]) {
  return (ratios || []).reduce((sum, item) => sum + toNumber(item.totalAmount), 0)
}

export function mapProductSupportOrderRow(order: ProductSupportOrderVO): ProductSupportDisplayRow {
  const primaryRatio = order.ratios?.[0]
  const primaryItem = order.items?.[0]
  return {
    orderId: order.id,
    orderNo: display(order.orderNo),
    contractNo: display(order.contractNo),
    projectNo: display(order.projectNo),
    projectType: display(order.projectType),
    inspectionDate: formatDate(order.inspectionDate),
    supplierName: display(order.supplierName),
    applyDeptName: display(order.applyDeptName),
    currentNode: display(order.currentNode),
    currentNodeName: display(order.currentNodeName || productSupportNodeName(order.currentNode)),
    orderStatus: display(order.orderStatus),
    orderStatusName: display(order.orderStatusName || productSupportStatusName(order.orderStatus)),
    primaryName: display(primaryRatio?.name || primaryItem?.name),
    primaryModelSpec: display(primaryItem?.modelSpec),
    sampleQuantity: sumRatioSampleQuantity(order.ratios),
    ratioCount: order.ratioCount ?? order.ratios?.length ?? 0,
    itemCount: order.itemCount ?? order.items?.length ?? 0,
    verifierName: display(order.verifierName),
    amount: sumRatioAmount(order.ratios)
  }
}

export function buildProductSupportSummary(orders: ProductSupportOrderVO[]): ProductSupportSummary {
  return orders.reduce<ProductSupportSummary>(
    (summary, order) => {
      summary.total += 1
      summary.pending += order.orderStatus === 'completed' ? 0 : 1
      summary.completed += order.orderStatus === 'completed' ? 1 : 0
      summary.itemCount += order.itemCount ?? order.items?.length ?? 0
      summary.ratioCount += order.ratioCount ?? order.ratios?.length ?? 0
      summary.amount += sumRatioAmount(order.ratios)
      return summary
    },
    { total: 0, pending: 0, completed: 0, itemCount: 0, ratioCount: 0, amount: 0 }
  )
}

export function defaultRatioRows() {
  return [
    { name: '转子类', contractQuantity: 50, sampleQuantity: 10, remark: '20%' },
    { name: '结构件类', contractQuantity: 95, sampleQuantity: 19, remark: '20%' },
    { name: '附件类', contractQuantity: 20, sampleQuantity: 4, remark: '20%' }
  ]
}

export function defaultItemRows() {
  return [
    { name: '转子组件', materialCode: 'WL-2026-ROT-001', modelSpec: 'ROT-5000-A-01', quantity: 10 },
    { name: '定子铁芯', materialCode: 'WL-2026-STA-002', modelSpec: 'STA-8000-B-02', quantity: 6 },
    { name: '轴承座总成', materialCode: 'WL-2026-BRG-003', modelSpec: 'BRG-3000-C-01', quantity: 8 },
    { name: '端盖部件', materialCode: 'WL-2026-END-004', modelSpec: 'END-2000-A-03', quantity: 5 },
    { name: '冷却器组件', materialCode: 'WL-2026-CLR-005', modelSpec: 'CLR-4000-B-01', quantity: 4 }
  ]
}
