import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/views/firstcheck/FirstCheckSupplierView.vue', import.meta.url), 'utf8')
const categorySource = readFileSync(new URL('../src/views/firstcheck/components/FirstCheckCategoryDialog.vue', import.meta.url), 'utf8')
const typeSource = readFileSync(new URL('../src/types/firstcheck.ts', import.meta.url), 'utf8')

assert.match(source, /supplierName:\s*form\.supplierName\.trim\(\)/)
assert.doesNotMatch(source, /form\.usageScenario/)
assert.doesNotMatch(source, /printPage|>打印</)
assert.match(source, /getAllowedOrganizationTree/)
assert.match(source, /AllowedOrganizationNodeVO/)
assert.doesNotMatch(source, /listSystemOrgs|SysOrgVO|buildScopeOrganizationTree/)
assert.match(source, /responsibilityOrgId:\s*''/)
assert.match(source, /getAllowedOrganizationTree\(\)/)
assert.match(
  source,
  /function mapAllowedOrganizationNode\(node:\s*AllowedOrganizationNodeVO\)[\s\S]*?node\.orgFullPath[\s\S]*?node\.orgType[\s\S]*?children:\s*\(node\.children\s*\|\|\s*\[\]\)\.map\(mapAllowedOrganizationNode\)/
)
assert.match(source, /<a-tree-select[\s\S]*v-model:value="form\.responsibilityOrgId"/)
assert.match(source, /责任部门\/组/)
assert.match(source, /responsibilityOrgId:\s*form\.responsibilityOrgId/)
assert.doesNotMatch(source, /\bapplyDept(?:Id|Name)\b/)
assert.doesNotMatch(source, /质检组|质量检验组|电站服务组/)

assert.match(
  typeSource,
  /interface FirstCheckOrder[\s\S]*?responsibilityOrgId\?:\s*string[\s\S]*?responsibilityOrgName\?:\s*string[\s\S]*?responsibilityOrgType\?:\s*'DEPARTMENT'\s*\|\s*'GROUP'/
)
assert.match(typeSource, /interface StartFirstCheckRequest[\s\S]*?responsibilityOrgId:\s*string/)
assert.match(typeSource, /interface StartFirstCheckRequest[\s\S]*?applyDeptId\?:\s*string/)
assert.match(typeSource, /interface StartFirstCheckRequest[\s\S]*?applyDeptName\?:\s*string/)
assert.equal([...typeSource.matchAll(/reportFileId\?:\s*AttachmentId/g)].length, 2)
assert.doesNotMatch(typeSource, /reportFileId\?:\s*number/)

