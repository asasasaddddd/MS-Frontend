<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { DownOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { logout as logoutApi } from '@/api/auth'
import { runRoleSwitchTransaction } from '@/components/appShellRoleSwitch'
import TodoNotificationBell from '@/components/workflow/TodoNotificationBell.vue'
import { useNavSections, findNavItem, findNavItemForRoleDisplay, getFirstNavPathForRole } from '@/composables/useNavSections'
import { useAppStore } from '@/stores/app'
import { useSessionStore } from '@/stores/session'
import { useTodoNotificationStore } from '@/stores/todoNotification'
import { roleNameMap } from '@/types/common'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const session = useSessionStore()
const todoNotifications = useTodoNotificationStore()

const roleCode = computed(() => session.user?.roleCode)
const userRoleCodes = computed(() => session.user?.roles?.length ? session.user.roles : roleCode.value ? [roleCode.value] : [])
const currentRoleNavCodes = computed(() => roleCode.value ? [roleCode.value] : [])
const sections = useNavSections(currentRoleNavCodes, roleCode)
const selectedKeys = computed(() => [route.path])
const openKeys = ref<string[]>([])
const roleSwitching = ref(false)
const viewActive = ref(true)
/** 当前视口是否必须使用窄屏折叠侧栏，避免固定侧栏覆盖业务内容。 */
const narrowViewport = ref(false)
/** 桌面沿用用户偏好，窄屏始终使用 72px 折叠侧栏。 */
const effectiveSidebarCollapsed = computed(() => narrowViewport.value || app.sidebarCollapsed)
/** 浏览器媒体查询实例，仅在组件挂载期间存在。 */
let narrowViewportQuery: MediaQueryList | null = null

watch(
  sections,
  (nextSections) => {
    openKeys.value = nextSections.map((section) => section.key)
  },
  { immediate: true }
)

const activeItem = computed(() => findNavItem(route.path))
const pageTitle = computed(() => String(route.meta.title || activeItem.value?.title || '待办事项'))
const breadcrumbText = computed(() => {
  if (route.meta.breadcrumb) {
    return String(route.meta.breadcrumb)
  }
  return `首页 / 工作台 / ${pageTitle.value}`
})
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

watch(
  () => [session.user?.employeeId, session.user?.roleCode] as const,
  ([userId, roleCode]) => todoNotifications.activate(userId, roleCode),
  { immediate: true }
)

/**
 * 将媒体查询结果同步为响应式侧栏状态。
 *
 * @param event 浏览器媒体查询变化事件或首次读取的查询实例。
 */
function syncNarrowViewport(event: MediaQueryListEvent | MediaQueryList) {
  narrowViewport.value = event.matches
}

async function handleRoleChange(nextRole: string) {
  if (roleSwitching.value || nextRole === roleCode.value) return

  const previousRole = roleCode.value
  if (!previousRole) return

  const previousFullPath = route.fullPath
  const currentPath = route.path
  const nextItem = findNavItemForRoleDisplay(currentPath, nextRole)
  const nextPath = nextItem?.roles.some((role) => role === nextRole)
    ? nextItem.path
    : getFirstNavPathForRole(nextRole)

  await runRoleSwitchTransaction({
    previousRole,
    nextRole,
    pause: () => {
      viewActive.value = false
      roleSwitching.value = true
    },
    flush: () => nextTick(),
    switchRole: (role) => session.switchRole(role),
    navigate: async () => {
      if (!nextPath || nextPath === currentPath) return
      const navigationFailure = await router.push(nextPath)
      if (navigationFailure) {
        throw navigationFailure
      }
    },
    rollbackNavigate: async () => {
      if (route.fullPath === previousFullPath) return
      const rollbackFailure = await router.replace(previousFullPath)
      if (rollbackFailure) {
        throw rollbackFailure
      }
    },
    resume: () => {
      viewActive.value = true
      roleSwitching.value = false
    }
  })

  message.success(`已切换为${roleNameMap[nextRole] || nextRole}`)
}

async function handleRoleMenuClick({ key }: { key: string | number }) {
  const nextRole = String(key)
  if (roleSwitching.value || nextRole === roleCode.value) return

  try {
    await handleRoleChange(nextRole)
  } catch (error) {
    const reason = error instanceof Error ? error.message : '未知错误'
    message.error(`角色切换失败：${reason}`)
  }
}

function handleMenuClick({ key }: { key: string }) {
  if (roleSwitching.value) return
  if (key && key !== route.path) {
    router.push(key)
  }
}

function handleOpenChange(keys: unknown[]) {
  openKeys.value = keys.map(String)
}

async function handleLogout() {
  if (roleSwitching.value) return
  try {
    await logoutApi()
  } catch {
    message.warning('后端登出未确认，本地会话已清理')
  } finally {
    session.clear()
    router.replace('/login')
  }
}

onMounted(() => {
  narrowViewportQuery = window.matchMedia('(max-width: 900px)')
  syncNarrowViewport(narrowViewportQuery)
  narrowViewportQuery.addEventListener('change', syncNarrowViewport)
})

onBeforeUnmount(() => {
  todoNotifications.deactivate()
  narrowViewportQuery?.removeEventListener('change', syncNarrowViewport)
  narrowViewportQuery = null
})
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-sider
      class="app-sider"
      :width="232"
      :collapsed-width="72"
      :collapsed="effectiveSidebarCollapsed"
      :trigger="null"
    >
      <div class="sider-brand" :class="{ collapsed: effectiveSidebarCollapsed }">
        <div class="brand-mark">M</div>
        <div v-if="!effectiveSidebarCollapsed" class="brand-copy">
          <strong>计量设备</strong>
          <span>管理系统</span>
        </div>
      </div>

      <a-menu
        class="sider-menu"
        theme="dark"
        mode="inline"
        :selected-keys="selectedKeys"
        :open-keys="openKeys"
        @openChange="handleOpenChange"
        @click="handleMenuClick"
      >
        <a-sub-menu
          v-for="section in sections"
          :key="section.key"
          :disabled="roleSwitching"
        >
          <template #title>
            <span>{{ section.title }}</span>
          </template>
          <a-menu-item
            v-for="item in section.items"
            :key="item.path"
            :disabled="roleSwitching"
          >
            {{ item.title }}
          </a-menu-item>
        </a-sub-menu>
      </a-menu>
    </a-layout-sider>

    <a-layout class="app-main" :class="{ collapsed: effectiveSidebarCollapsed }">
      <a-layout-header class="app-header">
        <div class="header-left">
          <a-button class="collapse-button" type="text" @click="app.toggleSidebar()">
            <MenuUnfoldOutlined v-if="app.sidebarCollapsed" />
            <MenuFoldOutlined v-else />
          </a-button>
          <div>
            <div class="breadcrumb">{{ breadcrumbText }}</div>
            <h1>{{ pageTitle }}</h1>
          </div>
        </div>

        <div class="header-right">
          <span class="notification-bell-slot">
            <TodoNotificationBell v-if="!roleSwitching" />
          </span>
          <a-tooltip placement="bottom">
            <template #title>
              <div class="operator-tooltip">
                <div>部门：{{ operatorDepartment }}</div>
                <div>组：{{ operatorGroup }}</div>
              </div>
            </template>
            <span class="operator-identity-trigger">
              <span class="operator-identity" aria-hidden="true">{{ operatorName }}</span>
              <span class="sr-only">
                姓名：{{ operatorName }}，部门：{{ operatorDepartment }}，组：{{ operatorGroup }}
              </span>
            </span>
          </a-tooltip>
          <a-dropdown
            placement="bottomRight"
            :trigger="['click']"
            :disabled="roleMenuItems.length <= 1 || roleSwitching"
          >
            <a-button
              class="role-switch-button"
              :loading="roleSwitching"
              aria-haspopup="menu"
            >
              <span class="role-switch-label">{{ currentRoleName }}</span>
              <DownOutlined />
            </a-button>
            <template #overlay>
              <a-menu :items="roleMenuItems" @click="handleRoleMenuClick" />
            </template>
          </a-dropdown>
          <a-button
            class="logout-button"
            :disabled="roleSwitching"
            @click="handleLogout"
          >退出</a-button>
        </div>
      </a-layout-header>

      <a-layout-content class="app-content">
        <router-view v-if="viewActive" :key="pageIdentityKey" />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f3f5f8;
}

