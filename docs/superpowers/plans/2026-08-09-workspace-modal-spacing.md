# Workspace And Modal Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the workspace todo tabs with card content and prevent custom modal header actions from colliding with the default close button.

**Architecture:** Keep the fix local to the two ownership boundaries. Workspace alignment is a scoped style in `WorkspaceTodoView.vue`; modal behavior is declared explicitly on each dialog that owns header actions. Contract tests scan the authoritative component sources so future dialogs cannot silently reintroduce either regression.

**Tech Stack:** Vue 3, TypeScript, Ant Design Vue, Node contract tests, Vite

---

### Task 1: Add regression contracts

**Files:**
- Create: `tests/workspaceLayoutContract.test.ts`
- Create: `tests/modalHeaderCloseContract.test.ts`

- [x] **Step 1: Write the failing workspace spacing test**

Read `WorkspaceTodoView.vue` and assert that `.workspace-task-tabs :deep(.ant-tabs-nav)` declares `padding: 0 18px`.

- [x] **Step 2: Write the failing modal close test**

Read the eleven first-check and periodic dialogs with custom title actions and assert that the opening `a-modal` tag includes `:closable="false"`.

- [x] **Step 3: Run both tests and verify RED**

Run:

```powershell
node --experimental-strip-types tests/workspaceLayoutContract.test.ts
node --experimental-strip-types tests/modalHeaderCloseContract.test.ts
```

Expected: both tests fail because the spacing and explicit close ownership are missing.

### Task 2: Apply the scoped fixes

**Files:**
- Modify: `src/views/WorkspaceTodoView.vue`
- Modify: `src/views/firstcheck/components/FirstCheckVerifyDialog.vue`
- Modify: `src/views/periodic/components/PeriodicExceptionDialog.vue`
- Modify: `src/views/periodic/components/PeriodicExternalVerifyDialog.vue`
- Modify: `src/views/periodic/components/PeriodicConfirmDialog.vue`
- Modify: `src/views/periodic/components/PeriodicForwardConfirmDialog.vue`
- Modify: `src/views/periodic/components/PeriodicJudgementDialog.vue`
- Modify: `src/views/periodic/components/PeriodicVerifyDialog.vue`
- Modify: `src/views/periodic/components/PeriodicScrapDisposalDialog.vue`
- Modify: `src/views/periodic/components/PeriodicResponsibleScrapConfirmDialog.vue`
- Modify: `src/views/periodic/components/PeriodicSupplierFillDialog.vue`
- Modify: `src/views/periodic/components/PeriodicScrapTrackingDecisionDialog.vue`

- [x] **Step 1: Add workspace tab padding**

Add the scoped rule:

```css
.workspace-task-tabs :deep(.ant-tabs-nav) {
  padding: 0 18px;
}
```

- [x] **Step 2: Assign modal close ownership**

Add `:closable="false"` to the opening `a-modal` tag in each listed dialog. Do not change `@cancel`, button handlers, footer settings, or content.

- [x] **Step 3: Run focused tests and verify GREEN**

Run the two contract tests from Task 1. Expected: both pass.

### Task 3: Regression and visual verification

**Files:**
- Verify: all modified production files and tests

- [x] **Step 1: Run automated verification**

```powershell
npm test
npm run typecheck
npm run build -- --outDir .codex-layout-build-20260809
git diff --check
```

Expected: zero exit codes; existing Vite chunk warnings are allowed.

- [x] **Step 2: Verify in the browser**

Confirm at desktop and narrow widths that the todo tab is inset by `18px`, custom action dialogs have no X, normal dialogs retain X, and no Vue console errors occur.
