import { request } from '@/api/request'
import {
  buildChangeApproveRequest,
  buildChangeRejectRequest,
  buildChangeReviseRequest,
  buildChangeSubmitRequest,
  buildChangeVerifierHandleRequest,
  changeEndpoint
} from '@/api/changeContract'
import type {
  ChangeApproveRequest,
  ChangeOrderVO,
  ChangeRejectRequest,
  ChangeReviseRequest,
  ChangeSubmitRequest,
  ChangeVerifierHandleRequest
} from '@/types/change'
import type { EntityId } from '@/types/common'

export function submitChange(data: ChangeSubmitRequest) {
  return request<EntityId>({
    url: changeEndpoint('submit'),
    method: 'POST',
    data: buildChangeSubmitRequest(data)
  })
}

export const createChangeOrder = submitChange

export function approveChange(data: ChangeApproveRequest) {
  return request<void>({
    url: changeEndpoint('approve'),
    method: 'POST',
    data: buildChangeApproveRequest(data)
  })
}

export function rejectChange(data: ChangeRejectRequest) {
  return request<void>({
    url: changeEndpoint('reject'),
    method: 'POST',
    data: buildChangeRejectRequest(data)
  })
}

export function reviseChange(data: ChangeReviseRequest) {
  return request<void>({
    url: changeEndpoint('revise'),
    method: 'POST',
    data: buildChangeReviseRequest(data)
  })
}

export function verifierHandleChange(data: ChangeVerifierHandleRequest) {
  return request<void>({
    url: changeEndpoint('verifierHandle'),
    method: 'POST',
    data: buildChangeVerifierHandleRequest(data)
  })
}

export function getChangeOrderDetail(orderId: EntityId, signal?: AbortSignal) {
  return request<ChangeOrderVO>({
    url: changeEndpoint('detail', orderId),
    method: 'GET',
    signal
  })
}

export function getMyChangeOrders(status?: string) {
  return request<ChangeOrderVO[]>({
    url: changeEndpoint('myOrders'),
    method: 'GET',
    params: status ? { status } : undefined
  })
}

export {
  changeStatusName,
  changeTypeName
} from '@/api/changeContract'