.app-sider {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 20;
  height: 100vh;
  overflow: hidden auto;
  background: #071525;
  box-shadow: 8px 0 24px rgba(7, 21, 37, 0.12);
}

.sider-brand {
  height: 72px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.sider-brand.collapsed {
  justify-content: center;
  padding: 0;
}

.brand-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 8px;
  background: #1769e0;
  font-weight: 800;
}

.brand-copy {
  display: grid;
  line-height: 1.2;
}

.brand-copy strong {
  font-size: 16px;
}

.brand-copy span {
  color: #9caec4;
  font-size: 12px;
}

.sider-menu {
  padding: 12px 8px 20px;
  background: transparent;
}

.app-main {
  min-width: 0;
  min-height: 100vh;
  margin-left: 232px;
  transition: margin-left 0.2s ease;
}

.app-main.collapsed {
  margin-left: 72px;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid #e5eaf1;
  background: #ffffff;
  line-height: normal;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.header-left > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.collapse-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  color: #172033;
}

.breadcrumb {
  margin-bottom: 6px;
  color: #667085;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}

.app-header h1 {
  margin: 0;
  color: #172033;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.notification-bell-slot {
  width: 36px;
  height: 36px;
  display: inline-flex;
  flex: 0 0 auto;
}

.operator-identity-trigger {
  min-width: 0;
  display: inline-flex;
}

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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.operator-tooltip {
  display: grid;
  gap: 4px;
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

.role-switch-label {
  min-width: 0;
  overflow: hidden;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-button {
  height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  color: #172033;
}

.app-content {
  min-height: calc(100vh - 72px);
  padding: 20px 24px 28px;
  background: #f3f5f8;
}

@media (max-width: 900px) {
  .app-main,
  .app-main.collapsed {
    margin-left: 72px;
  }

  .app-header {
    padding: 0 14px;
  }

  .breadcrumb {
    display: none;
  }

  .header-right {
    gap: 8px;
  }

  .operator-identity {
    max-width: 96px;
  }

  .role-switch-button {
    width: 112px;
  }
}

@media (max-width: 600px) {
  .app-header {
    height: auto;
    min-height: 72px;
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px;
  }

  .header-left,
  .header-right {
    width: 100%;
  }

  .header-right {
    gap: 4px;
    justify-content: flex-end;
  }

  .operator-identity {
    max-width: 88px;
  }

  .role-switch-button {
    width: 108px;
  }

  .logout-button {
    padding: 0 8px;
  }

  .app-content {
    min-height: calc(100vh - 112px);
    padding: 12px 10px 20px;
  }
}
</style>
