import { computed, reactive, ref } from 'vue'
import {
  listDictItems,
  productionDictionaryTypes,
  type DictItemVO,
  type ProductionDictionaryType
} from '@/api/dict'

export interface DictionaryOption<T extends string | number = string> {
  label: string
  value: T
}

const typeCodes = Object.values(productionDictionaryTypes)
const itemsByType = reactive<Record<ProductionDictionaryType, DictItemVO[]>>({
  device_usage: [],
  verification_cycle_month: [],
  subject_category: [],
  subject_subcategory: [],
  special_project: []
})
const loading = ref(false)
const loaded = ref(false)
const loadError = ref<Error>()
let loadPromise: Promise<void> | undefined

function itemValue(item: DictItemVO) {
  return item.itemValue || item.itemCode
}

function stringOptions(type: ProductionDictionaryType): DictionaryOption[] {
  return itemsByType[type].map((item) => ({
    label: item.itemName,
    value: itemValue(item)
  }))
}

function categoryCode(value?: string) {
  if (!value) return undefined
  const normalized = value.trim()
  const item = itemsByType.subject_category.find((candidate) => {
    const candidateValue = itemValue(candidate)
    const categoryName = candidate.itemName.split('/')[0]
    return candidate.itemCode === normalized
      || candidateValue === normalized
      || candidate.itemName === normalized
      || categoryName === normalized
      || categoryName.startsWith(normalized)
  })
  return item?.itemCode
}

const deviceUsageOptions = computed(() => stringOptions(productionDictionaryTypes.deviceUsage))
const subjectCategoryOptions = computed(() => stringOptions(productionDictionaryTypes.subjectCategory))
const specialProjectOptions = computed(() => stringOptions(productionDictionaryTypes.specialProject))
const verificationCycleOptions = computed<DictionaryOption<number>[]>(() =>
  itemsByType.verification_cycle_month
    .map((item) => Number(itemValue(item)))
    .filter(Number.isFinite)
    .map((value) => ({ label: String(value), value }))
)
const positiveVerificationCycleOptions = computed(() =>
  verificationCycleOptions.value.filter((option) => option.value > 0)
)

function getSubjectSubcategoryOptions(subjectCategory?: string): DictionaryOption[] {
  const parentCode = categoryCode(subjectCategory)
  if (!parentCode) return []
  return itemsByType.subject_subcategory
    .filter((item) => item.parentItemCode === parentCode)
    .map((item) => ({
      label: `${item.itemName} ${item.itemCode}`,
      value: item.itemCode
    }))
}

async function fetchDictionaries() {
  const results = await Promise.all(typeCodes.map(async (typeCode) => ({
    typeCode,
    items: await listDictItems(typeCode)
  })))
  for (const result of results) {
    itemsByType[result.typeCode] = result.items
  }
  loaded.value = true
  loadError.value = undefined
}

async function loadProductionDictionaries(force = false) {
  if (loaded.value && !force) return
  if (loadPromise && !force) return loadPromise

  loading.value = true
  loadPromise = fetchDictionaries()
    .catch((error) => {
      loaded.value = false
      loadError.value = error instanceof Error ? error : new Error('生产字典加载失败')
      throw loadError.value
    })
    .finally(() => {
      loading.value = false
      loadPromise = undefined
    })
  return loadPromise
}

export function useProductionDictionaries() {
  return {
    loading,
    loaded,
    loadError,
    deviceUsageOptions,
    verificationCycleOptions,
    positiveVerificationCycleOptions,
    subjectCategoryOptions,
    specialProjectOptions,
    getSubjectSubcategoryOptions,
    loadProductionDictionaries
  }
}
