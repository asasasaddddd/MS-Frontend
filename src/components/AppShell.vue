<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons-vue'
import { logout as logoutApi } from '@/api/auth'
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
const roleOptions = computed(() =>
  userRoleCodes.value.map((code) => ({
    label: `${session.user?.employeeName || session.user?.employeeId || ''} · ${roleNameMap[code] || code}`,
    value: code
  }))
)
const operatorSelectorLabel = computed(() => session.user?.employeeName || session.user?.employeeId || '-')

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

function handleRoleChange(nextRole: string) {
  const nextItem = findNavItemForRoleDisplay(route.path, nextRole)
  session.switchRole(nextRole)
  const nextPath = nextItem?.roles.some((role) => role === nextRole)
    ? nextItem.path
    : getFirstNavPathForRole(nextRole)
  if (nextPath && nextPath !== route.path) {
    router.push(nextPath)
  }
  message.success(`已切换为${roleNameMap[nextRole] || nextRole}`)
}

function handleMenuClick({ key }: { key: string }) {
  if (key && key !== route.path) {
    router.push(key)
  }
}

function handleOpenChange(keys: unknown[]) {
  openKeys.value = keys.map(String)
}

async function handleLogout() {
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
        <a-sub-menu v-for="section in sections" :key="section.key">
          <template #title>
            <span>{{ section.title }}</span>
          </template>
          <a-menu-item v-for="item in section.items" :key="item.path">
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
          <TodoNotificationBell />
          <a-select
            class="role-select"
            :value="roleCode"
            :options="roleOptions"
            :disabled="roleOptions.length <= 1"
            @change="handleRoleChange"
          >
            <template #labelRender>
              <span>{{ operatorSelectorLabel }}</span>
            </template>
          </a-select>
          <a-button class="logout-button" @click="handleLogout">退出</a-button>
        </div>
      </a-layout-header>

      <a-layout-content class="app-content">
        <router-view :key="route.fullPath" />
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

.role-select {
  width: 280px;
}

.role-select :deep(.ant-select-selector) {
  height: 40px !important;
  align-items: center;
  border-radius: 8px;
}

.role-select :deep(.ant-select-selection-item) {
  color: #172033;
  font-size: 14px;
  line-height: 38px !important;
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

  .role-select {
    width: 180px;
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
    justify-content: flex-end;
  }

  .role-select {
    width: auto;
    min-width: 0;
    flex: 1;
  }

  .app-content {
    min-height: calc(100vh - 112px);
    padding: 12px 10px 20px;
  }
}
</style>