assert.match(categorySource, /previewTaskCandidates/)
assert.match(categorySource, /TaskCandidateVO/)
assert.doesNotMatch(categorySource, /listUsersByDeptAndRole|SysUserVO/)
assert.match(categorySource, /order\?\.responsibilityOrgId/)
assert.match(categorySource, /order\?\.responsibilityOrgType/)
assert.match(categorySource, /order\?\.responsibilityOrgName/)
assert.match(categorySource, /order\?\.applyDeptId/)
assert.match(categorySource, /businessType:\s*'FIRST_CHECK'/)
assert.match(categorySource, /nodeCode:\s*'engineer_route'/)
assert.match(categorySource, /operationCode:\s*'SUBMIT_RETURN'/)
assert.match(categorySource, /permissionCode:\s*'first_check\.main\.engineer_route\.submit_return'/)
assert.match(categorySource, /requiredRoleCode:\s*'RESPONSIBLE_ENGINEER'/)
assert.match(categorySource, /scopeType:\s*responsibilityOrg\.orgType/)
assert.match(categorySource, /scopeOrgId:\s*responsibilityOrg\.orgId/)
assert.match(categorySource, /responsibilityOrg\.orgType\s*===\s*'GROUP'/)
assert.match(categorySource, /audienceMode:\s*'EXACT'/)
assert.match(categorySource, /audienceMode:\s*'SUBTREE'/)
assert.match(categorySource, /user\.userName\s*\|\|\s*user\.userId/)
assert.match(categorySource, /value:\s*user\.userId/)
assert.match(categorySource, /requestSerial\s*!==\s*engineerRequestSerial/)
assert.match(
  categorySource,
  /const requestSerial\s*=\s*\+\+engineerRequestSerial[\s\S]*?engineers\.value\s*=\s*\[\][\s\S]*?form\.responsibleEngineerId\s*=\s*undefined[\s\S]*?if\s*\(!responsibilityOrg\)/
)
assert.match(
  categorySource,
  /const canSubmit\s*=\s*computed\(\(\)\s*=>\s*Boolean\([\s\S]*?!loadingUsers\.value[\s\S]*?form\.responsibleEngineerId[\s\S]*?engineers\.value\.some\(\(user\)\s*=>\s*user\.userId\s*===\s*form\.responsibleEngineerId\)[\s\S]*?\)\)/
)
assert.match(
  categorySource,
  /const engineer\s*=\s*engineers\.value\.find\(\(user\)\s*=>\s*user\.userId\s*===\s*form\.responsibleEngineerId\)[\s\S]*?if\s*\(!engineer\)\s*\{[^}]*message\.(?:warning|error)\([^}]*return[^}]*\}/
)
assert.match(categorySource, /responsibleEngineerId:\s*engineer\.userId/)
assert.doesNotMatch(categorySource, /engineer\?\.userName\s*\|\|\s*form\.responsibleEngineerId/)
assert.match(categorySource, /if\s*\(!users\.length\)[\s\S]*?message\.(?:warning|error)/)
assert.match(categorySource, /reportFileId:\s*undefined as AttachmentId \| undefined/)
assert.doesNotMatch(categorySource, /reportFileId:\s*undefined as number \| undefined/)

