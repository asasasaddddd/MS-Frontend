import { request } from '@/api/request'
import type { LoginUser } from '@/types/common'

export interface LoginRequest {
  employeeId: string
  password: string
}

export interface LoginResponse {
  token: string
  employeeId: string
  employeeName: string
  roleCode: string
  roleName?: string
  roles?: string[]
  deptId?: string
  deptName?: string
  homePath?: string
}

export function login(payload: LoginRequest) {
  return request<LoginResponse>({
    method: 'POST',
    url: '/auth/login',
    data: payload
  })
}

export function logout() {
  return request<void>({
    method: 'POST',
    url: '/auth/logout'
  })
}

export function fetchCurrentUser() {
  return request<LoginUser>({
    method: 'GET',
    url: '/auth/me'
  })
}

export function toLoginUser(response: LoginResponse): LoginUser {
  const roles = response.roles?.length ? response.roles : [response.roleCode]
  return {
    token: response.token,
    employeeId: response.employeeId,
    employeeName: response.employeeName,
    roleCode: response.roleCode,
    roleName: response.roleName || response.roleCode,
    roles,
    deptId: response.deptId || '',
    deptName: response.deptName || '',
    homePath: response.homePath || '/todo'
  }
}
