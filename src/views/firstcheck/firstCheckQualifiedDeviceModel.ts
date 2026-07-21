import type { AttachmentId } from '@/types/firstcheck'

export interface QualifiedFirstCheckDeviceRow {
  key: string
  index: number
  deviceCode: string
  factoryCode: string
  factoryDate: string
  verificationDate: string
  validUntil: string
  certificateAttachmentGroupId?: AttachmentId
}

function formatDate(value: Date) {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function calculateQualifiedDeviceValidUntil(
  verificationDate: string,
  confirmInterval?: string,
  verificationCycleMonth?: number
) {
  if (!verificationDate || confirmInterval === '一次检定') return ''
  if (!verificationCycleMonth || verificationCycleMonth <= 0) return ''

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(verificationDate)
  if (!match) return ''
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const absoluteMonth = monthIndex + verificationCycleMonth
  const targetYear = year + Math.floor(absoluteMonth / 12)
  const targetMonth = ((absoluteMonth % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const result = new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)))
  result.setUTCDate(result.getUTCDate() - 1)
  return formatDate(result)
}

function createQualifiedDeviceRow(
  index: number,
  defaultVerificationDate: string,
  confirmInterval?: string,
  verificationCycleMonth?: number
): QualifiedFirstCheckDeviceRow {
  return {
    key: `qualified-device-${index}`,
    index,
    deviceCode: '',
    factoryCode: '',
    factoryDate: '',
    verificationDate: defaultVerificationDate,
    validUntil: calculateQualifiedDeviceValidUntil(
      defaultVerificationDate,
      confirmInterval,
      verificationCycleMonth
    )
  }
}

export function resizeQualifiedDeviceRows(
  rows: QualifiedFirstCheckDeviceRow[],
  quantity: number,
  defaultVerificationDate: string,
  confirmInterval?: string,
  verificationCycleMonth?: number
) {
  const size = Math.max(0, Math.floor(Number(quantity) || 0))
  return Array.from({ length: size }, (_, offset) => {
    const index = offset + 1
    const current = rows[offset]
    if (!current) {
      return createQualifiedDeviceRow(
        index,
        defaultVerificationDate,
        confirmInterval,
        verificationCycleMonth
      )
    }
    return {
      ...current,
      index,
      key: current.key || `qualified-device-${index}`,
      validUntil: calculateQualifiedDeviceValidUntil(
        current.verificationDate,
        confirmInterval,
        verificationCycleMonth
      )
    }
  })
}

export function recalculateQualifiedDeviceValidity(
  rows: QualifiedFirstCheckDeviceRow[],
  confirmInterval?: string,
  verificationCycleMonth?: number
) {
  return rows.map((row) => ({
    ...row,
    validUntil: calculateQualifiedDeviceValidUntil(
      row.verificationDate,
      confirmInterval,
      verificationCycleMonth
    )
  }))
}

export function applyDeviceCodeReservation(
  rows: QualifiedFirstCheckDeviceRow[],
  deviceCodes: string[]
) {
  if (rows.length !== deviceCodes.length) {
    throw new Error('预留编号数量与合格设备数量不一致')
  }
  return rows.map((row, index) => ({ ...row, deviceCode: deviceCodes[index] || '' }))
}

export function invalidateDeviceCodeReservation(rows: QualifiedFirstCheckDeviceRow[]) {
  return rows.map((row) => ({ ...row, deviceCode: '' }))
}

