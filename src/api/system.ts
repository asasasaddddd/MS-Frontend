import { request } from '@/api/request'
import type { PageResult } from '@/types/common'

export interface SysUserVO {
  id?: number
  employeeId: string
  employeeName?: string
  orgId?: string
  orgName?: string
  phone?: string
  deptId?: string
  deptName?: string
  role?: string
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
  status?: string
  children?: SysOrgVO[]
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

export function assignUserRoles(employeeId: string, roleCodes: string[]) {
  return request<void>({
    url: `/system/users/${encodeURIComponent(employeeId)}/roles`,
    method: 'PUT',
    data: { roleCodes }
  })
}
