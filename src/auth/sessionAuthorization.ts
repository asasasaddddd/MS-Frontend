export interface AuthorizedUserSnapshot {
  userId?: string
  employeeId: string
  employeeName: string
  role: string
  roles?: string[]
  deptId?: string
  deptName?: string
  groupId?: string
  groupName?: string
}

interface SessionUserShape {
  token: string
  employeeId: string
  employeeName: string
  roleCode: string
  roleName: string
  roles: string[]
  deptId: string
  deptName: string
  groupId: string
  groupName: string
  homePath: string
}

/**
 * Reconciles the locally selected role with the server's active role list.
 * The local token and home path remain client-session data; authorization and
 * organization identity come from the server snapshot.
 */
export function reconcileAuthorizedSessionUser<T extends SessionUserShape>(
  current: T,
  snapshot: AuthorizedUserSnapshot,
): T {
  const roles = [...new Set(
    (snapshot.roles?.length ? snapshot.roles : [snapshot.role])
      .filter((role): role is string => typeof role === 'string' && role.length > 0),
  )]
  if (roles.length === 0) {
    throw new Error('当前账号暂无有效角色')
  }

  const roleCode = roles.includes(current.roleCode)
    ? current.roleCode
    : roles.includes(snapshot.role)
      ? snapshot.role
      : roles[0]

  return {
    ...current,
    employeeId: snapshot.employeeId,
    employeeName: snapshot.employeeName,
    roleCode,
    roleName: roleCode === current.roleCode ? current.roleName : roleCode,
    roles,
    deptId: snapshot.deptId || '',
    deptName: snapshot.deptName || '',
    groupId: snapshot.groupId || '',
    groupName: snapshot.groupName || '',
  }
}
