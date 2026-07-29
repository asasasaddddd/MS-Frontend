# Personnel Permission Modal Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the personnel permission modal within the viewport and make its long form and grant table scroll inside stable, responsive containers.

**Architecture:** Retain the existing permission editor and business logic. Add a modal-specific wrapper for Ant Design Vue portal styles, make the body the vertical scroll owner, and add a dedicated horizontal scroll owner around the grant table.

**Tech Stack:** Vue 3 single-file components, Ant Design Vue 4, scoped CSS with `:global()`, Node contract tests, TypeScript, Vite

---

### Task 1: Lock the responsive layout contract

**Files:**
- Create: `tests/systemPermissionModalLayout.test.ts`
- Test: `src/views/system/SystemPermissionView.vue`

- [ ] **Step 1: Write the failing contract test**

```ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../src/views/system/SystemPermissionView.vue', import.meta.url),
  'utf8',
)

assert.match(source, /wrap-class-name="permission-config-modal"/)
assert.match(source, /width="min\(1120px, calc\(100vw - 32px\)\)"/)
assert.match(source, /\.permission-config-modal \.ant-modal-content[\s\S]*max-height:\s*calc\(100vh - 32px\)/)
assert.match(source, /\.permission-config-modal \.ant-modal-body[\s\S]*overflow-y:\s*auto/)
assert.match(source, /\.permission-editor[\s\S]*min-width:\s*0/)
assert.match(source, /\.role-assignment-row[\s\S]*flex-wrap:\s*wrap/)
assert.match(source, /\.two-column-grid\s*>\s*\*[\s\S]*min-width:\s*0/)
assert.match(source, /class="grant-table-scroll"[\s\S]*<a-table/)
assert.match(source, /\.grant-table-scroll[\s\S]*overflow-x:\s*auto/)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types tests/systemPermissionModalLayout.test.ts`

Expected: FAIL on the missing `permission-config-modal` contract.

### Task 2: Bound the modal and isolate overflow

**Files:**
- Modify: `src/views/system/SystemPermissionView.vue`
- Test: `tests/systemPermissionModalLayout.test.ts`

- [ ] **Step 1: Add the responsive modal identity and width**

Change the personnel permission modal opening tag to include:

```vue
wrap-class-name="permission-config-modal"
width="min(1120px, calc(100vw - 32px))"
```

- [ ] **Step 2: Give the grant table a horizontal scroll owner**

Wrap the existing table without changing its props or slots:

```vue
<div class="grant-table-scroll">
  <a-table :scroll="{ x: 1060 }">
    <!-- existing table content -->
  </a-table>
</div>
```

- [ ] **Step 3: Add modal and form overflow constraints**

Add the following scoped/global rules to `SystemPermissionView.vue`:

```css
:global(.permission-config-modal) {
  overflow: hidden;
}

:global(.permission-config-modal .ant-modal) {
  top: 16px;
  max-width: calc(100vw - 32px);
  padding-bottom: 16px;
}

:global(.permission-config-modal .ant-modal-content) {
  display: flex;
  max-height: calc(100vh - 32px);
  flex-direction: column;
  overflow: hidden;
}

:global(.permission-config-modal .ant-modal-body) {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.permission-editor,
.editor-section,
.backend-preview,
.grant-list-section,
.two-column-grid > *,
.role-assignment-row > * {
  min-width: 0;
}

.role-assignment-row {
  flex-wrap: wrap;
}

.grant-table-scroll {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --experimental-strip-types tests/systemPermissionModalLayout.test.ts`

Expected: PASS with no output.

### Task 3: Verify regression and runtime behavior

**Files:**
- Verify: `src/views/system/SystemPermissionView.vue`
- Verify: `tests/systemPermissionModalLayout.test.ts`

- [ ] **Step 1: Run all automated checks**

Run: `npm test`

Expected: all frontend contract test files pass.

Run: `npm run typecheck`

Expected: `vue-tsc --noEmit` exits with code 0.

Run: `npm run build`

Expected: Vite production build exits with code 0.

- [ ] **Step 2: Verify the modal in the browser**

At 1263x720, 1024x768, and 1440x900, open `/system/permissions`, select a user, and open the personnel permission modal. Confirm the modal stays within 16px vertical viewport margins, the document has no horizontal overflow, the body scrolls independently, the table scroll stays local, and the bottom controls remain reachable.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check`

Expected: no whitespace errors. Confirm that only the layout contract, modal markup/styles, and design/plan documentation changed; do not stage or modify the existing ZIP files.
