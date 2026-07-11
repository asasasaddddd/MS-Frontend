import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { roleNameMap, type LoginUser } from '@/types/common'

const STORAGE_KEY = 'ms-frontend.login-user'

function readStoredUser(): LoginUser | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const user = JSON.parse(raw) as LoginUser
    return {
      ...user,
      roles: user.roles?.length ? user.roles : [user.roleCode]
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const useSessionStore = defineStore('session', () => {
  const user = ref<LoginUser | null>(readStoredUser())
  const token = computed(() => user.value?.token || '')
  const isLoggedIn = computed(() => Boolean(user.value?.token))

  function setUser(nextUser: LoginUser) {
    const roles = nextUser.roles?.length ? nextUser.roles : [nextUser.roleCode]
    const normalized = { ...nextUser, roles }
    user.value = normalized
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  }

  function switchRole(roleCode: string) {
    if (!user.value) return
    if (!user.value.roles?.includes(roleCode)) return
    user.value = {
      ...user.value,
      roleCode,
      roleName: roleNameMap[roleCode] || roleCode
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user.value))
  }

  function clear() {
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    user,
    token,
    isLoggedIn,
    setUser,
    switchRole,
    clear
  }
})
