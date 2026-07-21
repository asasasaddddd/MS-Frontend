import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import LoginView from '@/views/LoginView.vue'
import WorkspaceTodoView from '@/views/WorkspaceTodoView.vue'
import { allNavItems, getFirstNavPathForRole, getFirstNavPathForRoles } from '@/composables/useNavSections'
import { useSessionStore } from '@/stores/session'
import type { RoleCode } from '@/types/common'

declare module 'vue-router' {
  interface RouteMeta {
    role?: RoleCode | RoleCode[]
    public?: boolean
    title?: string
    breadcrumb?: string
  }
}

const businessRoles: RoleCode[] = [
  'MEASURE_ADMIN',
  'VERIFIER_SELF',
  'VERIFIER_EXTERNAL',
  'CONFIRMER',
  'DEPT_LEADER',
  'RESPONSIBLE_ENGINEER',
  'EXTERNAL_OPERATOR',
  'PLANNER',
  'PURCHASE_WAREHOUSE',
  'MEASURE_LEADER',
  'SUPPLIER'
]

export const roleHomePathMap: Record<RoleCode, string> = {
  SUPER_ADMIN: '/system/permissions',
  MEASURE_ADMIN: '/todo',
  VERIFIER_SELF: '/todo',
  VERIFIER_EXTERNAL: '/todo',
  CONFIRMER: '/todo',
  DEPT_LEADER: '/todo',
  RESPONSIBLE_ENGINEER: '/todo',
  EXTERNAL_OPERATOR: '/todo',
  PLANNER: '/todo',
  PURCHASE_WAREHOUSE: '/todo',
  MEASURE_LEADER: '/todo',
  SUPPLIER: '/todo'
}

const componentByPath: Partial<Record<string, RouteRecordRaw['component']>> = {
  '/system/permissions': () => import('@/views/system/SystemPermissionView.vue'),
  '/firstcheck/admin': () => import('@/views/firstcheck/FirstCheckAdminView.vue'),
  '/firstcheck/verifier': () => import('@/views/firstcheck/FirstCheckVerifierView.vue'),
  '/firstcheck/engineer': () => import('@/views/firstcheck/FirstCheckEngineerView.vue'),
  '/firstcheck/leader': () => import('@/views/firstcheck/FirstCheckLeaderView.vue'),
  '/firstcheck/supplier': () => import('@/views/firstcheck/FirstCheckSupplierView.vue'),
  '/periodic/admin': () => import('@/views/periodic/PeriodicAdminView.vue'),
  '/periodic/verifier': () => import('@/views/periodic/PeriodicVerifierView.vue'),
  '/periodic/verifier-external': () => import('@/views/periodic/PeriodicVerifierExternalView.vue'),
  '/periodic/responsible-engineer': () => import('@/views/periodic/PeriodicResponsibleEngineerView.vue'),
  '/periodic/external-operator': () => import('@/views/periodic/PeriodicExternalOperatorView.vue'),
  '/periodic/confirmer': () => import('@/views/periodic/PeriodicConfirmerView.vue'),
  '/change/apply': () => import('@/views/change/ChangeApplyView.vue'),
  '/change/approval': () => import('@/views/change/ChangeDeptLeaderView.vue'),
  '/change/verifier': () => import('@/views/change/ChangeVerifierView.vue'),
  '/scan': () => import('@/views/scan/DeviceScanView.vue'),
  '/label/print': () => import('@/views/label/LabelPrintView.vue'),
  '/cost/list': () => import('@/views/cost/CostListView.vue'),
  '/device/ledger': () => import('@/views/device/DeviceLedgerView.vue'),
  '/sampling/plan': () => import('@/views/sampling/SamplingPlannerView.vue'),
  '/sampling/admin': () => import('@/views/sampling/SamplingAdminView.vue'),
  '/sampling/verifier': () => import('@/views/sampling/SamplingVerifierView.vue'),
  '/sampling/confirmer': () => import('@/views/sampling/SamplingConfirmerView.vue'),
  '/product-support/warehouse': () => import('@/views/product-support/ProductSupportWarehouseView.vue'),
  '/product-support/verifier': () => import('@/views/product-support/ProductSupportVerifierView.vue')
}

