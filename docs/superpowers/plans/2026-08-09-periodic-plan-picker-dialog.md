# 周检单据选择弹窗 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在总待办“周检计划”固定入口与现有角色周检工作台之间增加单据选择弹窗，使用户先选择一张周检单，再携带唯一 `planId` 进入该单据的设备详情。

**Architecture:** 继续复用统一工作流待办、扫码实物待办和 `TodoModuleAdapter`。`periodicDisplayModel.ts` 负责把已加载的权威周检任务按真实 `planId` 转成纯展示行；`PeriodicPlanPickerDialog.vue` 只渲染和发出选择事件；`WorkspaceTodoView.vue` 只维护弹窗状态、完整性提示和当前角色路由跳转。现有 `PeriodicTaskWorkspace.vue` 的 `route.query.planId` 过滤保持不变。

**Tech Stack:** Vue 3 `<script setup>`、TypeScript、Vue Router、Ant Design Vue、Node 合同测试、Vite。

---

### Task 1: 周检单据展示模型

**Files:**
- Modify: `src/views/periodic/periodicDisplayModel.ts`
- Modify: `tests/periodicDisplayModel.test.ts`

- [x] **Step 1: 写入失败测试**

在 `tests/periodicDisplayModel.test.ts` 导入 `buildPeriodicPlanPickerItems`，构造三张单据、每单多条任务以及一条缺失 `planId` 的任务，断言：

```ts
const pickerItems = buildPeriodicPlanPickerItems([
  { ...exceptionRouteTask, id: 'P1-1', planId: 'P1', taskNo: 'ZJ-202608-0001', currentNodeName: '管理员异常分流' },
  { ...exceptionRouteTask, id: 'P1-2', planId: 'P1', taskNo: 'ZJ-202608-0002', currentNodeName: '管理员异常分流' },
  { ...exceptionRouteTask, id: 'P2-1', planId: 'P2', taskNo: 'ZJ-202609-0001', currentNodeName: '待接收' },
  { ...exceptionRouteTask, id: 'ORPHAN', planId: undefined, taskNo: 'ORPHAN-0001' }
])

assert.deepEqual(pickerItems, [
  {
    planId: 'P1',
    planNo: 'ZJ-202608-',
    currentNodeSummary: '管理员异常分流',
    deviceCount: 2
  },
  {
    planId: 'P2',
    planNo: 'ZJ-202609-',
    currentNodeSummary: '待接收',
    deviceCount: 1
  }
])
```

- [x] **Step 2: 运行测试并确认 RED**

Run: `node --experimental-strip-types tests/periodicDisplayModel.test.ts`

Expected: FAIL，提示 `buildPeriodicPlanPickerItems` 未导出。

- [x] **Step 3: 实现最小展示模型**

在 `periodicDisplayModel.ts` 添加：

```ts
export interface PeriodicPlanPickerItem {
  planId: string
  planNo: string
  currentNodeSummary: string
  deviceCount: number
}

function derivePeriodicPlanLabel(planId: string, tasks: PeriodicTaskVO[]) {
  const taskNo = tasks.find((task) => task.taskNo)?.taskNo?.trim()
  if (taskNo && taskNo.length > 4) return taskNo.replace(/\d{4}$/, '') || taskNo
  return planId
}

function periodicPlanNodeSummary(tasks: PeriodicTaskVO[]) {
  const nodes = Array.from(new Set(
    tasks.map((task) => task.currentNodeName || task.currentNode).filter(Boolean)
  ))
  if (nodes.length === 0) return '-'
  return `${nodes.slice(0, 2).join(' / ')}${nodes.length > 2 ? ' 等' : ''}`
}

export function buildPeriodicPlanPickerItems(tasks: PeriodicTaskVO[]): PeriodicPlanPickerItem[] {
  const authoritativeTasks = tasks.filter(
    (task) => task.planId !== undefined && task.planId !== null && task.planId !== ''
  )
  return buildPeriodicPlanTodoGroups(authoritativeTasks).map(({ planId, tasks: planTasks, deviceCount }) => ({
    planId,
    planNo: derivePeriodicPlanLabel(planId, planTasks),
    currentNodeSummary: periodicPlanNodeSummary(planTasks),
    deviceCount
  }))
}
```

- [x] **Step 4: 运行测试并确认 GREEN**

Run: `node --experimental-strip-types tests/periodicDisplayModel.test.ts`

Expected: PASS。

### Task 2: 纯展示单据选择弹窗

**Files:**
- Create: `src/views/periodic/components/PeriodicPlanPickerDialog.vue`
- Create: `tests/periodicPlanPickerDialogContract.test.ts`

- [x] **Step 1: 写入失败合同测试**

合同测试读取组件源码并断言：

```ts
assert.match(dialog, /defineProps<[\s\S]*open:\s*boolean[\s\S]*items:\s*readonly PeriodicPlanPickerItem\[\][\s\S]*incomplete:\s*boolean/)
assert.match(dialog, /'update:open':\s*\[value:\s*boolean\]/)
assert.match(dialog, /select:\s*\[planId:\s*string\]/)
assert.match(dialog, /周检单号/)
assert.match(dialog, /当前节点/)
assert.match(dialog, /条目数量/)
assert.match(dialog, /进入详情/)
assert.match(dialog, /当前角色暂时无周检待办单据/)
assert.match(dialog, /部分周检详情加载失败，请刷新后重试/)
assert.doesNotMatch(dialog, /@\/api\/|useRouter|useSessionStore|allowedActions/)
```

