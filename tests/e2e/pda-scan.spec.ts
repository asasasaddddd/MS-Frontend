import { expect, test, type Page, type Route } from '@playwright/test'

interface PeriodicInboxFixture {
  taskId: string
  planId: string
  taskNo: string
  taskType: string
  sourceType: string
  currentNodeName: string
  scanStatus: string
  scanAction: string
  scanScene: string
  scanCode: string
  deviceId: string
  deviceCode: string
  deviceName: string
  useDeptName: string
  applyTime: string
  scanned: boolean
  allowedActions: string[]
}

interface ApiFixtureOptions {
  periodicRows?: PeriodicInboxFixture[]
  submitError?: { code: number; message: string }
}

interface ApiFixtureState {
  submittedBodies: unknown[]
  submittedRequests: number
}

const user = {
  token: 'pda-e2e-token',
  employeeId: 'U03016119',
  employeeName: '王熙然',
  roleCode: 'VERIFIER_SELF',
  roleName: '自检检定员',
  roles: ['VERIFIER_SELF'],
  deptId: 'D-METROLOGY',
  deptName: '质检部',
  groupId: 'G-ASSEMBLY',
  groupName: '总装组',
  homePath: '/todo'
}

function periodicRow(overrides: Partial<PeriodicInboxFixture> = {}): PeriodicInboxFixture {
  return {
    taskId: 'PDA-TASK-001',
    planId: 'PDA-PLAN-001',
    taskNo: 'PLAN-2026-001',
    taskType: 'periodic',
    sourceType: 'PERIODIC',
    currentNodeName: '待检定员接收',
    scanStatus: 'wait_receive',
    scanAction: 'periodic-verifier-receive',
    scanScene: 'periodic_receive',
    scanCode: '0414000099',
    deviceId: 'DEVICE-001',
    deviceCode: '0414000099',
    deviceName: 'PDA 周检量具',
    useDeptName: '质检部总装组',
    applyTime: '2026-08-10T09:00:00',
    scanned: false,
    allowedActions: ['RECEIVE'],
    ...overrides
  }
}

function apiResponse(data: unknown, code = 200, message = 'ok') {
  return JSON.stringify({ code, message, data })
}

async function fulfillJson(route: Route, data: unknown, code = 200, message = 'ok') {
  await route.fulfill({
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: apiResponse(data, code, message)
  })
}

async function installSession(page: Page, pdaOnline?: boolean) {
  await page.addInitScript(({ storedUser, online }) => {
    localStorage.setItem('ms-frontend.login-user', JSON.stringify(storedUser))
    if (online === undefined) return

    let currentOnline = online
    window.MetrologyPda = {
      getClientMetadata: () => JSON.stringify({
        clientType: 'PDA',
        terminalCode: 'PDA-E2E-001',
        installId: 'e2e-install',
        appVersion: '1.0.0'
      }),
      isOnline: () => currentOnline,
      hideSoftKeyboard: () => undefined
    }
    ;(window as Window & { __setPdaOnline?: (value: boolean) => void }).__setPdaOnline = (value) => {
      currentOnline = value
      window.dispatchEvent(new Event(value ? 'online' : 'offline'))
    }
  }, { storedUser: user, online: pdaOnline })
}

async function installApi(page: Page, options: ApiFixtureOptions = {}): Promise<ApiFixtureState> {
  const state: ApiFixtureState = { submittedBodies: [], submittedRequests: 0 }
  let submitted = false

  await page.route('http://127.0.0.1:5173/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')

    if (path === '/auth/me') {
      await fulfillJson(route, {
        employeeId: user.employeeId,
        employeeName: user.employeeName,
        role: user.roleCode,
        roles: user.roles,
        deptId: user.deptId,
        deptName: user.deptName,
        groupId: user.groupId,
        groupName: user.groupName
      })
      return
    }
    if (path === '/workflow/notifications/stream') {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: 'event: connected\ndata: {}\n\n'
      })
      return
    }
    if (path === '/workflow/notifications/unread-count') {
      await fulfillJson(route, 0)
      return
    }
    if (path === '/workflow/notifications') {
      await fulfillJson(route, { records: [], total: 0, current: 1, size: 20, pages: 0 })
      return
    }
    if (path === '/scan/firstcheck/inbox' || path === '/change/scan-inbox') {
      await fulfillJson(route, [])
      return
    }
    if (path === '/periodic/scan/inbox') {
      await fulfillJson(route, submitted ? [] : (options.periodicRows || []))
      return
    }
    if (path === '/periodic/verifier-receive' && request.method() === 'POST') {
      state.submittedRequests += 1
      state.submittedBodies.push(request.postDataJSON())
      if (options.submitError) {
        await fulfillJson(route, null, options.submitError.code, options.submitError.message)
      } else {
        submitted = true
        await fulfillJson(route, null)
      }
      return
    }

    await fulfillJson(route, null)
  })
  return state
}

