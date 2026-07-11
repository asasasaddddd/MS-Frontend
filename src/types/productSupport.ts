export type ProductSupportEntityId = string | number

export type ProductSupportNodeCode = 'verifier_verify' | 'completed' | string
export type ProductSupportOrderStatus = 'pending' | 'completed' | string

export interface ProductSupportRatioRequest {
  name: string
  contractQuantity: number
  sampleQuantity: number
  remark?: string
}

export interface ProductSupportItemRequest {
  name: string
  materialCode: string
  modelSpec?: string
  quantity: number
}

export interface ProductSupportCreateOrderRequest {
  contractNo: string
  projectNo: string
  projectType: string
  inspectionDate: string
  supplierName: string
  applyDeptId?: string
  applyDeptName: string
  verifierId?: string
  verifierName?: string
  ratios: ProductSupportRatioRequest[]
  items: ProductSupportItemRequest[]
  remark?: string
}

export interface ProductSupportRatioResultRequest {
  ratioId: ProductSupportEntityId
  costNo?: string
  qualifiedQuantity: number
  unqualifiedQuantity: number
  unitPrice?: number | string
}

export interface ProductSupportVerifyRequest {
  orderId: ProductSupportEntityId
  verificationDate: string
  attachmentGroupId?: ProductSupportEntityId
  ratioResults: ProductSupportRatioResultRequest[]
  opinion?: string
}

export interface ProductSupportRatioVO {
  id: ProductSupportEntityId
  orderId?: ProductSupportEntityId
  name?: string
  contractQuantity?: number
  sampleQuantity?: number
  costNo?: string
  qualifiedQuantity?: number
  unqualifiedQuantity?: number
  unitPrice?: number | string
  totalAmount?: number | string
  verificationRecordId?: ProductSupportEntityId
  remark?: string
}

export interface ProductSupportItemVO {
  id: ProductSupportEntityId
  orderId?: ProductSupportEntityId
  name?: string
  materialCode?: string
  modelSpec?: string
  quantity?: number
}

export interface ProductSupportOrderVO {
  id: ProductSupportEntityId
  orderNo?: string
  contractNo?: string
  projectNo?: string
  projectType?: string
  inspectionDate?: string
  supplierName?: string
  applyDeptId?: string
  applyDeptName?: string
  applicantId?: string
  applicantName?: string
  verifierId?: string
  verifierName?: string
  currentNode?: ProductSupportNodeCode
  currentNodeName?: string
  orderStatus?: ProductSupportOrderStatus
  orderStatusName?: string
  verificationDate?: string
  attachmentGroupId?: ProductSupportEntityId
  ratioCount?: number
  itemCount?: number
  remark?: string
  ratios?: ProductSupportRatioVO[]
  items?: ProductSupportItemVO[]
}

export interface ProductSupportDisplayRow {
  orderId: ProductSupportEntityId
  orderNo: string
  contractNo: string
  projectNo: string
  projectType: string
  inspectionDate: string
  supplierName: string
  applyDeptName: string
  currentNode: string
  currentNodeName: string
  orderStatus: string
  orderStatusName: string
  primaryName: string
  primaryModelSpec: string
  sampleQuantity: number
  ratioCount: number
  itemCount: number
  verifierName: string
  amount: number
}

export interface ProductSupportSummary {
  total: number
  pending: number
  completed: number
  itemCount: number
  ratioCount: number
  amount: number
}
