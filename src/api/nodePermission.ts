import { request } from '@/api/request'
import type {
  NodeGrantVO,
  NodeOperationVO,
  NodeScopeGrantPreviewVO,
  NodeScopeGrantRequest
} from '@/types/nodePermission'

export function listNodeOperations(businessType: string) {
  return request<NodeOperationVO[]>({
    url: '/system/node-operations',
    method: 'GET',
    params: { businessType }
  })
}

export function getUserNodeGrants(userId: string) {
  return request<NodeGrantVO[]>({
    url: `/system/users/${encodeURIComponent(userId)}/node-grants`,
    method: 'GET'
  })
}

export function previewUserNodeGrant(userId: string, data: NodeScopeGrantRequest) {
  return request<NodeScopeGrantPreviewVO>({
    url: `/system/users/${encodeURIComponent(userId)}/node-grants/preview`,
    method: 'POST',
    data
  })
}

export function saveUserNodeGrant(userId: string, data: NodeScopeGrantRequest) {
  return request<NodeGrantVO>({
    url: `/system/users/${encodeURIComponent(userId)}/node-grants`,
    method: 'PUT',
    data
  })
}

export function deleteUserNodeGrant(
  userId: string,
  grantId: string,
  rowVersion: number,
  reason: string
) {
  return request<void>({
    url: `/system/users/${encodeURIComponent(userId)}/node-grants/${encodeURIComponent(grantId)}`,
    method: 'DELETE',
    params: { rowVersion, reason }
  })
}
