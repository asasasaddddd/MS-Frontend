# Periodic Verification Dialog Replica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two weekly verification information dialogs with the exact prototype field sets while preserving the existing periodic API and workflow behavior.

**Architecture:** Keep all UI and payload behavior inside the two existing dialog components. Add one source-contract test following the repository's current Node assertion style so the prototype field set, removed fields, date calculation, role lookup, and payload mapping cannot regress.

**Tech Stack:** Vue 3 script setup, TypeScript, Ant Design Vue 4, existing attachment components, Node assert tests.

---

### Task 1: Add failing dialog contract tests

**Files:**
- Create: `tests/periodicVerificationDialogs.test.ts`
- Test: `src/views/periodic/components/PeriodicVerifyDialog.vue`
- Test: `src/views/periodic/components/PeriodicExternalVerifyDialog.vue`

- [ ] **Step 1: Write the failing source-contract test**

Create a Node assertion test that reads both Vue files and checks:

```ts
const commonBaseFields = [
  '计量编号', '设备名称', '生产厂商', '出厂编号',
  '规格型号', '有效期', '检定周期', '使用部门',
  '设备状态', '管理类别', '检定方法', '学科分类'
]

const verifyFields = [
  '检定人', '检定时间', '新有效期', '检定结果',
  '不合格处理方式', '责任工程师', '数据目录', '检定意见', '上传附件'
]

const externalFields = ['检定时间', '检定意见', '上传附件']
```

Assert that the self/common dialog contains all common and verify fields, no longer contains `报告编号`、`检定单位`、`强制使用新有效期`、`环境温度`、`环境湿度`、`是否需要确认员`, queries `RESPONSIBLE_ENGINEER`, calculates month-plus-minus-one-day validity, and maps repair/scrap personnel fields.

Assert that the external non-common dialog contains all common and external fields and no longer contains `检定单位`.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --experimental-strip-types tests/periodicVerificationDialogs.test.ts
```

Expected: FAIL because the current self/common dialog still contains prototype-external fields and the current external dialog still contains `检定单位`.

### Task 2: Rebuild the self/common verification dialog

**Files:**
- Modify: `src/views/periodic/components/PeriodicVerifyDialog.vue`
- Test: `tests/periodicVerificationDialogs.test.ts`

- [ ] **Step 1: Replace the form state with prototype fields**

Use this state shape:

```ts
const form = reactive({
  verificationTime: '',
  newValidUntil: '',
  result: 'qualified' as PeriodicVerificationResult,
  nonconformingDisposal: undefined as 'repair' | 'scrap' | undefined,
  responsibleEngineerId: undefined as string | undefined,
  opinion: ''
})
```

Keep `certificateAttachmentGroupId` separately and remove report number, unit, environment, forced-validity and confirmation controls.

- [ ] **Step 2: Load responsible engineers and calculate validity**

Call:

```ts
listUsersByDeptAndRole(task.deptId, 'RESPONSIBLE_ENGINEER')
```

Calculate `newValidUntil` from `verificationTime` and `verificationCycleMonth` by adding the cycle months and subtracting one day. Format with local `YYYY-MM-DD` parts to avoid UTC date shifts.

- [ ] **Step 3: Map the existing backend request**

Emit:

```ts
{
  taskId,
  verificationTime,
  newValidUntil,
  result,
  conclusion: opinion,
  opinion,
  certificateAttachmentGroupId,
  nonconformingDisposal,
  repairUserId,
  repairUserName,
  scrapEngineerId,
  scrapEngineerName
}
```

Only populate repair fields for `repair`, scrap fields for `scrap`, and no disposal/person fields for `qualified`.

- [ ] **Step 4: Replace the template with the prototype layout**

Render the exact 12-field base section and exact 9-field verification section. Use disabled Ant selects for device status, management category and verification method. Make the “数据目录” button open/focus the responsibility engineer selector.

- [ ] **Step 5: Run the contract test**

Run:

```bash
node --experimental-strip-types tests/periodicVerificationDialogs.test.ts
```

Expected: the self/common assertions pass; any remaining failure should be limited to the external non-common dialog.

### Task 3: Rebuild the external non-common dialog

**Files:**
- Modify: `src/views/periodic/components/PeriodicExternalVerifyDialog.vue`
- Test: `tests/periodicVerificationDialogs.test.ts`

- [ ] **Step 1: Reduce the form and payload**

Use only:

```ts
const form = reactive({
  verificationDate: '',
  opinion: ''
})
```

Emit `taskId`, `verificationDate`, `certificateAttachmentGroupId`, and `opinion`. Do not emit `verificationUnit`.

- [ ] **Step 2: Replace the template with the prototype layout**

Render the exact 12-field base section. The verification section must contain only `检定时间`、`检定意见`、`上传附件`, in that order.

- [ ] **Step 3: Run the contract test and verify GREEN**

Run:

```bash
node --experimental-strip-types tests/periodicVerificationDialogs.test.ts
```

Expected: PASS.

### Task 4: Verify production build and commit

**Files:**
- Modify: `tests/periodicVerificationDialogs.test.ts`
- Modify: `src/views/periodic/components/PeriodicVerifyDialog.vue`
- Modify: `src/views/periodic/components/PeriodicExternalVerifyDialog.vue`

- [ ] **Step 1: Run type checking**

```bash
npm run typecheck
```

Expected: PASS with no TypeScript errors.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: PASS and generate `dist/`.

- [ ] **Step 3: Run diff checks**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only the two dialog files and the test are implementation changes.

- [ ] **Step 4: Commit the implementation**

```bash
git add tests/periodicVerificationDialogs.test.ts \
  src/views/periodic/components/PeriodicVerifyDialog.vue \
  src/views/periodic/components/PeriodicExternalVerifyDialog.vue
git commit -m "feat(periodic): replicate verification dialogs"
```
