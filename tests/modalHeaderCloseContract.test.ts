import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const actionHeaderDialogs = [
  '../src/views/firstcheck/components/FirstCheckVerifyDialog.vue',
  '../src/views/periodic/components/PeriodicExceptionDialog.vue',
  '../src/views/periodic/components/PeriodicExternalVerifyDialog.vue',
  '../src/views/periodic/components/PeriodicConfirmDialog.vue',
  '../src/views/periodic/components/PeriodicForwardConfirmDialog.vue',
  '../src/views/periodic/components/PeriodicJudgementDialog.vue',
  '../src/views/periodic/components/PeriodicVerifyDialog.vue',
  '../src/views/periodic/components/PeriodicScrapDisposalDialog.vue',
  '../src/views/periodic/components/PeriodicResponsibleScrapConfirmDialog.vue',
  '../src/views/periodic/components/PeriodicSupplierFillDialog.vue',
  '../src/views/periodic/components/PeriodicScrapTrackingDecisionDialog.vue'
] as const

for (const relativePath of actionHeaderDialogs) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
  const modalOpeningTag = source.match(/<a-modal[\s\S]*?>/)?.[0] || ''

  assert.match(
    modalOpeningTag,
    /:closable="false"/,
    `${relativePath} 的标题栏已有关闭操作，必须禁用默认关闭按钮以避免重叠`
  )
}
