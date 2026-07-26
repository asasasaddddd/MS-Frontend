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

export function getProductSupportOrder(orderId: ProductSupportEntityId, signal?: AbortSignal) {
  return request<ProductSupportOrderVO>({
    url: `/product-support/orders/${orderId}`,
    method: 'GET',
    signal
  })
}

export function verifierSubmitProductSupport(data: ProductSupportVerifyRequest) {
  return request<void>({
    url: '/product-support/verifier-submit',
    method: 'POST',
    data
  })
}