- [x] **Step 2: 运行测试并确认 RED**

Run: `node --experimental-strip-types tests/periodicPlanPickerDialogContract.test.ts`

Expected: FAIL，提示组件文件不存在。

- [x] **Step 3: 实现组件**

组件使用 `a-modal`、`a-table`、`a-alert`、`a-empty` 和带 `RightOutlined` 的“进入详情”按钮。组件只接收 `open/items/incomplete`，通过 `update:open` 和 `select(planId)` 通知父组件；表格关闭分页并设置横向滚动，不执行接口、会话、路由或业务操作。

- [x] **Step 4: 运行测试并确认 GREEN**

Run: `node --experimental-strip-types tests/periodicPlanPickerDialogContract.test.ts`

Expected: PASS。

### Task 3: 总待办交互编排

**Files:**
- Modify: `src/views/WorkspaceTodoView.vue`
- Create: `tests/workspaceTodoPlanPickerContract.test.ts`
- Modify: `tests/workspaceTodoTask7Contract.test.ts`

- [x] **Step 1: 写入失败合同测试**

断言总待办：

```ts
assert.match(workspace, /import PeriodicPlanPickerDialog/)
assert.match(workspace, /const periodicPlanPickerOpen = ref\(false\)/)
assert.match(workspace, /buildPeriodicPlanPickerItems\(periodicTasks\.value\)/)
assert.match(workspace, /item\.key === 'periodic-todo-summary'/)
assert.match(workspace, /periodicPlanPickerOpen\.value = true/)
assert.match(workspace, /getTodoModuleAdapter\('periodic'\)\.todoRoute\(currentRole\)/)
assert.match(workspace, /planId/)
assert.match(workspace, /message\.error\('当前角色没有可进入的周检工作台'/)
assert.match(workspace, /<PeriodicPlanPickerDialog/)
assert.match(workspace, /@select="openPeriodicPlan"/)
```

同时保留原有断言，确保首检、状态变更、抽检、产品配套和周检已办仍按原路径直接跳转。

- [x] **Step 2: 运行测试并确认 RED**

Run: `node --experimental-strip-types tests/workspaceTodoPlanPickerContract.test.ts`

Expected: FAIL，提示缺少弹窗编排代码。

- [x] **Step 3: 实现交互**

在 `WorkspaceTodoView.vue`：

```ts
const periodicPlanPickerOpen = ref(false)
const periodicPlanPickerItems = computed(() => buildPeriodicPlanPickerItems(periodicTasks.value))
const periodicPlanPickerDeviceCount = computed(() =>
  periodicPlanPickerItems.value.reduce((sum, item) => sum + item.deviceCount, 0)
)
const periodicPlanPickerIncomplete = computed(() =>
  (periodicTodoEntries.value[0]?.count || 0) > periodicPlanPickerDeviceCount.value
)
```

`openTodo` 仅在“我的待办”的固定周检汇总入口打开弹窗；其它入口继续原跳转。`openPeriodicPlan(planId)` 在点击瞬间重新读取 `roleCode.value`，从 `getTodoModuleAdapter('periodic').todoRoute(currentRole)` 取得路径，拒绝 `/todo` 回退路径，合并原查询参数并附加唯一 `planId` 后跳转。`clearWorkspaceSummary()` 同时关闭弹窗，使角色切换和重新加载丢弃旧角色快照。

- [x] **Step 4: 运行聚焦测试并确认 GREEN**

Run:

```powershell
node --experimental-strip-types tests/workspaceTodoPlanPickerContract.test.ts
node --experimental-strip-types tests/workspaceTodoTask7Contract.test.ts
node --experimental-strip-types tests/periodicUnifiedWorkflowContract.test.ts
```

Expected: 三个测试全部 PASS。

### Task 4: 全量回归与真实浏览器验证

**Files:**
- Verify: `src/views/periodic/components/PeriodicTaskWorkspace.vue`
- Verify: `src/views/WorkspaceTodoView.vue`

- [x] **Step 1: 运行全量自动验证**

Run:

```powershell
npm test
npm run typecheck
npm run build -- --outDir .codex-periodic-picker-build-20260809
git diff --check
```

Expected: 全部退出码为 0；Vite 允许仅出现既存的拆包和大 chunk 警告。

- [x] **Step 2: 浏览器验证正常数据**

启动当前前端和后端后，以当前有周检待办的角色访问 `/todo`，点击“周检计划”的“查看详情”，断言不立即切换路由；弹窗显示按 `planId` 拆分的单据、节点摘要和设备数量。点击一张单据“进入详情”，URL 带唯一 `planId`，现有周检工作台只显示该单据设备。

- [x] **Step 3: 浏览器验证边界**

验证 0 单时弹窗显示“当前角色暂时无周检待办单据”；窄屏时表格可横向滚动且操作按钮可见；切换角色后弹窗关闭，重新打开只显示新角色后端可见单据。

- [x] **Step 4: 最终自审**

确认没有新增后端接口、没有复制角色路由表、没有修改 `allowedActions`、扫码、周检节点或 `PeriodicTaskWorkspace.vue` 的业务处理逻辑；确认工作区仅包含本任务计划、测试、展示模型、弹窗和总待办编排改动。
