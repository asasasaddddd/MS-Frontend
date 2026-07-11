import { request } from '@/api/request'
import type {
  ProductSupportCreateOrderRequest,
  ProductSupportEntityId,
  ProductSupportOrderVO,
  ProductSupportVerifyRequest
} from '@/types/productSupport'

export function createProductSupportOrder(data: ProductSupportCreateOrderRequest) {
  return request<ProductSupportEntityId>({
    url: '/product-support/orders',
    method: 'POST',
    data
  })
}

export function getProductSupportOrder(orderId: ProductSupportEntityId) {
  return request<ProductSupportOrderVO>({
    url: `/product-support/orders/${orderId}`,
    method: 'GET'
  })
}

export function listProductSupportMyTasks(status?: string) {
  return request<ProductSupportOrderVO[]>({
    url: '/product-support/my-tasks',
    method: 'GET',
    params: status ? { status } : undefined
  })
}

export function listProductSupportMyHistory(status?: string) {
  return request<ProductSupportOrderVO[]>({
    url: '/product-support/my-history',
    method: 'GET',
    params: status ? { status } : undefined
  })
}

export function verifierSubmitProductSupport(data: ProductSupportVerifyRequest) {
  return request<void>({
    url: '/product-support/verifier-submit',
    method: 'POST',
    data
  })
}
