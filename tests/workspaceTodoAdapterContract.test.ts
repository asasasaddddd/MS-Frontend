import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const adapterUrl = new URL('../src/views/workspaceTodoAdapters.ts', import.meta.url)
assert.equal(
  existsSync(adapterUrl),
  true,
  '总待办必须建立独立的业务适配器注册表'
)

const adapterModule = await import(adapterUrl.href)
const adapters = adapterModule.todoModuleAdapters as Record<string, {
  type: string
  loadDetail: Function
  todoRoute: Function
  historyRoute: Function
}>

assert.deepEqual(
  Object.keys(adapters).sort(),
  ['change', 'firstcheck', 'periodic', 'productSupport', 'sampling'],
  '五类业务必须全部通过注册表接入总待办'
)
Object.entries(adapters).forEach(([type, adapter]) => {
  assert.equal(adapter.type, type)
  assert.equal(typeof adapter.loadDetail, 'function')
  assert.equal(typeof adapter.todoRoute, 'function')
  assert.equal(typeof adapter.historyRoute, 'function')
})

assert.deepEqual(
  adapters.periodic.todoRoute('MEASURE_LEADER'),
  { path: '/todo', query: { type: 'periodic' } },
  '无角色业务页时固定入口仍需回退到只读业务筛选'
)
assert.equal(adapters.productSupport.todoRoute('MEASURE_ADMIN'), undefined)
assert.equal(
  adapterModule.getTodoModuleAdapterForTask({ businessType: 'FIRST_CHECK' })?.type,
  'firstcheck'
)
assert.equal(
  adapterModule.getTodoModuleAdapterForTask({ businessType: 'product_support' })?.type,
  'productSupport'
)

const workspaceSource = readFileSync(
  new URL('../src/views/WorkspaceTodoView.vue', import.meta.url),
  'utf8'
)
assert.match(workspaceSource, /workspaceTodoAdapters/)
assert.match(workspaceSource, /loadTodoModuleDetail/)
assert.doesNotMatch(
  workspaceSource,
  /from ['"]@\/api\/(firstcheck|change|periodic|sampling|productSupport)['"]/,
  '页面编排层不得直接依赖具体业务详情 API'
)
assert.doesNotMatch(
  workspaceSource,
  /\b(getFirstCheckDetail|getChangeOrderDetail|getPeriodicTask|getSamplingTask|getProductSupportOrder)\b/,
  '具体业务详情加载必须收敛到适配器'
)
