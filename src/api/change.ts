import { request } from '@/api/request'
import {
  buildChangeApproveRequest,
  buildChangeRejectRequest,
  buildChangeSubmitRequest,
  buildChangeVerifierHandleRequest,
  changeEndpoint
} from '@/api/changeContract'
import type {
  ChangeApproveRequest,
  ChangeOrderVO,
  ChangeRejectRequest,
  ChangeSubmitRequest,
  ChangeVerifierHandleRequest
} from '@/types/change'

export function submitChange(data: ChangeSubmitRequest) {
  return request<string | number>({
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

export function verifierHandleChange(data: ChangeVerifierHandleRequest) {
  return request<void>({
    url: changeEndpoint('verifierHandle'),
    method: 'POST',
    data: buildChangeVerifierHandleRequest(data)
  })
}

export function getChangeOrderDetail(orderId: string | number, signal?: AbortSignal) {
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
