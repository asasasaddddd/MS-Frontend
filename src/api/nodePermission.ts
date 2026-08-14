import { request } from '@/api/request'
import type {
  EffectivePermissionVO,
  UserWorkScopeMatrixRequest,
  UserWorkScopeMatrixVO,
  NodeGrantVO,
  NodeOperationVO,
  NodeScopeGrantPreviewVO,
  NodeScopeGrantRequest,
  TaskCandidatePreviewQuery,
  TaskCandidateVO
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

/** 读取人员作业范围矩阵（整组平级单位与设备属性规则）。 */
export function getUserWorkScopes(userId: string) {
  return request<UserWorkScopeMatrixVO>({
    url: `/system/users/${encodeURIComponent(userId)}/work-scopes`,
    method: 'GET'
  })
}

/** 整组替换人员作业范围矩阵；版本冲突时后端返回 HTTP 409。 */
export function replaceUserWorkScopes(
  userId: string,
  data: UserWorkScopeMatrixRequest
) {
  return request<UserWorkScopeMatrixVO>({
    url: `/system/users/${encodeURIComponent(userId)}/work-scopes`,
    method: 'PUT',
    data
  })
}

