# Header Identity And Role Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate immutable employee identity from role switching and guarantee that every role change reloads the current page using the employee ID and active role without restricting cross-department task scopes.

**Architecture:** Extend the authentication context with the employee's primary group, then render the primary department/group only as read-only identity metadata. Use a route-component identity key composed from `route.fullPath`, `employeeId`, and `roleCode` as a global remount safety net; existing workflow composables continue to cancel stale requests and the backend remains authoritative for the union of all department/group scopes granted to the active role. Business initiation keeps deriving ownership from the selected device ledger record and does not add a department/group selector.

**Tech Stack:** Java 18, Spring Boot, JUnit 5, Mockito, Vue 3, TypeScript, Ant Design Vue, Node contract tests, Vite.

---

## File Map

Backend repository `F:/MetrologySystem/MetrologySystem`:

- Modify `metrology-security/src/main/java/com/system/metrologysystem/security/context/LoginUser.java`: add primary group identity to the token and `/api/auth/me` contract.
- Modify `metrology-security/src/main/java/com/system/metrologysystem/security/auth/vo/LoginResultVO.java`: return primary group identity at login.
- Modify `metrology-system-biz/src/main/java/com/system/metrologysystem/system/auth/LoginServiceImpl.java`: copy `SYS_USER.GROUP_ID/GROUP_NAME` into authentication objects.
- Modify `metrology-app/src/test/java/com/system/metrologysystem/system/SystemPermissionServiceTest.java`: verify login and token group data.

Frontend repository `F:/MetrologySystem/MS-Frontend`:

- Modify `src/types/common.ts`: persist group identity in `LoginUser`.
- Modify `src/api/auth.ts`: map group identity from login responses.
- Modify `src/components/AppShell.vue`: render the read-only name Tooltip, separate role dropdown, and identity-keyed router view.
- Create `tests/headerIdentityRoleSwitchContract.test.ts`: lock the display and global refresh contract.
- Modify `tests/appShellResponsiveContract.test.ts`: lock narrow-screen sizing and prevent header overlap regressions.

### Task 1: Carry Primary Group Through Authentication

**Files:**
- Modify: `F:/MetrologySystem/MetrologySystem/metrology-app/src/test/java/com/system/metrologysystem/system/SystemPermissionServiceTest.java`
- Modify: `F:/MetrologySystem/MetrologySystem/metrology-security/src/main/java/com/system/metrologysystem/security/context/LoginUser.java`
- Modify: `F:/MetrologySystem/MetrologySystem/metrology-security/src/main/java/com/system/metrologysystem/security/auth/vo/LoginResultVO.java`
- Modify: `F:/MetrologySystem/MetrologySystem/metrology-system-biz/src/main/java/com/system/metrologysystem/system/auth/LoginServiceImpl.java`

- [ ] **Step 1: Write the failing backend test**

In `loginReturnsAllEnabledRolesForMultiDutyUser()`, replace the existing user stub and add assertions:

```java
SysUserEntity loginUser = user("U00109024");
loginUser.setDeptId("G50169056");
loginUser.setDeptName("质检部");
loginUser.setGroupId("G50258838");
loginUser.setGroupName("材质检验组");
when(userMapper.selectOne(any())).thenReturn(loginUser);

assertThat(result.getGroupId()).isEqualTo("G50258838");
assertThat(result.getGroupName()).isEqualTo("材质检验组");
LoginUser tokenUser = tokenStore.get(result.getToken());
assertThat(tokenUser.getGroupId()).isEqualTo("G50258838");
assertThat(tokenUser.getGroupName()).isEqualTo("材质检验组");
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
.\mvnw.cmd -pl metrology-app -am -Dtest=SystemPermissionServiceTest -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: compilation fails because `LoginResultVO` and `LoginUser` have no group accessors.

- [ ] **Step 3: Add the minimal backend contract**

Add to `LoginUser`:

```java
private String groupId;
private String groupName;
```

Add to `LoginResultVO`:

```java
private String groupId;
private String groupName;
```

Add while building `loginUser` in `LoginServiceImpl.login()`:

```java
loginUser.setGroupId(user.getGroupId());
loginUser.setGroupName(user.getGroupName());
```

Add while building `result`:

```java
result.setGroupId(user.getGroupId());
result.setGroupName(user.getGroupName());
```

- [ ] **Step 4: Run the focused backend test and verify GREEN**

Run the same Maven command. Expected: `SystemPermissionServiceTest` passes.

- [ ] **Step 5: Commit only the authentication files**

```powershell
git add -- metrology-security/src/main/java/com/system/metrologysystem/security/context/LoginUser.java metrology-security/src/main/java/com/system/metrologysystem/security/auth/vo/LoginResultVO.java metrology-system-biz/src/main/java/com/system/metrologysystem/system/auth/LoginServiceImpl.java metrology-app/src/test/java/com/system/metrologysystem/system/SystemPermissionServiceTest.java
git commit -m "feat(auth): expose employee primary group"
```

### Task 2: Add The Header Identity And Global Role Refresh Contract

**Files:**
- Create: `F:/MetrologySystem/MS-Frontend/tests/headerIdentityRoleSwitchContract.test.ts`
- Modify: `F:/MetrologySystem/MS-Frontend/tests/appShellResponsiveContract.test.ts`

- [ ] **Step 1: Write the failing identity contract test**

Create `tests/headerIdentityRoleSwitchContract.test.ts`:

```typescript
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shell = readFileSync(new URL('../src/components/AppShell.vue', import.meta.url), 'utf8')
const auth = readFileSync(new URL('../src/api/auth.ts', import.meta.url), 'utf8')
const common = readFileSync(new URL('../src/types/common.ts', import.meta.url), 'utf8')

