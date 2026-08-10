import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { getClientRuntime, hidePdaSoftKeyboard, isClientOnline, isPdaClient } from '../src/platform/pdaClient.ts'

type MutableGlobal = typeof globalThis & {
  window?: {
    MetrologyPda?: {
      getClientMetadata(): string
      isOnline(): boolean
      hideSoftKeyboard(): void
    }
  }
}

const root = globalThis as MutableGlobal
const originalWindow = root.window

function installBridge(metadata: unknown, online = true) {
  let hidden = false
  root.window = {
    MetrologyPda: {
      getClientMetadata: () => typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
      isOnline: () => online,
      hideSoftKeyboard: () => { hidden = true }
    }
  }
  return () => hidden
}

try {
  installBridge({
    clientType: 'PDA',
    terminalCode: ' PDA-DSMDT201-001 ',
    installId: 'install-001',
    appVersion: '1.0.0'
  })
  assert.deepEqual(getClientRuntime(), {
    isPda: true,
    clientType: 'PDA',
    terminalCode: 'PDA-DSMDT201-001',
    installId: 'install-001',
    appVersion: '1.0.0'
  })
  assert.equal(isPdaClient(), true)
  assert.equal(isClientOnline(), true)

  const hidden = installBridge({
    clientType: 'PDA',
    terminalCode: 'PDA-DSMDT201-002',
    installId: 'install-002',
    appVersion: '1.0.0'
  })
  hidePdaSoftKeyboard()
  assert.equal(hidden(), true)

  root.window = undefined
  assert.deepEqual(getClientRuntime(), {
    isPda: false,
    clientType: 'web',
    terminalCode: 'WEB',
    installId: '',
    appVersion: ''
  })

  installBridge('{bad-json')
  assert.equal(getClientRuntime().isPda, false)

  installBridge({ clientType: 'PDA', terminalCode: '   ', installId: 'install-003', appVersion: '1.0.0' })
  assert.equal(getClientRuntime().isPda, false)

  const requestSource = readFileSync(new URL('../src/api/request.ts', import.meta.url), 'utf8')
  assert.match(requestSource, /getClientRuntime/)
  assert.match(requestSource, /X-Client-Type/)
  assert.match(requestSource, /X-Terminal-Code/)
  assert.match(requestSource, /X-Client-Version/)
} finally {
  root.window = originalWindow
}

console.log('PDA client runtime contract tests passed')
