import type { CostRecordVO } from '@/types/cost'

export type CostPageMode = 'periodic' | 'product' | 'history'

export interface CostFilterState {
  sourceType: string
  costType: string
  costStatus: string
  deviceCode: string
  keyword: string
  startDate: string
  endDate: string
}

export const costPageTabs: Array<{ key: CostPageMode; label: string; title: string; breadcrumb: string }> = [
  {
    key: 'periodic',
    label: '周检费用管理',
    title: '周检费用填写',
    breadcrumb: '首页 / 设备管理 / 设备费用 / 周检费用管理'
  },
  {
    key: 'product',
    label: '产品配套费用管理',
    title: '产品配套费用管理',
    breadcrumb: '首页 / 设备管理 / 设备费用 / 产品配套费用管理'
  },
  {
    key: 'history',
    label: '费用使用清单',
    title: '费用使用清单',
    breadcrumb: '首页 / 设备管理 / 设备费用 / 费用使用清单'
  }
]

export function costPageTitle(mode: CostPageMode) {
  return costPageTabs.find((item) => item.key === mode)?.title || '费用管理'
}

export function costPageBreadcrumb(mode: CostPageMode) {
  return costPageTabs.find((item) => item.key === mode)?.breadcrumb || '首页 / 设备管理 / 设备费用'
}

export function sourceTypeName(value?: string) {
  const map: Record<string, string> = {
    FIRST_CHECK: '首检费用',
    first_check: '首检费用',
    PERIODIC: '周检费用',
    periodic: '周检费用',
    BEFORE_USE: '用前检定费用',
    CHANGE: '状态变更费用',
    change: '状态变更费用',
    SAMPLING: '抽检费用',
    PRODUCT_SUPPORT: '产品配套费用',
    product_support: '产品配套费用',
    OTHER: '其他费用',
    other: '其他费用'
  }
  return value ? map[value] || value : '-'
}

export function costTypeName(value?: string) {
  const map: Record<string, string> = {
    verification: '检定费用',
    sendout: '外委费用',
    repair: '维修费用',
    purchase: '采购费用',
    other: '其他费用'
  }
  return value ? map[value] || value : '-'
}

export function costStatusName(value?: string) {
  const map: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    cancelled: '已取消'
  }
  return value ? map[value] || value : '-'
}

export function costStatusColor(value?: string) {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'cancelled') return 'red'
  if (normalized === 'confirmed') return 'green'
  return 'orange'
}

export function costKindColor(row: Pick<CostRecordVO, 'sourceType' | 'costType'>) {
  const sourceType = String(row.sourceType || '').toUpperCase()
  const costType = String(row.costType || '').toLowerCase()
  if (sourceType.includes('PRODUCT')) return 'green'
  if (sourceType.includes('CHANGE')) return 'purple'
  if (sourceType.includes('FIRST')) return 'cyan'
  if (costType === 'other' || sourceType === 'OTHER') return 'orange'
  return 'blue'
}

export function amountNumber(value?: string | number) {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount : 0
}

export function rowQuantity(row: CostRecordVO) {
  const value = Number(row.quantity || 1)
  return Number.isFinite(value) && value > 0 ? value : 1
}

export function rowUnitPrice(row: CostRecordVO) {
  if (row.unitPrice !== undefined && row.unitPrice !== null && row.unitPrice !== '') {
    return amountNumber(row.unitPrice)
  }
  return amountNumber(row.amount) / rowQuantity(row)
}

export function formatMoney(value?: string | number, currency = 'CNY') {
  const symbol = currency === 'CNY' || !currency ? '¥' : `${currency} `
  return `${symbol} ${amountNumber(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export function formatDate(value?: string) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 10)
}

export function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export function rowCode(row: CostRecordVO) {
  return display(row.deviceCode || row.costNo || row.sourceId)
}

export function rowName(row: CostRecordVO) {
  return display(row.deviceName || row.sourceName)
}

export function rowAmount(row: Pick<CostRecordVO, 'amount'>) {
  return amountNumber(row.amount)
}

function isSameOrAfter(value: string, startDate: string) {
  return !startDate || value >= startDate
}

function isSameOrBefore(value: string, endDate: string) {
  return !endDate || value <= endDate
}

export function filterCostRows(rows: CostRecordVO[], filters: CostFilterState) {
  const deviceCode = filters.deviceCode.trim()
  const keyword = filters.keyword.trim()
  return rows.filter((row) => {
    const date = formatDate(row.occurredAt)
    const matchesSource = !filters.sourceType || filters.sourceType === 'all' || row.sourceType === filters.sourceType
    const matchesType = !filters.costType || filters.costType === 'all' || row.costType === filters.costType
    const matchesStatus = !filters.costStatus || filters.costStatus === 'all' || row.costStatus === filters.costStatus
    const matchesCode = !deviceCode || [row.deviceCode, row.costNo, row.sourceId].some((value) => display(value).includes(deviceCode))
    const matchesDate = date === '-' || (isSameOrAfter(date, filters.startDate) && isSameOrBefore(date, filters.endDate))
    const matchesKeyword =
      !keyword ||
      [row.costNo, row.sourceName, row.deviceCode, row.deviceName, row.modelSpec, row.deptName, row.remark, row.sourceId]
        .filter(Boolean)
        .some((value) => String(value).includes(keyword))
    return matchesSource && matchesType && matchesStatus && matchesCode && matchesDate && matchesKeyword
  })
}

export function sumCost(rows: CostRecordVO[]) {
  return rows.reduce((sum, row) => sum + rowAmount(row), 0)
}

export function groupCostSummary(rows: CostRecordVO[]) {
  const groups = new Map<string, { label: string; amount: number; count: number }>()
  rows.forEach((row) => {
    const key = row.sourceType || row.costType || 'OTHER'
    const current = groups.get(key) || { label: sourceTypeName(row.sourceType) || costTypeName(row.costType), amount: 0, count: 0 }
    current.amount += rowAmount(row)
    current.count += 1
    groups.set(key, current)
  })
  return Array.from(groups.values())
}

export function buildCostCsv(rows: CostRecordVO[]) {
  const header = ['费用种类', '编号', '名称', '规格型号', '部门/项目', '检定日期', '数量', '单价', '金额', '状态']
  const body = rows.map((row) => [
    sourceTypeName(row.sourceType),
    rowCode(row),
    rowName(row),
    display(row.modelSpec),
    display(row.deptName || row.sourceId),
    formatDate(row.occurredAt),
    String(rowQuantity(row)),
    String(rowUnitPrice(row)),
    String(rowAmount(row)),
    costStatusName(row.costStatus)
  ])
  return [header, ...body].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
}
