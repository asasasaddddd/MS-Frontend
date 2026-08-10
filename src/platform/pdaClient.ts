export interface PdaClientMetadata {
  clientType: 'PDA'
  terminalCode: string
  installId: string
  appVersion: string
}

export interface ClientRuntime {
  isPda: boolean
  clientType: 'PDA' | 'web'
  terminalCode: string
  installId: string
  appVersion: string
}

const WEB_RUNTIME: ClientRuntime = {
  isPda: false,
  clientType: 'web',
  terminalCode: 'WEB',
  installId: '',
  appVersion: ''
}

function webRuntime(): ClientRuntime {
  return { ...WEB_RUNTIME }
}

function readBridge(): MetrologyPdaBridge | undefined {
  if (typeof window === 'undefined') return undefined
  return window.MetrologyPda
}

export function getClientRuntime(): ClientRuntime {
  const bridge = readBridge()
  if (!bridge) return webRuntime()

  try {
    const value = JSON.parse(bridge.getClientMetadata()) as Partial<PdaClientMetadata>
    const terminalCode = typeof value.terminalCode === 'string' ? value.terminalCode.trim() : ''
    const installId = typeof value.installId === 'string' ? value.installId.trim() : ''
    const appVersion = typeof value.appVersion === 'string' ? value.appVersion.trim() : ''
    if (value.clientType !== 'PDA' || !terminalCode || !installId || !appVersion) {
      return webRuntime()
    }
    return {
      isPda: true,
      clientType: 'PDA',
      terminalCode,
      installId,
      appVersion
    }
  } catch {
    return webRuntime()
  }
}

export function isPdaClient(): boolean {
  return getClientRuntime().isPda
}

export function isClientOnline(): boolean {
  const bridge = readBridge()
  try {
    if (bridge) return bridge.isOnline()
  } catch {
    return false
  }
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export function hidePdaSoftKeyboard(): void {
  try {
    readBridge()?.hideSoftKeyboard()
  } catch {
    // Browser fallback and native bridge failures are intentionally no-ops.
  }
}
