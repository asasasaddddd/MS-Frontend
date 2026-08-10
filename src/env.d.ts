/// <reference types="vite/client" />

interface MetrologyPdaBridge {
  getClientMetadata(): string
  isOnline(): boolean
  hideSoftKeyboard(): void
}

interface Window {
  MetrologyPda?: MetrologyPdaBridge
}
