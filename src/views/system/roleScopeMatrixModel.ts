import type {
  UserRoleScopeMatrixEntry,
  UserRoleScopeMatrixRequest
} from '@/types/nodePermission'

export type RoleScopeMatrix = Map<string, Set<string>>

export interface RoleScopeMatrixItem {
  scopeOrgId: string
  roleCode: string
}

export interface RoleScopeMatrixDiff {
  added: RoleScopeMatrixItem[]
  removed: RoleScopeMatrixItem[]
  retained: RoleScopeMatrixItem[]
}

function normalizeRoleCodes(roleCodes: Iterable<string>) {
  return Array.from(new Set(Array.from(roleCodes)
    .map((roleCode) => roleCode.trim().toUpperCase())
    .filter(Boolean)))
    .sort((left, right) => left.localeCompare(right))
}

export function buildRoleScopeMatrix(entries: UserRoleScopeMatrixEntry[]): RoleScopeMatrix {
  const matrix: RoleScopeMatrix = new Map()
  for (const entry of entries || []) {
    const scopeOrgId = entry.scopeOrgId?.trim()
    if (!scopeOrgId) continue
    const current = matrix.get(scopeOrgId) || new Set<string>()
    for (const roleCode of normalizeRoleCodes(entry.roleCodes || [])) current.add(roleCode)
    if (current.size) matrix.set(scopeOrgId, current)
  }
  return matrix
}

export function rolesForScope(matrix: RoleScopeMatrix, scopeOrgId: string) {
  return normalizeRoleCodes(matrix.get(scopeOrgId) || [])
}

export function roleCountForScope(matrix: RoleScopeMatrix, scopeOrgId: string) {
  return matrix.get(scopeOrgId)?.size || 0
}

export function updateScopeRoles(
  matrix: RoleScopeMatrix,
  scopeOrgId: string,
  roleCodes: string[]
): RoleScopeMatrix {
  const next = new Map(Array.from(matrix, ([orgId, roles]) => [orgId, new Set(roles)]))
  const normalizedOrgId = scopeOrgId.trim()
  const normalizedRoles = normalizeRoleCodes(roleCodes)
  if (!normalizedOrgId) return next
  if (!normalizedRoles.length) next.delete(normalizedOrgId)
  else next.set(normalizedOrgId, new Set(normalizedRoles))
  return next
}

function flattenMatrix(matrix: RoleScopeMatrix) {
  return Array.from(matrix.entries())
    .flatMap(([scopeOrgId, roleCodes]) => normalizeRoleCodes(roleCodes)
      .map((roleCode) => ({ scopeOrgId, roleCode })))
    .sort((left, right) => left.scopeOrgId.localeCompare(right.scopeOrgId)
      || left.roleCode.localeCompare(right.roleCode))
}

export function diffRoleScopeMatrices(
  baseline: RoleScopeMatrix,
  current: RoleScopeMatrix
): RoleScopeMatrixDiff {
  const baselineItems = flattenMatrix(baseline)
  const currentItems = flattenMatrix(current)
  const baselineKeys = new Set(baselineItems.map((item) => `${item.scopeOrgId}\u0000${item.roleCode}`))
  const currentKeys = new Set(currentItems.map((item) => `${item.scopeOrgId}\u0000${item.roleCode}`))
  return {
    added: currentItems.filter((item) => !baselineKeys.has(`${item.scopeOrgId}\u0000${item.roleCode}`)),
    removed: baselineItems.filter((item) => !currentKeys.has(`${item.scopeOrgId}\u0000${item.roleCode}`)),
    retained: currentItems.filter((item) => baselineKeys.has(`${item.scopeOrgId}\u0000${item.roleCode}`))
  }
}

export function toRoleScopeMatrixRequest(
  matrix: RoleScopeMatrix,
  matrixVersion: string
): UserRoleScopeMatrixRequest {
  const entries = Array.from(matrix.entries())
    .filter(([scopeOrgId, roleCodes]) => scopeOrgId.trim() && roleCodes.size)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([scopeOrgId, roleCodes]) => ({
      scopeOrgId,
      roleCodes: normalizeRoleCodes(roleCodes)
    }))
  return { matrixVersion, entries }
}