const responsibilityResolverStart = categorySource.indexOf('function resolveResponsibilityOrganization')
const responsibilityResolverEnd = categorySource.indexOf('\nasync function loadEngineerUsers', responsibilityResolverStart)
assert.ok(responsibilityResolverStart >= 0 && responsibilityResolverEnd > responsibilityResolverStart)
const responsibilityResolverSource = categorySource.slice(responsibilityResolverStart, responsibilityResolverEnd)
assert.match(
  responsibilityResolverSource,
  /order\?\.responsibilityOrgId\s*&&[\s\S]*?order\.responsibilityOrgType\s*===\s*'DEPARTMENT'[\s\S]*?order\.responsibilityOrgType\s*===\s*'GROUP'/,
  'new responsibility organization must be accepted only with a supported organization type'
)
assert.doesNotMatch(
  responsibilityResolverSource,
  /if\s*\(order\?\.responsibilityOrgId\)\s*\{[\s\S]*?return null/,
  'an invalid new organization tuple must not block the legacy department fallback'
)
assert.ok(
  responsibilityResolverSource.indexOf('if (!order?.applyDeptId) return null')
    > responsibilityResolverSource.indexOf("order.responsibilityOrgType === 'GROUP'"),
  'legacy applyDeptId fallback must run after validating the new organization tuple'
)

const closeStart = categorySource.indexOf('function close()')
const closeEnd = categorySource.indexOf('\nfunction display', closeStart)
const closeSource = categorySource.slice(closeStart, closeEnd)
assert.match(categorySource, /let submitRequestSerial\s*=\s*0/)
assert.match(
  categorySource,
  /function invalidateSubmitRequest\(\)[\s\S]*?submitRequestSerial\s*\+=\s*1[\s\S]*?submitting\.value\s*=\s*false/
)
assert.match(closeSource, /invalidateSubmitRequest\(\)[\s\S]*?emit\('update:open', false\)/)
assert.match(
  categorySource,
  /function isCurrentSubmitRequest\([\s\S]*?props\.open[\s\S]*?request\.serial\s*===\s*submitRequestSerial[\s\S]*?props\.order\?\.id\s*===\s*request\.orderId[\s\S]*?props\.taskId\s*===\s*request\.taskId/,
  'submit completion must be guarded by open state, serial, order identity, and task identity'
)

const submitStart = categorySource.indexOf('async function submit()')
const submitEnd = categorySource.indexOf('\nwatch(', submitStart)
assert.ok(submitStart >= 0 && submitEnd > submitStart)
const submitSource = categorySource.slice(submitStart, submitEnd)
assert.match(
  submitSource,
  /const request\s*=\s*\{[\s\S]*?serial:\s*\+\+submitRequestSerial[\s\S]*?orderId:\s*order\.id[\s\S]*?taskId:\s*props\.taskId[\s\S]*?taskRowVersion:\s*props\.taskRowVersion[\s\S]*?\}/,
  'submit must capture an immutable request identity before awaiting the API'
)
assert.match(submitSource, /orderId:\s*request\.orderId/)
assert.match(submitSource, /taskId:\s*request\.taskId/)
assert.match(submitSource, /taskRowVersion:\s*request\.taskRowVersion/)
assert.match(
  submitSource,
  /await confirmCategoryFirstCheck\([\s\S]*?if\s*\(!isCurrentSubmitRequest\(request\)\)\s*return[\s\S]*?message\.success[\s\S]*?emit\('success'\)[\s\S]*?close\(\)/,
  'a stale successful request must not notify, refresh, or close a newer dialog session'
)
assert.match(
  submitSource,
  /catch\s*\(error\)\s*\{\s*if\s*\(!isCurrentSubmitRequest\(request\)\)\s*return\s*message\.error/,
  'a stale failed request must not show an error in a newer dialog session'
)
assert.match(
  submitSource,
  /finally\s*\{\s*if\s*\(isCurrentSubmitRequest\(request\)\)\s*submitting\.value\s*=\s*false\s*\}/,
  'a stale request must not clear the submitting state owned by a newer request'
)

const watchStart = categorySource.indexOf('\nwatch(', submitEnd)
const watchEnd = categorySource.indexOf('\n</script>', watchStart)
const watchSource = categorySource.slice(watchStart, watchEnd)
assert.match(watchSource, /props\.open[\s\S]*?props\.order\?\.id[\s\S]*?props\.taskId/)
assert.match(
  watchSource,
  /async\s*\(\[open\]\)\s*=>\s*\{\s*invalidateSubmitRequest\(\)/,
  'closing, switching orders/tasks, and reopening must invalidate any older submit request'
)

const engineerLoaderStart = categorySource.indexOf('async function loadEngineerUsers')
const engineerLoaderEnd = categorySource.indexOf('\nfunction resetForm', engineerLoaderStart)
const engineerLoaderSource = categorySource.slice(engineerLoaderStart, engineerLoaderEnd)
assert.doesNotMatch(
  engineerLoaderSource,
  /if\s*\(form\.responsibleEngineerId\s*&&/,
  'candidate loading clears the previous engineer ID up front, so later preservation logic is unreachable'
)
assert.match(
  categorySource,
  /if\s*\(!responsibilityOrg\)\s*\{[^}]*loadingUsers\.value\s*=\s*false[^}]*return[^}]*\}/
)
assert.match(
  categorySource,
  /catch\s*\(error\)\s*\{[^}]*engineers\.value\s*=\s*\[\][^}]*form\.responsibleEngineerId\s*=\s*undefined[^}]*message\.error\(error instanceof Error \? error\.message[^}]*\}/
)
assert.match(categorySource, /授权范围[\s\S]*?主组可不同/)
assert.doesNotMatch(categorySource, /质检组|质量检验组|电站服务组/)
assert.match(categorySource, /usageScenario:\s*form\.usageScenario\.trim\(\)\s*\|\|\s*undefined/)
assert.match(source, /router\.push\(\{ path: '\/label\/print', query: \{ mode: 'pending' \} \}\)/)
