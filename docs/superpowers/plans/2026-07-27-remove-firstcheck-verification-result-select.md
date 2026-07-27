# Remove First-Check Verification Result Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant first-check verification-result selector and derive the required result code from qualified and unqualified quantities.

**Architecture:** Add one pure result-derivation function and consume it while building the existing verifier submission payload. Keep the backend contract unchanged and remove only the redundant form state and select control.

**Tech Stack:** Vue 3, TypeScript, Ant Design Vue, Node contract tests.

---

### Task 1: Result derivation contract

**Files:**
- Create: `src/views/firstcheck/firstCheckVerificationResultModel.ts`
- Create: `tests/firstCheckVerificationResultDerivation.test.ts`

- [ ] **Step 1: Write the failing test**

Assert that `(1, 0)` returns `qualified`, `(0, 1)` returns `unqualified`, and `(1, 1)` returns `partial`. Also assert from the component source that the result selector is absent, qualified quantity has `:min="0"`, and payload construction calls `deriveVerificationResult`.

- [ ] **Step 2: Run the test to verify RED**

Run: `node --experimental-strip-types tests/firstCheckVerificationResultDerivation.test.ts`

Expected: FAIL because the result model does not exist and the selector is still present.

- [ ] **Step 3: Implement the pure derivation function**

```ts
export function deriveVerificationResult(
  qualifiedQuantity: number,
  unqualifiedQuantity: number
): VerificationResult {
  if (qualifiedQuantity > 0 && unqualifiedQuantity > 0) return 'partial'
  if (unqualifiedQuantity > 0) return 'unqualified'
  return 'qualified'
}
```

- [ ] **Step 4: Integrate the existing dialog**

Remove `form.verificationResult`, its reset assignment and the `<a-select>` block. Set `verificationResult` in `buildPayload` using `deriveVerificationResult(qualifiedQuantity, Number(form.unqualifiedQuantity || 0))`, and change the qualified quantity minimum from 1 to 0.

- [ ] **Step 5: Run the focused test to verify GREEN**

Run: `node --experimental-strip-types tests/firstCheckVerificationResultDerivation.test.ts`

Expected: PASS.

### Task 2: Regression verification

**Files:**
- Verify: `src/views/firstcheck/components/FirstCheckVerifyDialog.vue`
- Verify: `src/views/firstcheck/firstCheckVerificationResultModel.ts`
- Verify: `tests/firstCheckVerificationResultDerivation.test.ts`

- [ ] **Step 1: Run all frontend tests**

Run: `npm test`

Expected: all contract tests pass.

- [ ] **Step 2: Run type checking and build**

Run: `npm run typecheck`, then `npm run build`.

Expected: both commands exit with code 0.

- [ ] **Step 3: Check the scoped diff**

Run `git diff --check` for the files in this plan and confirm no unrelated changes are included.
