import type { VerificationResult } from '@/types/firstcheck'

/** 根据合格和不合格数量生成后端必填的首检检定结果。 */
export function deriveVerificationResult(
  qualifiedQuantity: number,
  unqualifiedQuantity: number
): VerificationResult {
  if (qualifiedQuantity > 0 && unqualifiedQuantity > 0) return 'partial'
  if (unqualifiedQuantity > 0) return 'unqualified'
  return 'qualified'
}
