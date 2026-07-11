import { request } from '@/api/request'
import { buildChangeSubmitRequest, changeEndpoint } from '@/api/changeContract'
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
    data
  })
}

export function rejectChange(data: ChangeRejectRequest) {
  return request<void>({
    url: changeEndpoint('reject'),
    method: 'POST',
    data: {
      orderId: data.orderId,
      reason: data.reason || data.opinion
    }
  })
}

export function verifierHandleChange(data: ChangeVerifierHandleRequest) {
  return request<void>({
    url: changeEndpoint('verifierHandle'),
    method: 'POST',
    data
  })
}

export function getChangeOrderDetail(orderId: string | number) {
  return request<ChangeOrderVO>({
    url: changeEndpoint('detail', orderId),
    method: 'GET'
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
