<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { listUsersByDeptAndRole, type SysUserVO } from '../../../api/system'
import { displayValue } from '../periodicDisplayModel'
import type { PeriodicTaskVO } from '../../../types/periodic'

const props = withDefaults(
  defineProps<{
    open: boolean
    task?: PeriodicTaskVO | null
    submitting?: boolean
  }>(),
  {
    submitting: false
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { confirmerId: string; confirmerName: string; opinion?: string }]
}>()

const loadingUsers = ref(false)
const confirmers = ref<SysUserVO[]>([])
const confirmerId = ref<string>()
const opinion = ref('报告待确认，转办确认员判定')

const confirmerOptions = computed(() =>
  confirmers.value.map((user) => ({
    label: `${user.employeeName || user.employeeId} · ${user.employeeId}`,
    value: user.employeeId
  }))
)

function close() {
  emit('update:open', false)
}

async function loadConfirmers() {
  const deptId = props.task?.deptId
  if (!deptId) {
    confirmers.value = []
    return
  }
  loadingUsers.value = true
  try {
    confirmers.value = await listUsersByDeptAndRole(deptId, 'CONFIRMER')
  } catch (error) {
    confirmers.value = []
    message.warning(error instanceof Error ? error.message : '确认员列表加载失败')
  } finally {
    loadingUsers.value = false
  }
}

function submit() {
  const selected = confirmers.value.find((user) => user.employeeId === confirmerId.value)
  emit('submit', {
    confirmerId: confirmerId.value || '',
    confirmerName: selected?.employeeName || confirmerId.value || '',
    opinion: opinion.value
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    confirmerId.value = undefined
    opinion.value = '报告待确认，转办确认员判定'
    void loadConfirmers()
  }
)
</script>

<template>
  <a-modal :open="open" width="720px" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / 周检报告转办</div>
          <strong>管理员转办确认员</strong>
        </div>
        <div class="dialog-title-actions">
          <a-button @click="close">取消</a-button>
          <a-button type="primary" :loading="submitting" @click="submit">提交</a-button>
        </div>
      </div>
    </template>

    <div class="form-page">
      <section class="panel">
        <div class="panel-header">
          <h2>设备信息</h2>
          <a-tag class="tag orange">报告待转办</a-tag>
        </div>
        <div class="info-grid">
          <div><span>周检编号</span><strong>{{ displayValue(task?.taskNo) }}</strong></div>
          <div><span>计量编号</span><strong>{{ displayValue(task?.deviceCode) }}</strong></div>
          <div><span>设备名称</span><strong>{{ displayValue(task?.deviceName) }}</strong></div>
          <div><span>使用部门</span><strong>{{ displayValue(task?.deptName) }}</strong></div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>确认员选择</h2>
        </div>
        <div class="form-grid">
          <label>
            <span>确认员</span>
            <a-select
              v-model:value="confirmerId"
              :loading="loadingUsers"
              :options="confirmerOptions"
              placeholder="请选择确认员"
              show-search
              option-filter-prop="label"
            />
          </label>
          <label>
            <span>转办意见</span>
            <a-textarea v-model:value="opinion" :rows="3" />
          </label>
        </div>
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.dialog-title,
.dialog-title-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dialog-title {
  justify-content: space-between;
}

.dialog-breadcrumb {
  margin-bottom: 4px;
  color: #667085;
  font-size: 12px;
  font-weight: 400;
}

.form-page {
  display: grid;
  gap: 14px;
  background: #f3f5f8;
}

.panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel-header {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.info-grid > div {
  min-height: 74px;
  padding: 14px;
  border-right: 1px solid #e5eaf1;
}

.info-grid > div:last-child {
  border-right: 0;
}

.info-grid span,
.form-grid span {
  display: block;
  margin-bottom: 6px;
  color: #667085;
  font-size: 12px;
}

.info-grid strong {
  color: #172033;
  font-size: 15px;
}

.form-grid {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

@media (max-width: 860px) {
  .dialog-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-grid > div {
    border-right: 0;
    border-bottom: 1px solid #e5eaf1;
  }
}
</style>