const metaByPath: Partial<Record<string, RouteRecordRaw['meta']>> = {
  '/system/permissions': {
    title: '人员角色配置',
    breadcrumb: '首页 / 权限管理 / 人员角色配置'
  },
  '/firstcheck/admin': {
    title: '首次检定待办',
    breadcrumb: '首页 / 工作台 / 首次检定'
  },
  '/firstcheck/verifier': {
    title: '首检待办详情',
    breadcrumb: '首页 / 工作台 / 首次检定'
  },
  '/firstcheck/engineer': {
    title: '首检单详情',
    breadcrumb: '首页 / 工作台 / 首次检定'
  },
  '/firstcheck/leader': {
    title: '主管领导待办',
    breadcrumb: '首页 / 工作台 / 首次检定'
  },
  '/firstcheck/supplier': {
    title: '测量设备首次使用申请流程',
    breadcrumb: '首页 / 工作台 / 首次检定'
  },
  '/periodic/admin': {
    title: '周检计量管理员详情单',
    breadcrumb: '首页 / 工作台 / 周检'
  },
  '/periodic/verifier': {
    title: '周检检定员详情单',
    breadcrumb: '首页 / 工作台 / 周检'
  },
  '/periodic/verifier-external': {
    title: '外委周检待办',
    breadcrumb: '首页 / 工作台 / 周检'
  },
  '/periodic/responsible-engineer': {
    title: '责任工程师周检二次判定',
    breadcrumb: '首页 / 工作台 / 周检'
  },
  '/periodic/external-operator': {
    title: '外扩周检待办',
    breadcrumb: '首页 / 工作台 / 周检'
  },
  '/periodic/confirmer': {
    title: '周检待办详情',
    breadcrumb: '首页 / 工作台 / 周检'
  },
  '/change/apply': {
    title: '状态变更申请',
    breadcrumb: '首页 / 设备管理 / 状态变更'
  },
  '/change/approval': {
    title: '状态变更待办',
    breadcrumb: '首页 / 设备管理 / 状态变更'
  },
  '/change/verifier': {
    title: '状态变更待办详情',
    breadcrumb: '首页 / 设备管理 / 状态变更'
  },
  '/scan': {
    title: '设备扫码',
    breadcrumb: '首页 / 设备管理 / 设备扫码'
  },
  '/label/print': {
    title: '标签打印',
    breadcrumb: '首页 / 设备管理 / 标签打印'
  },
  '/cost/list': {
    title: '费用管理',
    breadcrumb: '首页 / 设备管理 / 费用管理'
  },
  '/device/ledger': {
    title: '计量台账',
    breadcrumb: '首页 / 设备管理 / 计量台账'
  },
  '/sampling/plan': {
    title: 'C类物资抽检',
    breadcrumb: '首页 / 工作台 / C类物资抽检'
  },
  '/sampling/admin': {
    title: 'C类物资抽检',
    breadcrumb: '首页 / 工作台 / C类物资抽检'
  },
  '/sampling/verifier': {
    title: 'C类物资抽检',
    breadcrumb: '首页 / 工作台 / C类物资抽检'
  },
  '/sampling/confirmer': {
    title: 'C类物资抽检',
    breadcrumb: '首页 / 工作台 / C类物资抽检'
  },
  '/product-support/warehouse': {
    title: '产品配套送检清单',
    breadcrumb: '首页 / 工作台 / 产品配套检定'
  },
  '/product-support/verifier': {
    title: '产品配套待办详情',
    breadcrumb: '首页 / 工作台 / 产品配套检定'
  }
}

const navRoutes: RouteRecordRaw[] = allNavItems
  .filter((item) => item.path !== '/todo')
  .map((item) => ({
    path: item.path,
    name: `workspace-${item.path.replace(/\W+/g, '-').replace(/^-|-$/g, '')}`,
    component: componentByPath[item.path] || WorkspaceTodoView,
    meta: { role: item.roles, title: item.title, ...(metaByPath[item.path] || {}) }
  }))

const protectedRoutes: RouteRecordRaw[] = [
  {
    path: '/todo',
    name: 'todo',
    component: WorkspaceTodoView,
    meta: { role: businessRoles, title: '待办事项', breadcrumb: '首页 / 工作台 / 待办事项' }
  },
  ...navRoutes
]

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true, title: '登录' } },
  {
    path: '/',
    redirect: '/todo'
  },
  {
    path: '/',
    component: AppShell,
    children: protectedRoutes
  },
  { path: '/:pathMatch(.*)*', redirect: '/todo' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  const session = useSessionStore()

  if (!session.isLoggedIn && !to.meta.public) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (session.isLoggedIn && to.path === '/login') {
    return session.user?.homePath || getFirstNavPathForRoles(session.user?.roles)
  }

  const requiredRole = to.meta.role
  if (session.isLoggedIn && requiredRole && session.user) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const currentRole = session.user.roleCode
    if (!roles.some((role) => role === currentRole)) {
      return getFirstNavPathForRole(currentRole)
    }
  }

  return true
})

export default router
