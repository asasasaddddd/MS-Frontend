import { request } from '@/api/request'
import type {
  EffectivePermissionVO,
  NodeGrantVO,
  NodeOperationVO,
  NodeScopeGrantPreviewVO,
  NodeScopeGrantRequest,
  TaskCandidatePreviewQuery,
  TaskCandidateVO,
  UserRoleScopePreviewVO,
  UserRoleScopeRequest,
  UserRoleScopeVO
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

export function listUserRoleScopes(userId: string) {
  return request<UserRoleScopeVO[]>({
    url: `/system/users/${encodeURIComponent(userId)}/role-scopes`,
    method: 'GET'
  })
}

export function previewUserRoleScope(userId: string, data: UserRoleScopeRequest) {
  return request<UserRoleScopePreviewVO>({
    url: `/system/users/${encodeURIComponent(userId)}/role-scopes/preview`,
    method: 'POST',
    data
  })
}

export function saveUserRoleScope(userId: string, data: UserRoleScopeRequest) {
  return request<UserRoleScopeVO>({
    url: `/system/users/${encodeURIComponent(userId)}/role-scopes`,
    method: 'POST',
    data
  })
}

export function updateUserRoleScope(
  userId: string,
  scopeId: string | number,
  data: UserRoleScopeRequest
) {
  return request<UserRoleScopeVO>({
    url: `/system/users/${encodeURIComponent(userId)}/role-scopes/${encodeURIComponent(scopeId)}`,
    method: 'PUT',
    data
  })
}

export function revokeUserRoleScope(
  userId: string,
  scopeId: string | number,
  rowVersion: string | number,
  reason: string
) {
  return request<UserRoleScopeVO>({
    url: `/system/users/${encodeURIComponent(userId)}/role-scopes/${encodeURIComponent(scopeId)}`,
    method: 'DELETE',
    params: { rowVersion, reason }
  })
}

export function getEffectivePermissions(userId: string) {
  return request<EffectivePermissionVO>({
    url: `/system/users/${encodeURIComponent(userId)}/effective-permissions`,
    method: 'GET'
  })
}

export function previewTaskCandidates(query: TaskCandidatePreviewQuery) {
  return request<TaskCandidateVO[]>({
    url: '/system/task-candidates/preview',
    method: 'GET',
    params: query
  })
}
