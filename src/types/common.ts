export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages?: number
}

export type RoleCode =
  | 'SUPER_ADMIN'
  | 'MEASURE_ADMIN'
  | 'VERIFIER_SELF'
  | 'VERIFIER_EXTERNAL'
  | 'CONFIRMER'
  | 'DEPT_LEADER'
  | 'RESPONSIBLE_ENGINEER'
  | 'EXTERNAL_OPERATOR'
  | 'PLANNER'
  | 'PURCHASE_WAREHOUSE'
  | 'MEASURE_LEADER'
  | 'SUPPLIER'

export interface LoginUser {
  token: string
  employeeId: string
  employeeName: string
  roleCode: RoleCode | string
  roleName: string
  roles: string[]
  deptId: string
  deptName: string
  homePath: string
}

export const roleNameMap: Record<string, string> = {
  SUPER_ADMIN: '超级管理员',
  MEASURE_ADMIN: '计量管理员',
  VERIFIER_SELF: '自检检定员',
  VERIFIER_EXTERNAL: '外委检定员',
  CONFIRMER: '计量确认员',
  DEPT_LEADER: '分厂主管领导',
  RESPONSIBLE_ENGINEER: '责任工程师',
  EXTERNAL_OPERATOR: '外扩人员',
  PLANNER: '计量计划员',
  PURCHASE_WAREHOUSE: '采购库房',
  MEASURE_LEADER: '计量领导',
  SUPPLIER: '采购供应商'
}
