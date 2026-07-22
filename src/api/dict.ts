import { request } from '@/api/request'

export const productionDictionaryTypes = {
  deviceUsage: 'device_usage',
  verificationCycleMonth: 'verification_cycle_month',
  subjectCategory: 'subject_category',
  subjectSubcategory: 'subject_subcategory',
  specialProject: 'special_project'
} as const

export type ProductionDictionaryType = typeof productionDictionaryTypes[keyof typeof productionDictionaryTypes]

export interface DictItemVO {
  id: string | number
  dictTypeCode: string
  itemCode: string
  itemName: string
  itemValue?: string
  parentItemCode?: string
  sortNo?: number
  isDefault?: number
  status?: string
  remark?: string
}

export function listDictItems(dictTypeCode: ProductionDictionaryType) {
  return request<DictItemVO[]>({
    url: '/dict/item/listByType',
    method: 'GET',
    params: { dictTypeCode }
  })
}
