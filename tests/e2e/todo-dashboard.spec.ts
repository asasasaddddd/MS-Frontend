import { expect, test, type Page, type Route } from '@playwright/test'

type BusinessType = 'FIRST_CHECK' | 'PERIODIC' | 'CHANGE' | 'SAMPLING' | 'PRODUCT_SUPPORT'

interface DashboardRow {
  businessType: BusinessType
  pendingActionCount: number
  containerCount: number
  affectedItemCount: number
  affectedItemUnit: 'device' | 'material'
}

interface DashboardFixture {
  snapshotAt: string
  overview: {
    pendingActionCount: number
    todayNewActionCount: number
  }
  businessRows: DashboardRow[]
}

interface ApiOptions {
  dashboard?: DashboardFixture
  dashboardError?: { code: number; message: string }
}

const user = {
  token: 'todo-dashboard-e2e-token',
  employeeId: 'U03016119',
  employeeName: '测试主管',
  roleCode: 'DEPT_LEADER',
  roleName: '分厂主管领导',
  roles: ['DEPT_LEADER'],
  deptId: 'G10030500',
  deptName: '测试分厂',
  groupId: '',
  groupName: '',
  homePath: '/todo'
}

const emptyRows: DashboardRow[] = [
  row('FIRST_CHECK'),
  row('PERIODIC'),
  row('CHANGE'),
  row('SAMPLING'),
  row('PRODUCT_SUPPORT', 0, 0, 0, 'material')
]

function row(
  businessType: BusinessType,
  pendingActionCount = 0,
  containerCount = 0,
  affectedItemCount = 0,
  affectedItemUnit: 'device' | 'material' = 'device'
): DashboardRow {
  return {
    businessType,
    pendingActionCount,
    containerCount,
    affectedItemCount,
    affectedItemUnit
  }
}

function dashboardWith(override: DashboardRow, todayNewActionCount = 1): DashboardFixture {
  const businessRows = emptyRows.map((item) => (
    item.businessType === override.businessType ? override : item
  ))
  return {
    snapshotAt: '2026-08-15T10:30:00',
    overview: {
      pendingActionCount: businessRows.reduce((sum, item) => sum + item.pendingActionCount, 0),
      todayNewActionCount
    },
    businessRows
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

async function installSession(page: Page) {
  await page.addInitScript((storedUser) => {
    localStorage.setItem('ms-frontend.login-user', JSON.stringify(storedUser))
  }, user)
}

async function installApi(page: Page, options: ApiOptions) {
  await page.route('http://127.0.0.1:5173/api/**', async (route) => {
    const url = new URL(route.request().url())
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
    if (path === '/workflow/todo-dashboard') {
      if (options.dashboardError) {
        await fulfillJson(route, null, options.dashboardError.code, options.dashboardError.message)
      } else {
        await fulfillJson(route, options.dashboard)
      }
      return
    }
    if (path === '/workflow/tasks') {
      await fulfillJson(route, { records: [], total: 0, current: 1, size: 200, pages: 0 })
      return
    }
    if (path === '/workflow/todo-containers') {
      await fulfillJson(route, [])
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

    await fulfillJson(route, null)
  })
}

async function openDashboard(page: Page, options: ApiOptions) {
  await installSession(page)
  await installApi(page, options)
  await page.goto('/todo', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.workspace-dashboard')).toBeVisible()
}

async function contentCenterX(locator: ReturnType<Page['locator']>) {
  return locator.evaluate((node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    const rect = range.getBoundingClientRect()
    return rect.left + rect.width / 2
  })
}

test('renders one conserved action-first snapshot on desktop and mobile', async ({ page }) => {
  await openDashboard(page, {
    dashboard: dashboardWith(row('CHANGE', 3, 3, 5), 2)
  })

  await expect(page.locator('.dashboard-metric--pending')).toContainText('3')
  await expect(page.locator('.dashboard-metric--today')).toContainText('2')
  await expect(page.getByRole('combobox', { name: '业务类型筛选' })).toBeVisible()
  const changeRow = page.getByRole('row', { name: /状态变更/ })
  await expect(changeRow).toContainText('3 项')
  await expect(changeRow).toContainText('3 张')
  await expect(changeRow).toContainText('5 台')
  await expect(page.locator('.dashboard-table tbody tr')).toHaveCount(5)

  const headers = page.locator('.dashboard-table thead th')
  const changeCells = changeRow.locator('td')
  for (const [headerIndex, cellIndex] of [[1, 0], [2, 1], [3, 2], [4, 3]] as const) {
    const headerCenter = await contentCenterX(headers.nth(headerIndex))
    const cellCenter = await contentCenterX(changeCells.nth(cellIndex))
    expect(Math.abs(headerCenter - cellCenter)).toBeLessThanOrEqual(2)
  }
  await page.screenshot({ path: 'test-results/todo-dashboard-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.dashboard-table')).toBeVisible()
  const overflow = await page.locator('.dashboard-table-panel').evaluate((node) => ({
    scrollWidth: node.scrollWidth,
    clientWidth: node.clientWidth
  }))
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  await expect(page.getByRole('button', { name: '查看状态变更待办' })).toBeVisible()
  await page.screenshot({ path: 'test-results/todo-dashboard-mobile.png', fullPage: true })
})

test('counts five physical periodic actions without inflating the plan count', async ({ page }) => {
  await openDashboard(page, {
    dashboard: dashboardWith(row('PERIODIC', 5, 1, 5), 5)
  })

  await expect(page.locator('.dashboard-metric--pending')).toContainText('5')
  const periodicRow = page.getByRole('row', { name: /周检计划/ })
  await expect(periodicRow).toContainText('5 项')
  await expect(periodicRow).toContainText('1 张')
  await expect(periodicRow).toContainText('5 台')
})

test('shows unavailable counts and retry when the dashboard request fails', async ({ page }) => {
  await openDashboard(page, {
    dashboardError: { code: 500, message: 'TODO_DASHBOARD_UNAVAILABLE' }
  })

  await expect(page.getByRole('button', { name: /重\s*试/ })).toBeVisible()
  await expect(page.locator('.dashboard-table')).toContainText('--')
  await expect(page.locator('.dashboard-table')).not.toContainText('0 项')
  await expect(page.locator('.dashboard-metric--pending')).toContainText('--')
})
