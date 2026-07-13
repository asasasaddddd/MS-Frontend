export type LabelRowKey = string

type LabelId = string | number

const verificationMethodLabels: Record<string, string> = {
  self: '自检',
  send_out: '外委'
}

export function labelVerificationMethodName(value?: string) {
  return value ? verificationMethodLabels[value] || '-' : '-'
}

export function labelRowKey(value: LabelId): LabelRowKey {
  return String(value)
}

export function getSelectedLabelRows<T extends { id: LabelId }>(rows: T[], selectedKeys: LabelRowKey[]) {
  const selected = new Set(selectedKeys.map(labelRowKey))
  return rows.filter((row) => selected.has(labelRowKey(row.id)))
}

export function getSelectedLabelRecordIds<T extends { id: LabelId }>(rows: T[], selectedKeys: LabelRowKey[]) {
  return getSelectedLabelRows(rows, selectedKeys).map((row) => row.id)
}
