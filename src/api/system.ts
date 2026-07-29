import { request } from '@/api/request'
import type { PageResult } from '@/types/common'
import type { AllowedOrganizationNodeVO } from '@/types/nodePermission'

export interface SysUserVO {
  id?: number
  employeeId: string
  employeeName?: string
  orgId?: string
  orgName?: string
  phone?: string
  deptId?: string
  deptName?: string
  groupId?: string
  groupName?: string
  jobFullName?: string
  positionDesc?: string
  role?: string
  roles?: string[]
  status?: string
  lastLoginAt?: string
}

export interface SysOrgVO {
  id?: number
  orgId: string
  orgFullCName?: string
  orgSimpleCName?: string
  orgParentId?: string
  orgLevel?: string
  orgFullPath?: string
  orgCate?: string
  orgType?: string
  orgFictitious?: boolean | number | string
  status?: string
  children?: SysOrgVO[]
}

export interface SysUserOrgRelationVO {
  orgId: string
  relationType?: string
  orgName?: string
  orgFullName?: string
  orgFullPath?: string
  orgPath?: string
  orgType?: string
  orgCate?: string
  primary?: boolean
  isPrimary?: boolean | number | string
  status?: string
}

export interface SysRoleVO {
  id: number
  roleCode: string
  roleName: string
  roleDesc?: string
  status?: string
  sortNo?: number
}

export interface SystemUserQuery {
  employeeId?: string
  employeeName?: string
  deptId?: string
  deptIds?: string[]
  status?: string
  current?: number
  size?: number
}

export function listSystemUsers(query: SystemUserQuery = {}) {
  const { current = 1, size = 20, deptIds, ...filters } = query
  return request<PageResult<SysUserVO>>({
    url: '/system/users/page',
    method: 'GET',
    params: {
      ...filters,
      deptIds: deptIds?.length ? deptIds.join(',') : undefined,
      current,
      size
    }
  })
}

export function listUsersByDeptAndRole(deptId: string, roleCode: string) {
  return request<SysUserVO[]>({
    url: '/system/users/by-dept-role',
    method: 'GET',
    params: { deptId, roleCode }
  })
}

export function listSystemOrgs() {
  return request<SysOrgVO[]>({
    url: '/system/orgs/list',
    method: 'GET'
  })
}

export function listSystemRoles() {
  return request<SysRoleVO[]>({
    url: '/system/roles/list',
    method: 'GET'
  })
}

export function getUserRoles(employeeId: string) {
  return request<string[]>({
    url: `/system/users/${encodeURIComponent(employeeId)}/roles`,
    method: 'GET'
  })
}

export function getUserOrgRelations(employeeId: string) {
  return request<SysUserOrgRelationVO[]>({
    url: `/system/users/${encodeURIComponent(employeeId)}/org-relations`,
    method: 'GET'
  })
}

export function assignUserRoles(employeeId: string, roleCodes: string[]) {
  return request<void>({
    url: `/system/users/${encodeURIComponent(employeeId)}/roles`,
    method: 'PUT',
    data: { roleCodes }
  })
}

export function getAllowedOrganizationTree() {
  return request<AllowedOrganizationNodeVO[]>({
    url: '/system/org-scopes/allowed-tree',
    method: 'GET'
  })
}

export function listAllowedOrganizationUsers(orgIds: string[] = []) {
  return request<SysUserVO[]>({
    url: '/system/org-scopes/users',
    method: 'GET',
    params: {
      orgIds: orgIds.length ? orgIds.join(',') : undefined
    }
  })
}
