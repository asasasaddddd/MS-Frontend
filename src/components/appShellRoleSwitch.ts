export interface RoleSwitchTransactionOptions {
  previousRole: string
  nextRole: string
  pause: () => void
  flush: () => Promise<void>
  switchRole: (roleCode: string) => void
  navigate: () => Promise<void>
  rollbackNavigate: () => Promise<void>
  resume: () => void
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class RoleSwitchRollbackError extends Error {
  readonly navigationError: unknown
  readonly rollbackErrors: unknown[]

  constructor(navigationError: unknown, rollbackErrors: unknown[]) {
    super(
      `角色切换失败：${errorMessage(navigationError)}；恢复原状态失败：${rollbackErrors.map(errorMessage).join('；')}`,
      { cause: navigationError }
    )
    this.name = 'RoleSwitchRollbackError'
    this.navigationError = navigationError
    this.rollbackErrors = rollbackErrors
  }
}

/**
 * Switches roles only after the current route view has unmounted, and restores
 * the previous role before remounting if navigation cannot complete.
 */
export async function runRoleSwitchTransaction(options: RoleSwitchTransactionOptions): Promise<void> {
  options.pause()

  try {
    await options.flush()
    options.switchRole(options.nextRole)
    await options.navigate()
  } catch (error) {
    const rollbackErrors: unknown[] = []
    try {
      options.switchRole(options.previousRole)
    } catch (rollbackRoleError) {
      rollbackErrors.push(rollbackRoleError)
    }

    try {
      await options.rollbackNavigate()
    } catch (rollbackNavigationError) {
      rollbackErrors.push(rollbackNavigationError)
    } finally {
      options.resume()
    }

    if (rollbackErrors.length > 0) {
      throw new RoleSwitchRollbackError(error, rollbackErrors)
    }
    throw error
  }

  options.resume()
}
