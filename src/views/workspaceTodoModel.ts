export type WorkspaceTodoType =
  | 'all'
  | 'firstcheck'
  | 'periodic'
  | 'change'
  | 'sampling'
  | 'productSupport'

export interface WorkspaceTodoCountEntry {
  type: Exclude<WorkspaceTodoType, 'all'>
  count: number
  key?: string
}

export interface WorkspaceLaunchAction {
  key: string
  title: string
  description: string
  path: string
}

const changeTaskRouteByRole: Record<string, string> = {
  MEASURE_ADMIN: '/change/admin-task',
  DEPT_LEADER: '/change/approval',
  MEASURE_LEADER: '/change/approval',
  RESPONSIBLE_ENGINEER: '/change/approval',
  VERIFIER_SELF: '/change/verifier',
  VERIFIER_EXTERNAL: '/change/verifier'
}

export function getChangeTaskRoute(roleCode?: string) {
  return roleCode ? changeTaskRouteByRole[roleCode] : undefined
}

export function filterVisibleTodoEntries<T extends WorkspaceTodoCountEntry>(entries: readonly T[]) {
  return entries.filter((entry) => Number.isFinite(entry.count) && entry.count > 0)
}

export function dedupeTodoEntriesByKey<T extends WorkspaceTodoCountEntry>(entries: readonly T[]) {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    if (!entry.key) return true
    if (seen.has(entry.key)) return false
    seen.add(entry.key)
    return true
  })
}

export function visibleTodoTypeValues(entries: readonly WorkspaceTodoCountEntry[]): WorkspaceTodoType[] {
  const visibleTypes = filterVisibleTodoEntries(entries).map((entry) => entry.type)
  return ['all', ...Array.from(new Set(visibleTypes))]
}

export function getWorkspaceLaunchActions(roleCode?: string): WorkspaceLaunchAction[] {
  if (roleCode !== 'SUPPLIER') return []
  return [
    {
      key: 'firstcheck-start',
      title: '发起首检',
      description: '填写测量设备首次使用申请',
      path: '/firstcheck/supplier'
    }
  ]
}
