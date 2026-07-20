import type { RoleCode } from '@/types/common'
import type { WorkflowNode, WorkflowTask } from '@/types/workflow'

export type WorkflowModule = 'firstcheck' | 'periodic' | 'change'

export const businessTypeAliases: Record<WorkflowModule, string[]> = {
  firstcheck: ['first_check', 'FIRST_CHECK', 'firstcheck', 'FIRSTCHECK'],
  periodic: ['periodic', 'PERIODIC'],
  change: ['change', 'CHANGE']
}

export const firstCheckNodes: WorkflowNode[] = [
  { code: 'supplier_submit', name: '供应商提交', module: 'firstcheck', roles: ['SUPPLIER'], api: 'POST /api/firstcheck/start' },
  { code: 'manager_check', name: '待分类', module: 'firstcheck', roles: ['MEASURE_ADMIN'], api: 'POST /api/firstcheck/confirm-category' },
  { code: 'dept_leader_approve', name: '主管领导审批', module: 'firstcheck', roles: ['DEPT_LEADER'], api: 'POST /api/firstcheck/dept-leader-approve' },
  { code: 'engineer_confirm_type', name: '责任工程师确认', module: 'firstcheck', roles: ['RESPONSIBLE_ENGINEER'], api: 'POST /api/firstcheck/engineer-confirm-type' },
  { code: 'verifier_receive', name: '检定员扫码接收', module: 'firstcheck', roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'], api: '公共扫码模块' },
  { code: 'external_sendout', name: '外扩人员外委送出', module: 'firstcheck', roles: ['EXTERNAL_OPERATOR'], api: 'POST /api/scan/firstcheck/sendout' },
  { code: 'verifier_return_verify', name: '检定员外委送回接收', module: 'firstcheck', roles: ['VERIFIER_EXTERNAL'], api: 'POST /api/scan/firstcheck/sendout-return' },
  { code: 'verifier_verify', name: '检定员录入', module: 'firstcheck', roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'], api: 'POST /api/firstcheck/verifier-verify' },
  { code: 'manager_forward', name: '待转办', module: 'firstcheck', roles: ['MEASURE_ADMIN'], api: 'POST /api/firstcheck/manager-forward' },
  { code: 'confirmer_confirm', name: '确认员确认', module: 'firstcheck', roles: ['CONFIRMER'], api: 'POST /api/firstcheck/confirmer-confirm' },
  { code: 'assign_code', name: '待赋码', module: 'firstcheck', roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'], api: 'POST /api/firstcheck/assign-code' }
]

export const periodicNodes: WorkflowNode[] = [
  { code: 'plan_confirm', name: '待实物交接', module: 'periodic', roles: ['MEASURE_ADMIN', 'VERIFIER_SELF', 'VERIFIER_EXTERNAL'], api: '管理员异常分流 / 检定员扫码接收' },
  { code: 'send_out', name: '外委送出', module: 'periodic', roles: ['EXTERNAL_OPERATOR'], api: 'POST /api/periodic/external-send-out' },
  { code: 'send_out_return', name: '外委送回', module: 'periodic', roles: ['VERIFIER_EXTERNAL'], api: 'POST /api/periodic/send-out-return' },
  { code: 'supplier_fill_info', name: '外扩人员填写检定信息', module: 'periodic', roles: ['EXTERNAL_OPERATOR'], api: 'POST /api/periodic/supplier-fill-info' },
  { code: 'verifier_fill_info', name: '否通用设备检定信息', module: 'periodic', roles: ['VERIFIER_EXTERNAL'], api: 'POST /api/periodic/verifier-fill-info' },
  { code: 'responsible_second_judge', name: '责任工程师二次判定', module: 'periodic', roles: ['RESPONSIBLE_ENGINEER'], api: 'POST /api/periodic/responsible-second-judge' },
  { code: 'external_third_judge', name: '外委检定员三次判定', module: 'periodic', roles: ['VERIFIER_EXTERNAL'], api: 'POST /api/periodic/second-judge' },
  { code: 'manager_forward_confirm', name: '管理员转办确认员', module: 'periodic', roles: ['MEASURE_ADMIN'], api: 'POST /api/periodic/manager-forward-confirm' },
  { code: 'confirmer_confirm', name: '确认员判定', module: 'periodic', roles: ['CONFIRMER'], api: 'POST /api/periodic/confirmer-confirm' },
  { code: 'exception_disposal', name: '异常处置', module: 'periodic', roles: ['MEASURE_ADMIN'], api: '系统自动' }
]

export const changeNodes: WorkflowNode[] = [
  { code: 'submit', name: '变更申请', module: 'change', roles: ['MEASURE_ADMIN'], api: 'POST /api/change/submit' },
  { code: 'dept_leader_approve', name: '部门审批', module: 'change', roles: ['DEPT_LEADER'], api: 'POST /api/change/approve' },
  { code: 'measure_leader_review', name: '计量领导审批', module: 'change', roles: ['MEASURE_LEADER'], api: 'POST /api/change/approve' },
  { code: 'responsible_engineer_review', name: '责任工程师审核', module: 'change', roles: ['RESPONSIBLE_ENGINEER'], api: 'POST /api/change/approve' },
  { code: 'receive_dept_leader_confirm', name: '接收部门主管确认', module: 'change', roles: ['DEPT_LEADER'], api: 'POST /api/change/approve' },
  { code: 'receive_admin_confirm', name: '接收管理员确认', module: 'change', roles: ['MEASURE_ADMIN'], api: 'POST /api/change/approve' },
  { code: 'verifier_handle', name: '检定员处理', module: 'change', roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'], api: 'POST /api/change/verifier-handle' }
]

export const workflowNodes: Record<WorkflowModule, WorkflowNode[]> = {
  firstcheck: firstCheckNodes,
  periodic: periodicNodes,
  change: changeNodes
}

export const workflowNodeGroups = {
  firstcheck: {
    supplier: ['supplier_submit'],
    admin: ['manager_check'],
    leader: ['dept_leader_approve'],
    engineer: ['engineer_confirm_type'],
    verifier: ['verifier_receive', 'verifier_return_verify', 'verifier_verify', 'assign_code'],
    externalOperator: ['external_sendout'],
    confirmer: ['confirmer_confirm']
  },
  periodic: {
    admin: ['plan_confirm', 'manager_forward_confirm'],
    selfVerifier: ['plan_confirm', 'verification_record'],
    externalVerifier: [
      'plan_confirm',
      'send_out_return',
      'verifier_fill_info',
      'external_third_judge'
    ],
    responsibleEngineer: ['responsible_second_judge'],
    externalOperator: ['send_out', 'supplier_fill_info'],
    confirmer: ['confirmer_confirm']
  },
  change: {
    apply: ['submit'],
    approval: ['dept_leader_approve', 'measure_leader_review', 'responsible_engineer_review', 'receive_dept_leader_confirm'],
    receiveAdmin: ['receive_admin_confirm'],
    verifier: ['verifier_handle']
  }
} as const

export const changeNodeCodesByRole: Partial<Record<RoleCode, readonly string[]>> = {
  MEASURE_ADMIN: ['receive_admin_confirm'],
  DEPT_LEADER: ['dept_leader_approve', 'receive_dept_leader_confirm'],
  MEASURE_LEADER: ['measure_leader_review'],
  RESPONSIBLE_ENGINEER: ['responsible_engineer_review'],
  VERIFIER_SELF: ['verifier_handle'],
  VERIFIER_EXTERNAL: ['verifier_handle']
}

export function matchesBusinessType(value: string | undefined, module: WorkflowModule) {
  if (!value) return false
  return businessTypeAliases[module].some((item) => item.toLowerCase() === value.toLowerCase())
}

export function isPendingWorkflowTask(task: Pick<WorkflowTask, 'taskStatus'>) {
  if (!task.taskStatus) return true
  return String(task.taskStatus).toLowerCase() === 'pending'
}

export function getWorkflowNode(module: WorkflowModule, nodeCode?: string) {
  return workflowNodes[module].find((node) => node.code === nodeCode)
}

export function getWorkflowNodeName(module: WorkflowModule, nodeCode?: string, fallback = '-') {
  if (!nodeCode) return fallback
  return getWorkflowNode(module, nodeCode)?.name || fallback
}

export function getRoleWorkflowNodes(module: WorkflowModule, roleCode?: string) {
  if (!roleCode) return []
  return workflowNodes[module].filter((node) => node.roles.includes(roleCode as RoleCode))
}
