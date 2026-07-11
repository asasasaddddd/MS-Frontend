<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { login, toLoginUser } from '@/api/auth'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  employeeId: '',
  password: 'Metrology@2024'
})

const rules = {
  employeeId: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  await formRef.value?.validate()
  loading.value = true

  try {
    const response = await login({
      employeeId: form.employeeId.trim(),
      password: form.password
    })
    const user = toLoginUser(response)
    session.setUser(user)
    message.success(`欢迎回来，${user.employeeName}`)

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(redirect || user.homePath || '/todo')
  } catch (error) {
    const content = error instanceof Error ? error.message : '登录失败，请检查工号和密码'
    message.error(content)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-aside" aria-label="系统信息">
      <div class="brand-block">
        <div class="brand-mark">M</div>
        <div>
          <p class="brand-kicker">Metrology System</p>
          <h1>计量设备管理系统</h1>
        </div>
      </div>

      <div class="aside-copy">
        <p class="copy-title">统一待办、检定流转、扫码交接</p>
        <p class="copy-text">
          登录后系统会按后端返回的角色和首页路径进入对应工作台，请求会自动携带 token 与用户上下文。
        </p>
      </div>

      <div class="aside-footer">
        <span>后端接口</span>
        <strong>POST /api/auth/login</strong>
      </div>
    </section>

    <section class="login-panel" aria-label="登录表单">
      <div class="panel-card">
        <div class="panel-heading">
          <h2>工号登录</h2>
          <p>请输入后端系统中的工号和密码</p>
        </div>

        <a-alert
          class="login-note"
          type="info"
          show-icon
          message="默认密码支持工号本身或 Metrology@2024"
        />

        <a-form
          ref="formRef"
          class="login-form"
          layout="vertical"
          :model="form"
          :rules="rules"
          @finish="handleLogin"
        >
          <a-form-item label="工号" name="employeeId">
            <a-input
              v-model:value="form.employeeId"
              size="large"
              autocomplete="username"
              placeholder="例如：U00109024 / SUPERADMIN"
            />
          </a-form-item>

          <a-form-item label="密码" name="password">
            <a-input-password
              v-model:value="form.password"
              size="large"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
          </a-form-item>

          <a-button
            class="login-button"
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
          >
            登录
          </a-button>
        </a-form>

        <div class="contract-list">
          <div>
            <span>登录成功返回</span>
            <strong>token / roleCode / homePath</strong>
          </div>
          <div>
            <span>请求鉴权</span>
            <strong>Authorization + X-User-*</strong>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(380px, 46%) 1fr;
  background: #f3f5f8;
}

.login-aside {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 56px;
  color: #ffffff;
  background:
    linear-gradient(140deg, rgba(7, 21, 37, 0.98), rgba(15, 51, 88, 0.96)),
    repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 18px);
}

.login-aside::after {
  content: "";
  position: absolute;
  inset: auto -120px -160px auto;
  width: 360px;
  height: 360px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  transform: rotate(18deg);
}

.brand-block {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 18px;
  align-items: center;
}

.brand-mark {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #1769e0;
  color: #ffffff;
  font-size: 28px;
  font-weight: 800;
  box-shadow: 0 16px 36px rgba(23, 105, 224, 0.35);
}

.brand-kicker {
  margin: 0 0 6px;
  color: #b8c7dc;
  font-size: 13px;
}

.brand-block h1 {
  margin: 0;
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
}

.aside-copy {
  position: relative;
  z-index: 1;
  max-width: 520px;
}

.copy-title {
  margin: 0 0 16px;
  color: #ffffff;
  font-size: 34px;
  font-weight: 800;
  line-height: 1.25;
}

.copy-text {
  margin: 0;
  color: #d6e1ef;
  font-size: 16px;
  line-height: 1.8;
}

.aside-footer {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}

.aside-footer span {
  color: #b8c7dc;
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.panel-card {
  width: min(440px, 100%);
  padding: 34px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(23, 32, 51, 0.1);
}

.panel-heading h2 {
  margin: 0 0 8px;
  color: #172033;
  font-size: 24px;
  font-weight: 800;
}

.panel-heading p {
  margin: 0;
  color: #667085;
}

.login-note {
  margin: 22px 0;
}

.login-form {
  margin-top: 8px;
}

.login-button {
  margin-top: 6px;
  height: 42px;
  font-weight: 700;
}

.contract-list {
  display: grid;
  gap: 10px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5eaf1;
}

.contract-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #667085;
  font-size: 13px;
}

.contract-list strong {
  color: #172033;
  font-size: 13px;
  font-weight: 700;
  text-align: right;
}

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-aside {
    min-height: 280px;
    padding: 32px;
  }

  .copy-title {
    margin-top: 48px;
    font-size: 26px;
  }

  .login-panel {
    padding: 24px;
  }
}

@media (max-width: 520px) {
  .login-aside {
    padding: 24px;
  }

  .panel-card {
    padding: 24px;
  }

  .contract-list div {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