assert.match(common, /groupId:\s*string/)
assert.match(common, /groupName:\s*string/)
assert.match(auth, /groupId\?:\s*string/)
assert.match(auth, /groupName\?:\s*string/)
assert.match(auth, /groupId:\s*response\.groupId\s*\|\|\s*''/)
assert.match(auth, /groupName:\s*response\.groupName\s*\|\|\s*''/)
assert.match(shell, /class="operator-identity"/)
assert.match(shell, /<a-tooltip[\s\S]*?部门：[\s\S]*?组：/)
assert.match(shell, /class="role-switch-button"/)
assert.match(shell, /<a-dropdown[\s\S]*?<DownOutlined\s*\/>/)
assert.match(shell, /@click="handleRoleMenuClick"/)
assert.match(shell, /:disabled="roleMenuItems\.length <= 1"/)
assert.match(shell, /const pageIdentityKey = computed\(\(\) =>[\s\S]*?route\.fullPath[\s\S]*?employeeId[\s\S]*?roleCode/)
assert.match(shell, /<router-view\s+:key="pageIdentityKey"\s*\/>/)
assert.doesNotMatch(shell, /pageIdentityKey[\s\S]*?deptId/)
assert.doesNotMatch(shell, /class="role-select"/)
```

The `deptId` negative assertion is required: primary department is display metadata and must not become the active task-scope selector.

Also assert that this feature does not add an organization selector to `AppShell.vue`:

```typescript
assert.doesNotMatch(shell, /department-switch|group-switch|scope-org-select/)
```

- [ ] **Step 2: Extend the responsive contract before implementation**

Add to `tests/appShellResponsiveContract.test.ts`:

```typescript
assert.match(appShellSource, /\.operator-identity\s*\{[^}]*text-overflow:\s*ellipsis;/s)
assert.match(appShellSource, /\.role-switch-button\s*\{[^}]*height:\s*40px;/s)
assert.match(appShellSource, /@media \(max-width: 600px\)[\s\S]*?\.operator-identity/s)
assert.match(appShellSource, /@media \(max-width: 600px\)[\s\S]*?\.role-switch-button/s)
```

- [ ] **Step 3: Run both tests and verify RED**

Run:

```powershell
node --experimental-strip-types tests/headerIdentityRoleSwitchContract.test.ts
node --experimental-strip-types tests/appShellResponsiveContract.test.ts
```

Expected: assertions fail because the separated controls and identity-keyed router view do not exist.

### Task 3: Implement Frontend Identity, Role Button, And Page Remount

**Files:**
- Modify: `F:/MetrologySystem/MS-Frontend/src/types/common.ts`
- Modify: `F:/MetrologySystem/MS-Frontend/src/api/auth.ts`
- Modify: `F:/MetrologySystem/MS-Frontend/src/components/AppShell.vue`
- Test: `F:/MetrologySystem/MS-Frontend/tests/headerIdentityRoleSwitchContract.test.ts`
- Test: `F:/MetrologySystem/MS-Frontend/tests/appShellResponsiveContract.test.ts`

- [ ] **Step 1: Preserve group fields in the frontend session**

Add to `LoginUser`:

```typescript
groupId: string
groupName: string
```

Add to `LoginResponse`:

```typescript
groupId?: string
groupName?: string
```

Add to `toLoginUser()`:

```typescript
groupId: response.groupId || '',
groupName: response.groupName || '',
```

- [ ] **Step 2: Build immutable identity and role menu models**

Import `DownOutlined` in `AppShell.vue`, then replace `roleOptions` and `operatorSelectorLabel` with:

```typescript
const operatorName = computed(() => session.user?.employeeName || session.user?.employeeId || '-')
const operatorDepartment = computed(() => session.user?.deptName || '-')
const operatorGroup = computed(() => session.user?.groupName || '-')
const currentRoleName = computed(() => roleNameMap[roleCode.value || ''] || roleCode.value || '-')
const roleMenuItems = computed(() => userRoleCodes.value.map((code) => ({
  key: code,
  label: roleNameMap[code] || code,
  disabled: code === roleCode.value
})))
const pageIdentityKey = computed(() => [
  route.fullPath,
  session.user?.employeeId || '',
  roleCode.value || ''
].join('|'))

function handleRoleMenuClick({ key }: { key: string | number }) {
  const nextRole = String(key)
  if (nextRole !== roleCode.value) handleRoleChange(nextRole)
}
```

This key remounts the current business view when the role changes on the same URL. Existing composables' `onScopeDispose`/`AbortController` behavior cancels old requests; the backend candidate resolver still returns the union of all authorized organization scopes for that role.

- [ ] **Step 3: Replace the mixed role Select**

Use this template in `header-right` between the notification bell and logout button:

```vue
<a-tooltip placement="bottom">
  <template #title>
    <div class="operator-tooltip">
      <div>部门：{{ operatorDepartment }}</div>
      <div>组：{{ operatorGroup }}</div>
    </div>
  </template>
  <span class="operator-identity">{{ operatorName }}</span>
</a-tooltip>

<a-dropdown placement="bottomRight" :trigger="['click']" :disabled="roleMenuItems.length <= 1">
  <a-button class="role-switch-button">
    <span>{{ currentRoleName }}</span>
    <DownOutlined />
  </a-button>
  <template #overlay>
    <a-menu :items="roleMenuItems" @click="handleRoleMenuClick" />
  </template>
</a-dropdown>
```

Change the route outlet to:

```vue
<router-view :key="pageIdentityKey" />
```

- [ ] **Step 4: Add stable responsive styles**

Remove `.role-select` styles and add:

```css
.operator-identity {
  display: block;
  max-width: 140px;
  overflow: hidden;
  color: #172033;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-switch-button {
  width: 132px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-radius: 8px;
}
```

At `max-width: 900px`, cap the name at `96px` and the button at `112px`. At `max-width: 600px`, cap the name at `88px` and the button at `108px`; do not merge them.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```powershell
node --experimental-strip-types tests/headerIdentityRoleSwitchContract.test.ts
node --experimental-strip-types tests/appShellResponsiveContract.test.ts
```

Expected: both exit with code `0`.

- [ ] **Step 6: Run all frontend tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: all contract tests pass; `vue-tsc` and Vite complete without errors.

- [ ] **Step 7: Commit only the frontend feature files**

```powershell
git add -- src/types/common.ts src/api/auth.ts src/components/AppShell.vue tests/headerIdentityRoleSwitchContract.test.ts tests/appShellResponsiveContract.test.ts
git commit -m "feat(shell): separate identity and role switching"
```

### Task 4: Verify Cross-Department Roles And User Experience

**Files:**
- Verify only; no source file should change.

- [ ] **Step 1: Package the backend**

Run:

```powershell
.\mvnw.cmd -pl metrology-app -am -DskipTests package
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 2: Verify the authentication payload**

Log in as a multi-role user whose `SYS_USER` row has a primary department and group. Confirm `/api/auth/login` and `/api/auth/me` return the same `deptId`, `deptName`, `groupId`, and `groupName`.

- [ ] **Step 3: Verify desktop interaction at 1280 x 720**

Confirm in the browser:

```text
The name is visible and not clickable.
Hovering the name shows primary department and primary group.
The current-role button sits immediately to the right.
Only assigned roles appear in the menu.
Changing roles reloads the current business view without a browser refresh.
The old role's rows, selections, dialogs, and summary do not remain visible.
```

- [ ] **Step 4: Verify a cross-department role**

Use a user whose active role has grants in more than one department/group. Confirm:

```text
The Tooltip still shows only the user's primary department/group.
The todo list contains authorized tasks from every granted department/group.
Task rows retain their own department/group labels.
No frontend request parameter narrows the task list to the primary deptId.
Starting a business from a device uses that device's ledger department/group.
No extra department/group selector appears because of cross-scope authorization.
```

- [ ] **Step 5: Verify narrow layout at 390 x 844**

Confirm the bell, truncated name, role button, and logout control do not overlap or cause horizontal page overflow.

- [ ] **Step 6: Run final automated verification**

Run:

```powershell
.\mvnw.cmd -pl metrology-app -am -Dtest=SystemPermissionServiceTest -Dsurefire.failIfNoSpecifiedTests=false test
npm test
npm run build
```

Expected: backend focused tests, all frontend tests, type checking, and production build pass.
