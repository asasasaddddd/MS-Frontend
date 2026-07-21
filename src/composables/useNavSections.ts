import { computed, type ComputedRef } from 'vue'
import type { RoleCode } from '@/types/common'
import { workflowNodeGroups } from '@/workflows/metrologyWorkflow'

export interface NavItem {
  path: string
  title: string
  description: string
  module:
    | 'workspace'
    | 'firstcheck'
    | 'periodic'
    | 'change'
    | 'scan'
    | 'label'
    | 'cost'
    | 'device'
    | 'sampling'
    | 'productSupport'
    | 'system'
  roles: RoleCode[]
  nodes: string[]
}

export interface NavSection {
  key: string
  title: string
  items: NavItem[]
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

// 业务处理页只作为工作台待办的跳转目标，不直接出现在侧边栏。
export const workflowRouteItems: NavItem[] = [
  {
    path: '/periodic/admin',
    title: '周检',
    description: '周检计划异常分流、转办确认员、取回实物',
    module: 'periodic',
    roles: ['MEASURE_ADMIN'],
    nodes: [...workflowNodeGroups.periodic.admin]
  },
  {
    path: '/periodic/verifier',
    title: '周检',
    description: '扫码接收、自检录入、打印标签、返回分厂',
    module: 'periodic',
    roles: ['VERIFIER_SELF'],
    nodes: [...workflowNodeGroups.periodic.selfVerifier]
  },
  {
    path: '/periodic/verifier-external',
    title: '周检',
    description: '外委送回、否通用检定信息和二次判定',
    module: 'periodic',
    roles: ['VERIFIER_EXTERNAL'],
    nodes: [...workflowNodeGroups.periodic.externalVerifier]
  },
  {
    path: '/periodic/responsible-engineer',
    title: '周检',
    description: '外委通用设备责任工程师二次判定',
    module: 'periodic',
    roles: ['RESPONSIBLE_ENGINEER'],
    nodes: [...workflowNodeGroups.periodic.responsibleEngineer]
  },
  {
    path: '/periodic/external-operator',
    title: '周检',
    description: '外扩扫码接收、通用设备检定信息填写',
    module: 'periodic',
    roles: ['EXTERNAL_OPERATOR'],
    nodes: [...workflowNodeGroups.periodic.externalOperator]
  },
  {
    path: '/periodic/confirmer',
    title: '周检',
    description: '否通用设备周检判定',
    module: 'periodic',
    roles: ['CONFIRMER'],
    nodes: [...workflowNodeGroups.periodic.confirmer]
  },
  {
    path: '/firstcheck/supplier',
    title: '首检',
    description: '供应商发起首检单',
    module: 'firstcheck',
    roles: ['SUPPLIER', 'PURCHASE_WAREHOUSE'],
    nodes: [...workflowNodeGroups.firstcheck.supplier]
  },
  {
    path: '/firstcheck/admin',
    title: '首检',
    description: '物资核实、转办确认员、赋码、领取实物',
    module: 'firstcheck',
    roles: ['MEASURE_ADMIN'],
    nodes: [...workflowNodeGroups.firstcheck.admin]
  },
  {
    path: '/firstcheck/leader',
    title: '首检',
    description: '审批首检管理类别',
    module: 'firstcheck',
    roles: ['DEPT_LEADER'],
    nodes: [...workflowNodeGroups.firstcheck.leader]
  },
  {
    path: '/firstcheck/engineer',
    title: '首检',
    description: '确认类别、检定方式和检定员',
    module: 'firstcheck',
    roles: ['RESPONSIBLE_ENGINEER'],
    nodes: [...workflowNodeGroups.firstcheck.engineer]
  },
  {
    path: '/firstcheck/verifier',
    title: '首检',
    description: '录入检定结果、打印首检标签',
    module: 'firstcheck',
    roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'],
    nodes: [...workflowNodeGroups.firstcheck.verifier]
  },
  {
    path: '/change/admin-task',
    title: '状态变更待办详情',
    description: '接收部门计量管理员处理状态变更单',
    module: 'change',
    roles: ['MEASURE_ADMIN'],
    nodes: [...workflowNodeGroups.change.receiveAdmin]
  },
  {
    path: '/change/approval',
    title: '状态变更待办详情',
    description: '主管领导、计量领导和责任工程师处理状态变更单',
    module: 'change',
    roles: ['DEPT_LEADER', 'MEASURE_LEADER', 'RESPONSIBLE_ENGINEER'],
    nodes: [...workflowNodeGroups.change.approval]
  },
  {
    path: '/change/verifier',
    title: '状态变更待办详情',
    description: '检定员处理状态变更单',
    module: 'change',
    roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'],
    nodes: [...workflowNodeGroups.change.verifier]
  },
  {
    path: '/sampling/plan',
    title: 'C类物资抽检',
    description: 'C类物资抽检计划编制与下发',
    module: 'sampling',
    roles: ['PLANNER'],
    nodes: ['sampling_plan']
  },
  {
    path: '/sampling/admin',
    title: 'C类物资抽检',
    description: 'C类抽检设备清点、异常分流和转发确认员',
    module: 'sampling',
    roles: ['MEASURE_ADMIN'],
    nodes: ['admin_confirm']
  },
  {
    path: '/sampling/verifier',
    title: 'C类物资抽检',
    description: 'C类抽检检定录入',
    module: 'sampling',
    roles: ['VERIFIER_SELF'],
    nodes: ['verifier_verify']
  },
  {
    path: '/sampling/confirmer',
    title: 'C类物资抽检',
    description: 'C类抽检否通用设备判定',
    module: 'sampling',
    roles: ['CONFIRMER'],
    nodes: ['confirmer_confirm']
  },
  {
    path: '/product-support/warehouse',
    title: '产品配套检定',
    description: '库房人员填写产品配套送检清单、抽检比例和送检明细',
    module: 'productSupport',
    roles: ['PURCHASE_WAREHOUSE'],
    nodes: ['warehouse_submit']
  },
  {
    path: '/product-support/verifier',
    title: '产品配套检定',
    description: '检定员填写产品配套检定信息并产生费用',
    module: 'productSupport',
    roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'],
    nodes: ['verifier_verify']
  }
]

export const navSections: NavSection[] = [
  {
    key: 'system',
    title: '权限管理',
    items: [
      {
        path: '/system/permissions',
        title: '人员角色配置',
        description: '按部门、姓名或工号查询人员并分配系统角色',
        module: 'system',
        roles: ['SUPER_ADMIN'],
        nodes: ['system_permissions']
      }
    ]
  },
  {
    key: 'workspace',
    title: '工作台',
    items: [
      {
        path: '/todo',
        title: '待办事项',
        description: '当前角色全部待办流程',
        module: 'workspace',
        roles: businessRoles,
        nodes: ['pending_tasks']
      }
    ]
  },
  {
    key: 'device-management',
    title: '设备管理',
    items: [
      {
        path: '/change/apply',
        title: '状态变更',
        description: '手动发起状态变更申请',
        module: 'change',
        roles: ['MEASURE_ADMIN'],
        nodes: [...workflowNodeGroups.change.apply]
      },
      {
        path: '/scan',
        title: '设备扫码',
        description: '接收、送出、送回、取回等公共扫码',
        module: 'scan',
        roles: ['MEASURE_ADMIN', 'VERIFIER_SELF', 'VERIFIER_EXTERNAL', 'EXTERNAL_OPERATOR'],
        nodes: ['RECEIVE', 'SEND_OUT', 'RETURN', 'TAKE_BACK']
      },
      {
        path: '/label/print',
        title: '标签打印',
        description: '集中处理待打印标签、已打印标签和重复打印次数',
        module: 'label',
        roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL', 'SUPPLIER'],
        nodes: ['print_label', 'label_print_record']
      },
      {
        path: '/device/ledger',
        title: '计量台账',
        description: '查看入账后的计量设备明细与完整履历',
        module: 'device',
        roles: ['SUPER_ADMIN', 'MEASURE_ADMIN', 'VERIFIER_SELF', 'VERIFIER_EXTERNAL', 'CONFIRMER', 'DEPT_LEADER', 'RESPONSIBLE_ENGINEER', 'MEASURE_LEADER'],
        nodes: ['device_ledger']
      },
      {
        path: '/cost/list',
        title: '费用管理',
        description: '周检、首检、状态变更和其他外委费用记录',
        module: 'cost',
        roles: ['VERIFIER_SELF', 'VERIFIER_EXTERNAL'],
        nodes: ['cost_records']
      }
    ]
  }
]

export const allNavItems = [...workflowRouteItems, ...navSections.flatMap((section) => section.items)]

function getNavDisplayKey(item: NavItem) {
  return `${item.module}:${item.title}`
}

function pickDisplayItem(items: NavItem[], currentRoleCode?: string) {
  if (currentRoleCode) {
    const currentRoleItem = items.find((item) => item.roles.some((role) => role === currentRoleCode))
    if (currentRoleItem) return currentRoleItem
  }
  return items[0]
}

function dedupeDisplayItems(items: NavItem[], currentRoleCode?: string) {
  const grouped = new Map<string, NavItem[]>()
  for (const item of items) {
    const key = getNavDisplayKey(item)
    const group = grouped.get(key)
    if (group) {
      group.push(item)
    } else {
      grouped.set(key, [item])
    }
  }
  return Array.from(grouped.values()).map((group) => pickDisplayItem(group, currentRoleCode))
}

export function getNavSectionsForRoles(roleCodes?: string[], currentRoleCode?: string): NavSection[] {
  const roleSet = new Set(roleCodes || [])
  if (!roleSet.size) {
    return []
  }

  return navSections
    .map((section) => {
      const visibleItems = section.items.filter((item) => item.roles.some((role) => roleSet.has(role)))
      return {
        ...section,
        items: dedupeDisplayItems(visibleItems, currentRoleCode)
      }
    })
    .filter((section) => section.items.length > 0)
}

export function getNavSectionsForRole(roleCode?: string): NavSection[] {
  return getNavSectionsForRoles(roleCode ? [roleCode] : [], roleCode)
}

export function getFirstNavPathForRole(roleCode?: string) {
  return getNavSectionsForRole(roleCode).flatMap((section) => section.items)[0]?.path || '/todo'
}

export function getFirstNavPathForRoles(roleCodes?: string[], currentRoleCode?: string) {
  return getNavSectionsForRoles(roleCodes, currentRoleCode).flatMap((section) => section.items)[0]?.path || '/todo'
}

export function findNavItem(path: string) {
  return allNavItems.find((item) => item.path === path)
}

export function findNavItemForRoleDisplay(path: string, roleCode?: string) {
  const current = findNavItem(path)
  if (!current || !roleCode) return current
  const sameDisplayItems = allNavItems.filter((item) => getNavDisplayKey(item) === getNavDisplayKey(current))
  return sameDisplayItems.find((item) => item.roles.some((role) => role === roleCode)) || current
}

export function useNavSections(
  roleCodes: ComputedRef<string[] | undefined>,
  currentRoleCode?: ComputedRef<string | undefined>
) {
  return computed(() => getNavSectionsForRoles(roleCodes.value, currentRoleCode?.value))
}
