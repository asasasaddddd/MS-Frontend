import assert from 'node:assert/strict'
import { runRoleSwitchTransaction } from '../src/components/appShellRoleSwitch.ts'

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function verifiesCrossRouteOrdering() {
  const calls: string[] = []

  await runRoleSwitchTransaction({
    previousRole: 'MEASURE_ADMIN',
    nextRole: 'VERIFIER_SELF',
    pause: () => calls.push('pause'),
    flush: async () => { calls.push('flush') },
    switchRole: (role) => calls.push(`switch:${role}`),
    navigate: async () => { calls.push('navigate:/periodic/verifier') },
    rollbackNavigate: async () => { calls.push('rollback-route') },
    resume: () => calls.push('resume')
  })

  assert.deepEqual(calls, [
    'pause',
    'flush',
    'switch:VERIFIER_SELF',
    'navigate:/periodic/verifier',
    'resume'
  ])
}

async function verifiesSameRouteStillUnmountsBeforeSwitching() {
  const calls: string[] = []

  await runRoleSwitchTransaction({
    previousRole: 'VERIFIER_SELF',
    nextRole: 'VERIFIER_EXTERNAL',
    pause: () => calls.push('pause'),
    flush: async () => { calls.push('flush') },
    switchRole: (role) => calls.push(`switch:${role}`),
    navigate: async () => { calls.push('navigate:same-route') },
    rollbackNavigate: async () => { calls.push('rollback-route') },
    resume: () => calls.push('resume')
  })

  assert.deepEqual(calls, [
    'pause',
    'flush',
    'switch:VERIFIER_EXTERNAL',
    'navigate:same-route',
    'resume'
  ])
}

async function verifiesNavigationDoesNotResumeBeforeDeferredPromiseSettles() {
  const calls: string[] = []
  const navigationStarted = deferred<void>()
  const navigationFinished = deferred<void>()

  const transaction = runRoleSwitchTransaction({
    previousRole: 'MEASURE_ADMIN',
    nextRole: 'VERIFIER_SELF',
    pause: () => calls.push('pause'),
    flush: async () => { calls.push('flush') },
    switchRole: (role) => calls.push(`switch:${role}`),
    navigate: async () => {
      calls.push('navigate:start')
      navigationStarted.resolve()
      await navigationFinished.promise
      calls.push('navigate:finish')
    },
    rollbackNavigate: async () => { calls.push('rollback-route') },
    resume: () => calls.push('resume')
  })

  await navigationStarted.promise
  assert.doesNotMatch(calls.join('|'), /resume/)

  navigationFinished.resolve()
  await transaction
  assert.deepEqual(calls, [
    'pause',
    'flush',
    'switch:VERIFIER_SELF',
    'navigate:start',
    'navigate:finish',
    'resume'
  ])
}

async function verifiesNavigationFailureRollsBackRoleAndRouteBeforeResuming() {
  const calls: string[] = []
  const navigationFailure = new Error('navigation aborted')

  await assert.rejects(
    runRoleSwitchTransaction({
      previousRole: 'MEASURE_ADMIN',
      nextRole: 'VERIFIER_SELF',
      pause: () => calls.push('pause'),
      flush: async () => { calls.push('flush') },
      switchRole: (role) => calls.push(`switch:${role}`),
      navigate: async () => {
        calls.push('navigate:/periodic/verifier')
        throw navigationFailure
      },
      rollbackNavigate: async () => { calls.push('rollback-route:/change/apply?tab=pending') },
      resume: () => calls.push('resume')
    }),
    navigationFailure
  )

  assert.deepEqual(calls, [
    'pause',
    'flush',
    'switch:VERIFIER_SELF',
    'navigate:/periodic/verifier',
    'switch:MEASURE_ADMIN',
    'rollback-route:/change/apply?tab=pending',
    'resume'
  ])
}

async function verifiesRollbackNavigationFailureStillResumesWithMeaningfulError() {
  const calls: string[] = []
  const navigationFailure = new Error('target navigation aborted')
  const rollbackFailure = new Error('original route unavailable')

  await assert.rejects(
    runRoleSwitchTransaction({
      previousRole: 'MEASURE_ADMIN',
      nextRole: 'VERIFIER_SELF',
      pause: () => calls.push('pause'),
      flush: async () => { calls.push('flush') },
      switchRole: (role) => calls.push(`switch:${role}`),
      navigate: async () => { throw navigationFailure },
      rollbackNavigate: async () => {
        calls.push('rollback-route')
        throw rollbackFailure
      },
      resume: () => calls.push('resume')
    }),
    (error: Error) => {
      assert.match(error.message, /target navigation aborted/)
      assert.match(error.message, /original route unavailable/)
      return true
    }
  )

  assert.deepEqual(calls, [
    'pause',
    'flush',
    'switch:VERIFIER_SELF',
    'switch:MEASURE_ADMIN',
    'rollback-route',
    'resume'
  ])
}

await verifiesCrossRouteOrdering()
await verifiesSameRouteStillUnmountsBeforeSwitching()
await verifiesNavigationDoesNotResumeBeforeDeferredPromiseSettles()
await verifiesNavigationFailureRollsBackRoleAndRouteBeforeResuming()
await verifiesRollbackNavigationFailureStillResumesWithMeaningfulError()
