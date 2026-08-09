import { request } from '@/api/request'
import type {
  ApproveRequest,
  AssignedFirstCheckDevice,
  BatchDeptLeaderApproveRequest,
  BatchOperationResult,
  ConfirmCategoryRequest,
  ConfirmVerificationTypeRequest,
  DeviceCodeReservation,
  DeviceCodeReservationReleaseRequest,
  DeviceCodeReservationRequest,
  FirstCheckOrder,
  StartFirstCheckRequest,
  VerifierVerifyAndAssignRequest
} from '@/types/firstcheck'
import type { EntityId } from '@/types/common'

export function startFirstCheck(data: StartFirstCheckRequest) {
  return request<EntityId>({
    url: '/firstcheck/start',
    method: 'POST',
    data
  })
}

export function getFirstCheckDetail(orderId: EntityId, taskId: EntityId, signal?: AbortSignal) {
  return request<FirstCheckOrder>({
    url: `/firstcheck/detail/${orderId}`,
    method: 'GET',
    params: { taskId },
    signal
  })
}

export function confirmCategoryFirstCheck(data: ConfirmCategoryRequest) {
  return request<void>({
    url: '/firstcheck/confirm-category',
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

export function deptLeaderReturnFirstCheck(data: ApproveRequest) {
  return request<void>({
    url: '/firstcheck/dept-leader-return',
    method: 'POST',
    data
  })
}

export function engineerReturnFirstCheck(data: ApproveRequest) {
  return request<void>({
    url: '/firstcheck/engineer-return',
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

export function reserveDeviceCodesFirstCheck(data: DeviceCodeReservationRequest) {
  return request<DeviceCodeReservation>({
    url: '/firstcheck/device-code-reservations',
    method: 'POST',
    data
  })
}

export function releaseDeviceCodeReservationFirstCheck(data: DeviceCodeReservationReleaseRequest) {
  return request<void>({
    url: '/firstcheck/device-code-reservations/release',
    method: 'POST',
    data
  })
}

export function verifierVerifyAndAssignFirstCheck(data: VerifierVerifyAndAssignRequest) {
  return request<AssignedFirstCheckDevice[]>({
    url: '/firstcheck/verifier-verify-and-assign',
    method: 'POST',
    data
  })
}
