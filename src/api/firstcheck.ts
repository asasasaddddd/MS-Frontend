import { request } from '@/api/request'
import type {
  ApproveRequest,
  AssignCodeRequest,
  BatchAssignCodesRequest,
  BatchDeptLeaderApproveRequest,
  BatchOperationResult,
  ConfirmCategoryRequest,
  ConfirmCheckRequest,
  ConfirmVerificationTypeRequest,
  DeviceCodePreview,
  FirstCheckOrder,
  StartFirstCheckRequest,
  VerifierVerifyRequest
} from '@/types/firstcheck'

export function startFirstCheck(data: StartFirstCheckRequest) {
  return request<number>({
    url: '/firstcheck/start',
    method: 'POST',
    data
  })
}

export function getFirstCheckDetail(orderId: number) {
  return request<FirstCheckOrder>({
    url: `/firstcheck/detail/${orderId}`,
    method: 'GET'
  })
}

export function getMyFirstCheckTasks(status?: string) {
  return request<FirstCheckOrder[]>({
    url: '/firstcheck/my-tasks',
    method: 'GET',
    params: { status }
  })
}

export function confirmCategoryFirstCheck(data: ConfirmCategoryRequest) {
  return request<void>({
    url: '/firstcheck/confirm-category',
    method: 'POST',
    data
  })
}

export function managerForwardFirstCheck(data: ApproveRequest) {
  return request<void>({
    url: '/firstcheck/manager-forward',
    method: 'POST',
    data
  })
}

export function deptLeaderApproveFirstCheck(data: ApproveRequest) {
  return request<void>({
    url: '/firstcheck/dept-leader-approve',
    method: 'POST',
    data
  })
}

export function deptLeaderRejectFirstCheck(data: ApproveRequest) {
  return request<void>({
    url: '/firstcheck/dept-leader-reject',
    method: 'POST',
    data
  })
}

export function batchDeptLeaderApproveFirstCheck(data: BatchDeptLeaderApproveRequest) {
  return request<BatchOperationResult>({
    url: '/firstcheck/batch-dept-leader-approve',
    method: 'POST',
    data
  })
}

export function engineerConfirmTypeFirstCheck(data: ConfirmVerificationTypeRequest) {
  return request<void>({
    url: '/firstcheck/engineer-confirm-type',
    method: 'POST',
    data
  })
}

export function verifierVerifyFirstCheck(data: VerifierVerifyRequest) {
  return request<void>({
    url: '/firstcheck/verifier-verify',
    method: 'POST',
    data
  })
}

export function confirmerConfirmFirstCheck(data: ConfirmCheckRequest) {
  return request<void>({
    url: '/firstcheck/confirmer-confirm',
    method: 'POST',
    data
  })
}

export function previewDeviceCodesFirstCheck(orderId: number) {
  return request<DeviceCodePreview[]>({
    url: `/firstcheck/preview-device-codes/${orderId}`,
    method: 'GET'
  })
}

export function assignCodeFirstCheck(data: AssignCodeRequest) {
  return request<void>({
    url: '/firstcheck/assign-code',
    method: 'POST',
    data
  })
}

export function batchAssignCodesFirstCheck(data: BatchAssignCodesRequest) {
  return request<void>({
    url: '/firstcheck/batch-assign-codes',
    method: 'POST',
    data
  })
}
