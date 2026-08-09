import type { RoleCode } from '@/types/common'
import type { WorkflowNode, WorkflowTask } from '@/types/workflow'

export type WorkflowModule = 'firstcheck' | 'periodic' | 'change' | 'sampling' | 'productSupport'

export const businessTypeAliases: Record<WorkflowModule, string[]> = {
  firstcheck: ['first_check', 'FIRST_CHECK', 'firstcheck', 'FIRSTCHECK'],
  periodic: ['periodic', 'PERIODIC'],
  change: ['change', 'CHANGE'],
  sampling: ['sampling', 'SAMPLING'],
  productSupport: ['product_support', 'PRODUCT_SUPPORT', 'productSupport']
}

export const firstCheckNodes: WorkflowNode[] = [
  { code: 'supplier_submit', name: '供应商提交', summaryLabel: '待供应商提交', module: 'firstcheck', roles: ['SUPPLIER'], api: 'POST /api/firstcheck/start' },
  { code: 'manager_classify', name: '待分类', summaryLabel: '待分类', module: 'firstcheck', roles: ['MEASURE_ADMIN'], api: 'POST /api/firstcheck/confirm-category' },
  { code: 'manager_revise', name: '退回待修改', summaryLabel: '退回待修改', module: 'firstcheck', roles: ['MEASURE_ADMIN'], api: 'POST /api/firstcheck/confirm-category' },
  { code: 'dept_leader_approve', name: '主管领导审批', summaryLabel: '待主管领导审批', module: 'firstcheck', roles: ['DEPT_LEADER'], api: 'POST /api/firstcheck/dept-leader-approve' },
  { code: 'engineer_route', name: '责任工程师确认检定路径', summaryLabel: '待责任工程师确认', module: 'firstcheck', roles: ['RESPONSIBLE_ENGINEER'], api: 'POST /api/firstcheck/engineer-confirm-type' },
  { code: 'verifier_verify_assign', name: '检定录入与逐台赋码', summaryLabel: '待检定员处理', module: 'firstcheck', roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'], api: 'POST /api/firstcheck/verifier-verify-and-assign' }
]

/** 周检节点、处理角色与后端接口契约。 */
export const periodicNodes: WorkflowNode[] = [
  { code: 'system_issue', name: '系统下发', summaryLabel: '系统下发', module: 'periodic', roles: [], api: '系统自动' },
  { code: 'admin_exception_route', name: '管理员异常分流', summaryLabel: '待异常分流', module: 'periodic', roles: ['MEASURE_ADMIN'], api: 'POST /api/periodic/exception-change/submit' },
  { code: 'self_verify', name: '自检检定', summaryLabel: '待自检', module: 'periodic', roles: ['VERIFIER_SELF'], api: 'POST /api/periodic/self-verify' },
  { code: 'responsible_scrap_confirm', name: '责任工程师确认正常报废', summaryLabel: '待责任工程师确认正常报废', module: 'periodic', roles: ['RESPONSIBLE_ENGINEER'], api: 'POST /api/periodic/responsible-scrap-confirm' },
  { code: 'responsible_scrap_tracking_decision', name: '责任工程师判定是否进行不合格追踪', summaryLabel: '待责任工程师判定是否进行不合格追踪', module: 'periodic', roles: ['RESPONSIBLE_ENGINEER'], api: 'POST /api/periodic/responsible-scrap-tracking-decision' },
  { code: 'external_common_fill', name: '外扩账号填写通用设备检定信息', summaryLabel: '待外扩填写通用设备信息', module: 'periodic', roles: ['EXTERNAL_OPERATOR'], api: 'POST /api/periodic/external-common-fill' },
  { code: 'verifier_second_judge', name: '外委检定员二次判定', summaryLabel: '待外委检定员二次判定', module: 'periodic', roles: ['VERIFIER_EXTERNAL'], api: 'POST /api/periodic/judgements' },
  { code: 'responsible_second_judge', name: '责任工程师二次判定', summaryLabel: '待责任工程师二次判定', module: 'periodic', roles: ['RESPONSIBLE_ENGINEER'], api: 'POST /api/periodic/judgements' },
  { code: 'responsible_third_judge', name: '责任工程师三次判定', summaryLabel: '待责任工程师三次判定', module: 'periodic', roles: ['RESPONSIBLE_ENGINEER'], api: 'POST /api/periodic/judgements' },
  { code: 'verifier_third_judge', name: '外委检定员三次判定', summaryLabel: '待外委检定员三次判定', module: 'periodic', roles: ['VERIFIER_EXTERNAL'], api: 'POST /api/periodic/judgements' },
  { code: 'responsible_fourth_judge', name: '责任工程师四次判定', summaryLabel: '待责任工程师四次判定', module: 'periodic', roles: ['RESPONSIBLE_ENGINEER'], api: 'POST /api/periodic/judgements' },
  { code: 'verifier_scrap_disposal', name: '外委检定员报废处置', summaryLabel: '待外委检定员报废处置', module: 'periodic', roles: ['VERIFIER_EXTERNAL'], api: 'POST /api/periodic/scrap-disposal' },
  { code: 'external_uncommon_fill', name: '外委检定员填写否通用设备信息', summaryLabel: '待外委检定员填写否通用设备信息', module: 'periodic', roles: ['VERIFIER_EXTERNAL'], api: 'POST /api/periodic/external-uncommon-fill' },
  { code: 'manager_forward_confirm', name: '管理员转办确认员', summaryLabel: '待管理员转办', module: 'periodic', roles: ['MEASURE_ADMIN'], api: 'POST /api/periodic/manager-forward-confirm' },
  { code: 'confirmer_confirm', name: '确认员判定', summaryLabel: '待确认员确认', module: 'periodic', roles: ['CONFIRMER'], api: 'POST /api/periodic/confirmer-confirm' },
  { code: 'admin_take_back', name: '管理员取回', summaryLabel: '待管理员取回', module: 'periodic', roles: ['MEASURE_ADMIN'], api: 'POST /api/periodic/manager-take-back' }
]

export const changeNodes: WorkflowNode[] = [
  { code: 'admin_submit', name: '管理员发起', summaryLabel: '待管理员发起', module: 'change', roles: ['MEASURE_ADMIN'], api: 'POST /api/change/submit' },
  { code: 'manager_revise', name: '管理员修订', summaryLabel: '退回管理员修订', module: 'change', roles: ['MEASURE_ADMIN'], api: 'RESUBMIT POST /api/change/revise' },
  { code: 'dept_leader_approve', name: '部门审批', summaryLabel: '待分厂主管领导审批', module: 'change', roles: ['DEPT_LEADER'], api: 'POST /api/change/approve' },
  { code: 'measure_leader_review', name: '计量领导审批', summaryLabel: '待计量领导审批', module: 'change', roles: ['MEASURE_LEADER'], api: 'POST /api/change/approve' },
  { code: 'responsible_engineer_review', name: '责任工程师审核', summaryLabel: '待责任工程师审批', module: 'change', roles: ['RESPONSIBLE_ENGINEER'], api: 'POST /api/change/approve' },
  { code: 'receive_dept_leader_confirm', name: '接收部门主管确认', summaryLabel: '待接收部门主管确认', module: 'change', roles: ['DEPT_LEADER'], api: 'POST /api/change/approve' },
  { code: 'receive_admin_confirm', name: '接收管理员确认', summaryLabel: '待接收部门管理员确认', module: 'change', roles: ['MEASURE_ADMIN'], api: 'POST /api/change/approve' },
  { code: 'verifier_handle', name: '检定员处理', summaryLabel: '待检定员处理', module: 'change', roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'], api: 'POST /api/change/verifier-handle' },
  { code: 'manager_forward_confirm', name: '管理员转办确认员', summaryLabel: '待管理员转办', module: 'change', roles: ['MEASURE_ADMIN'] },
  { code: 'confirmer_confirm', name: '确认员确认', summaryLabel: '待确认员确认', module: 'change', roles: ['CONFIRMER'] },
  { code: 'label_print', name: '检定员打印标签', summaryLabel: '待检定员打印标签', module: 'change', roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'] },
  { code: 'admin_take_back', name: '管理员取回', summaryLabel: '待管理员取回', module: 'change', roles: ['MEASURE_ADMIN'] }
]

export const samplingNodes: WorkflowNode[] = [
  { code: 'admin_confirm', name: '管理员清点', summaryLabel: '待管理员确认', module: 'sampling', roles: ['MEASURE_ADMIN'] },
  { code: 'verifier_fill', name: '检定员检定', summaryLabel: '待检定员检定', module: 'sampling', roles: ['VERIFIER_SELF'] },
  { code: 'confirmer_confirm', name: '确认员判定', summaryLabel: '待确认员确认', module: 'sampling', roles: ['CONFIRMER'] }
]

export const productSupportNodes: WorkflowNode[] = [
  { code: 'verifier_fill', name: '检定员填写检定信息', summaryLabel: '待检定员填写检定信息', module: 'productSupport', roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'] }
]

export const workflowNodes: Record<WorkflowModule, WorkflowNode[]> = {
  firstcheck: firstCheckNodes,
  periodic: periodicNodes,
  change: changeNodes,
  sampling: samplingNodes,
  productSupport: productSupportNodes
}

/** 各业务角色在导航和待办路由中可见的节点集合。 */
export const workflowNodeGroups = {
  firstcheck: {
    supplier: ['supplier_submit'],
    admin: ['manager_classify', 'manager_revise'],
    leader: ['dept_leader_approve'],
    engineer: ['engineer_route'],
    verifier: ['verifier_verify_assign'],
    externalOperator: []
  },
  periodic: {
    admin: ['admin_exception_route', 'manager_forward_confirm', 'admin_take_back'],
    selfVerifier: ['self_verify'],
    externalVerifier: [
      'external_uncommon_fill',
      'verifier_second_judge',
      'verifier_third_judge',
      'verifier_scrap_disposal'
    ],
    responsibleEngineer: [
      'responsible_scrap_confirm',
      'responsible_scrap_tracking_decision',
      'responsible_second_judge',
      'responsible_third_judge',
      'responsible_fourth_judge'
    ],
    externalOperator: ['external_common_fill'],
    confirmer: ['confirmer_confirm']
  },
  change: {
    apply: ['admin_submit'],
    approval: ['dept_leader_approve', 'measure_leader_review', 'responsible_engineer_review', 'receive_dept_leader_confirm'],
    receiveAdmin: ['manager_revise', 'receive_admin_confirm'],
    verifier: ['verifier_handle']
  }
} as const

export const firstCheckNodeCodesByRole: Partial<Record<RoleCode, readonly string[]>> = {
  MEASURE_ADMIN: workflowNodeGroups.firstcheck.admin,
  DEPT_LEADER: workflowNodeGroups.firstcheck.leader,
  RESPONSIBLE_ENGINEER: workflowNodeGroups.firstcheck.engineer,
  VERIFIER_SELF: workflowNodeGroups.firstcheck.verifier,
  VERIFIER_EXTERNAL: workflowNodeGroups.firstcheck.verifier,
  EXTERNAL_OPERATOR: workflowNodeGroups.firstcheck.externalOperator
}

export function matchesBusinessType(value: string | undefined, module: WorkflowModule) {
  if (!value) return false
  return businessTypeAliases[module].some((item) => item.toLowerCase() === value.toLowerCase())
}

export function isPendingWorkflowTask(task: Pick<WorkflowTask, 'taskStatus'>) {
  if (!task.taskStatus) return true
  return String(task.taskStatus).toLowerCase() === 'pending'
}

export function matchesWorkflowTaskRole(
  task: Pick<WorkflowTask, 'requiredRoleCode'>,
  _module: WorkflowModule,
  roleCode?: string
) {
  if (!roleCode) return false
  return task.requiredRoleCode === roleCode
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
