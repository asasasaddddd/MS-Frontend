<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { BellOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { useTodoNotificationStore } from '@/stores/todoNotification'
import { todoNotificationRoute } from '@/stores/todoNotificationModel'
import type { TodoNotification } from '@/types/todoNotification'

const router = useRouter()
const session = useSessionStore()
const todoNotifications = useTodoNotificationStore()
const { items, unreadCount, loading, connected } = storeToRefs(todoNotifications)
const hasUnread = computed(() => unreadCount.value > 0)

function formatCreatedAt(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value.replace('T', ' ') : date.toLocaleString('zh-CN', { hour12: false })
}

async function openNotification(item: TodoNotification) {
  if (!item.read) await todoNotifications.markRead(item.id)
  await router.push(todoNotificationRoute(item, session.user?.roleCode))
}

async function markAllRead() {
  if (!hasUnread.value) return
  await todoNotifications.markAllRead()
}
</script>

<template>
  <a-popover trigger="click" placement="bottomRight" overlay-class-name="todo-notification-popover">
    <template #content>
      <section class="notification-panel">
        <header>
          <div>
            <strong>待办消息</strong>
            <span :class="['connection-state', { connected }]">{{ connected ? '实时连接' : '正在重连' }}</span>
          </div>
          <a-button type="link" size="small" :disabled="!hasUnread" @click="markAllRead">全部已读</a-button>
        </header>

        <a-spin :spinning="loading">
          <div v-if="items.length > 0" class="notification-list">
            <button
              v-for="item in items"
              :key="String(item.id)"
              type="button"
              :class="['notification-item', { unread: !item.read }]"
              @click="openNotification(item)"
            >
              <span class="unread-dot"></span>
              <span class="notification-copy">
                <strong>{{ item.title }}</strong>
                <span>{{ item.content || `共 ${item.itemCount || 1} 条待办` }}</span>
                <small>{{ formatCreatedAt(item.createdAt) }}</small>
              </span>
            </button>
          </div>
          <a-empty v-else class="notification-empty" description="暂无待办消息" :image="null" />
        </a-spin>
      </section>
    </template>

    <a-badge :count="unreadCount" :overflow-count="99" :offset="[-2, 4]">
      <a-button class="notification-bell" type="text" aria-label="待办消息">
        <BellOutlined />
      </a-button>
    </a-badge>
  </a-popover>
</template>

<style scoped>
.notification-bell {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  color: #344054;
  font-size: 18px;
}

.notification-panel {
  width: min(380px, calc(100vw - 32px));
}

.notification-panel header,
.notification-panel header > div {
  display: flex;
  align-items: center;
}

.notification-panel header {
  justify-content: space-between;
  gap: 12px;
  padding: 4px 4px 10px;
  border-bottom: 1px solid #eaecf0;
}

.notification-panel header > div {
  gap: 8px;
}

.connection-state {
  color: #b54708;
  font-size: 11px;
}

.connection-state.connected {
  color: #027a48;
}

.notification-list {
  max-height: 420px;
  overflow: auto;
}

.notification-item {
  width: 100%;
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  gap: 10px;
  padding: 12px 4px;
  border: 0;
  border-bottom: 1px solid #f2f4f7;
  background: #ffffff;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.notification-item:hover {
  background: #f8fafc;
}

.unread-dot {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: transparent;
}

.notification-item.unread .unread-dot {
  background: #1570ef;
}

.notification-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.notification-copy strong {
  color: #172033;
  font-size: 13px;
}

.notification-copy > span,
.notification-copy small {
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.notification-copy small {
  color: #98a2b3;
  font-size: 11px;
}

.notification-empty {
  padding: 24px 0 16px;
}
</style>