async function openScanPage(page: Page) {
  await page.goto('/scan', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.device-scan-page')).toBeVisible()
}

test('PDA side-key input uniquely matches, submits original content, refreshes and refocuses', async ({ page }) => {
  await installSession(page, true)
  const state = await installApi(page, { periodicRows: [periodicRow()] })
  await openScanPage(page)

  const table = page.locator('.ant-table-tbody')
  await expect(table).toContainText('周检')
  await expect(table).toContainText('待检定员接收')
  await expect(table).toContainText('检定员扫码接收')
  await expect(table).toContainText('0414000099')

  const capture = page.locator('.pda-capture-input')
  await expect(capture).toBeFocused()
  const raw = 'https://meter.example.com/device?deviceCode=0414000099'
  const submittedRequest = page.waitForRequest((request) => (
    request.method() === 'POST' && request.url().endsWith('/api/periodic/verifier-receive')
  ))
  await page.keyboard.type(raw)
  await page.keyboard.press('Enter')

  const request = await submittedRequest
  expect(request.headers()['x-client-type']).toBe('PDA')
  expect(request.headers()['x-terminal-code']).toBe('PDA-E2E-001')
  expect(request.headers()['x-client-version']).toBe('1.0.0')
  expect(request.headers()['x-user-id']).toBe(user.employeeId)
  await expect.poll(() => state.submittedRequests).toBe(1)
  expect(state.submittedBodies[0]).toMatchObject({
    taskId: 'PDA-TASK-001',
    scanCode: '0414000099',
    scanContent: raw
  })
  await expect(table).not.toContainText('0414000099')
  await expect(capture).toBeFocused()
})

test('PDA blocks zero and ambiguous matches without submitting business requests', async ({ page }) => {
  await installSession(page, true)
  const state = await installApi(page, {
    periodicRows: [
      periodicRow(),
      periodicRow({ taskId: 'PDA-TASK-002', deviceId: 'DEVICE-002', taskNo: 'PLAN-2026-002' })
    ]
  })
  await openScanPage(page)

  await page.keyboard.type('NO-SUCH-DEVICE')
  await page.keyboard.press('Enter')
  await expect(page.locator('.ant-message-notice-content').last()).toContainText('当前角色没有该设备的待扫码任务')
  expect(state.submittedRequests).toBe(0)

  await page.keyboard.type('0414000099')
  await page.keyboard.press('Enter')
  await expect(page.locator('.ant-message-notice-content').last()).toContainText('数据一致性异常')
  expect(state.submittedRequests).toBe(0)
  await expect(page.locator('.pda-capture-input')).toBeFocused()
})

test('PDA blocks offline scans before a backend request', async ({ page }) => {
  await installSession(page, false)
  const state = await installApi(page, { periodicRows: [periodicRow()] })
  await openScanPage(page)

  await expect(page.locator('.pda-station')).toContainText('网络已断开，业务扫码已停用')
  await page.keyboard.type('0414000099')
  await page.keyboard.press('Enter')
  await expect(page.locator('.ant-message-notice-content').last()).toContainText('网络已断开')
  expect(state.submittedRequests).toBe(0)
})

test('PDA shows the backend conflict and refreshes the authoritative inbox', async ({ page }) => {
  await installSession(page, true)
  const state = await installApi(page, {
    periodicRows: [periodicRow()],
    submitError: {
      code: 409,
      message: 'WORKFLOW_TASK_VERSION_CONFLICT: 待办已变化，请刷新后重试'
    }
  })
  await openScanPage(page)

  await page.keyboard.type('0414000099')
  await page.keyboard.press('Enter')
  const modal = page.locator('.ant-modal').filter({ hasText: 'WORKFLOW_TASK_VERSION_CONFLICT' })
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('待办已变化，请刷新后重试')
  await expect.poll(() => state.submittedRequests).toBe(1)
  await modal.locator('.ant-btn-primary').click()
  await expect(page.locator('.pda-capture-input')).toBeFocused()
})

test('ordinary browser keeps manual scanning and emits web client headers', async ({ page }) => {
  await installSession(page)
  const state = await installApi(page, { periodicRows: [periodicRow()] })
  await openScanPage(page)

  await expect(page.locator('.pda-station')).toHaveCount(0)
  await expect(page.locator('.filter-section')).toBeVisible()
  await page.locator('.code-link').click()
  const dialog = page.locator('.scan-dialog')
  await expect(dialog).toBeVisible()
  await dialog.locator('input').fill('0414000099')

  const submittedRequest = page.waitForRequest((request) => (
    request.method() === 'POST' && request.url().endsWith('/api/periodic/verifier-receive')
  ))
  await dialog.locator('.ant-btn-primary').click()
  const request = await submittedRequest
  expect(request.headers()['x-client-type']).toBe('web')
  expect(request.headers()['x-terminal-code']).toBe('WEB')
  await expect.poll(() => state.submittedRequests).toBe(1)
})
