import type {
  ChangeApproveRequest,
  ChangeRejectRequest,
  ChangeSubmitRequest,
  ChangeVerifierHandleRequest
} from '@/types/change'

const changeEndpoints = {
  submit: '/change/submit',
  approve: '/change/approve',
  reject: '/change/reject',
  verifierHandle: '/change/verifier-handle',
  detail: '/change/detail',
  myOrders: '/change/my-orders'
} as const

export type ChangeEndpointKey = keyof typeof changeEndpoints

export function changeEndpoint(key: ChangeEndpointKey, id?: string | number) {
  if (key === 'detail' && id !== undefined) return `${changeEndpoints.detail}/${id}`
  return changeEndpoints[key]
}

export function changeTypeName(value?: string) {
  const map: Record<string, string> = {
    seal: '封存',
    enable: '启用',
    transfer: '设备转移',
    category: '管理类别调整',
    cycle: '检定周期调整',
    scrap: '非正常报废',
    precheck: '用前检定'
  }
  return value ? map[value] || value : '-'
}

export function changeStatusName(value?: string) {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    processing: '处理中',
    returned: '已退回',
    approved: '已通过',
    completed: '已完成',
    rejected: '已驳回',
    cancelled: '已取消',
    running: '流转中'
  }
  return value ? map[value] || value : '-'
}

export function buildChangeSubmitRequest(input: ChangeSubmitRequest): ChangeSubmitRequest {
  return {
    ...input,
    items: input.items.map((item) => ({ ...item }))
  }
}

/** 构造状态变更审批请求并完整保留统一任务身份。 */
export function buildChangeApproveRequest(input: ChangeApproveRequest): ChangeApproveRequest {
  return { ...input }
}

/** 构造状态变更驳回请求并完整保留统一任务身份。 */
export function buildChangeRejectRequest(input: ChangeRejectRequest): ChangeRejectRequest {
  return { ...input }
}

/** 构造状态变更检定请求并完整保留统一任务身份。 */
export function buildChangeVerifierHandleRequest(
  input: ChangeVerifierHandleRequest
): ChangeVerifierHandleRequest {
  return { ...input }
}
