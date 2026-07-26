export type ProductSupportEntityId = string | number

export type ProductSupportNodeCode = 'verifier_verify' | 'completed' | string
export type ProductSupportOrderStatus = 'pending' | 'completed' | string
/** 产品配套单可指定的检定员角色，必须与后端任务授权角色一致。 */
export type ProductSupportVerifierRole = 'VERIFIER_SELF' | 'VERIFIER_EXTERNAL'

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
  /** 必填的目标检定员角色；未指定个人时决定部门待办池归属。 */
  verifierRoleCode: ProductSupportVerifierRole
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
  taskId: ProductSupportEntityId
  rowVersion: ProductSupportEntityId
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
  workflowTaskId?: ProductSupportEntityId
  processInstanceId?: ProductSupportEntityId
  rowVersion?: ProductSupportEntityId
  allowedActions?: string[]
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
  /** 持久化的目标检定员角色；旧记录迁移后始终由后端返回。 */
  verifierRoleCode?: ProductSupportVerifierRole
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
