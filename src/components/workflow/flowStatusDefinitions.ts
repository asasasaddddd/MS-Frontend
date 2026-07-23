import type {
  FlowCountUnit,
  FlowDimensionCode,
  FlowDimensionSummary,
  FlowOverviewMetric,
  FlowSummary
} from '../../types/flowSummary'

/** 统一状态标签使用的语义色，不承载业务判断。 */
export type FlowStatusTone = 'neutral' | 'info' | 'processing' | 'success' | 'warning' | 'error'

/** 单位编码的中文展示定义。 */
export interface FlowCountUnitDefinition {
  /** 后端统计单位编码。 */
  code: FlowCountUnit
  /** 单位对应的业务对象名称。 */
  label: string
  /** 紧跟数字展示的中文量词。 */
  symbol: string
}

/** 状态维度的中文展示定义。 */
export interface FlowDimensionDefinition {
  /** 后端维度编码。 */
  code: FlowDimensionCode
  /** 维度中文名称。 */
  label: string
  /** 多维度同时出现时的固定顺序。 */
  order: number
}

/** 后端状态编码的集中展示定义。 */
export interface FlowStageDefinition {
  /** 状态所属维度。 */
  dimensionCode: FlowDimensionCode
  /** 后端返回的稳定状态编码。 */
  stageCode: string
  /** 页面展示的中文状态名称。 */
  label: string
  /** 标签使用的语义色。 */
  tone: FlowStatusTone
  /** 同一维度内的固定显示顺序。 */
  order: number
  /** 后端返回零值时是否仍显示该状态。 */
  showWhenZero: boolean
}

/** 概览指标编码的集中展示定义。 */
export interface FlowOverviewMetricDefinition {
  /** 后端返回的稳定指标编码。 */
  metricCode: string
  /** 页面展示的中文指标名称。 */
  label: string
  /** 指标卡片顺序。 */
  order: number
}

/** 组件渲染的概览指标视图模型。 */
export interface FlowOverviewMetricView extends FlowOverviewMetric {
  /** 集中配置解析出的中文指标名称。 */
  label: string
  /** 紧跟数值展示的中文量词。 */
  countUnitLabel: string
  /** 指标展示顺序。 */
  order: number
}

/** 组件渲染的单个状态视图模型。 */
export interface FlowStatusStageView {
  /** 后端原始状态编码。 */
  stageCode: string
  /** 集中配置解析出的中文状态名称。 */
  label: string
  /** 后端返回的权威数量。 */
  count: number
  /** 紧跟数值展示的中文量词。 */
  countUnitLabel: string
  /** 状态标签语义色。 */
  tone: FlowStatusTone
  /** 状态展示顺序。 */
  order: number
  /** 状态编码是否尚未登记到前端集中配置。 */
  unregistered: boolean
}

/** 组件渲染的状态维度视图模型。 */
export interface FlowDimensionView extends FlowDimensionSummary {
  /** 维度中文名称。 */
  label: string
  /** 统计对象中文名称。 */
  countUnitName: string
  /** 紧跟数量展示的中文量词。 */
  countUnitLabel: string
  /** 维度展示顺序。 */
  order: number
  /** 按集中配置转换并排序后的状态列表。 */
  stages: FlowStatusStageView[]
  /** 未登记到前端集中配置的后端状态编码。 */
  unregisteredStageCodes: string[]
  /** 本维度是否需要显示数据质量告警。 */
  hasWarning: boolean
}

/** 统一流程状态组件使用的完整视图模型。 */
export interface FlowStatusViewModel {
  /** 按集中配置排序的概览指标。 */
  overview: FlowOverviewMetricView[]
  /** 按业务、工作流、实物、扫码、标签、结果、异常顺序排列的维度。 */
  dimensions: FlowDimensionView[]
  /** 待办页直接平铺的当前节点维度，优先使用业务节点并回退到工作流节点。 */
  pendingDimension?: FlowDimensionView
}

/** 后端汇总契约校验失败的具体问题。 */
export interface FlowSummaryValidationIssue {
  /** 出现问题的维度。 */
  dimensionCode: FlowDimensionCode
  /** 可直接展示和记录的数据质量说明。 */
  message: string
}

/** 所有后端统计单位的统一中文与量词映射。 */
export const FLOW_COUNT_UNIT_DEFINITIONS: Readonly<Record<FlowCountUnit, FlowCountUnitDefinition>> = {
  order: { code: 'order', label: '单据', symbol: '单' },
  device: { code: 'device', label: '设备', symbol: '台' },
  item: { code: 'item', label: '明细', symbol: '项' }
}

/** 生产流程中互不混算的状态维度及其固定展示顺序。 */
export const FLOW_DIMENSION_DEFINITIONS: Readonly<Record<FlowDimensionCode, FlowDimensionDefinition>> = {
  business: { code: 'business', label: '业务流程', order: 10 },
  workflow: { code: 'workflow', label: '工作流节点', order: 20 },
  physical: { code: 'physical', label: '实物交接', order: 30 },
  scan: { code: 'scan', label: '扫码状态', order: 40 },
  label: { code: 'label', label: '标签状态', order: 50 },
  result: { code: 'result', label: '处理结果', order: 60 },
  exception: { code: 'exception', label: '异常分支', order: 70 }
}

/** 页面顶部概览指标的中文名称和固定顺序。 */
export const FLOW_OVERVIEW_METRIC_DEFINITIONS: readonly FlowOverviewMetricDefinition[] = [
  { metricCode: 'total', label: '总数', order: 10 },
  { metricCode: 'pending', label: '当前角色待办', order: 20 },
  { metricCode: 'in_progress', label: '处理中', order: 30 },
  { metricCode: 'completed', label: '已完成', order: 40 },
  { metricCode: 'exception', label: '异常', order: 50 },
  { metricCode: 'today_new', label: '今日新增', order: 60 },
  { metricCode: 'total_device', label: '设备总数', order: 100 },
  { metricCode: 'active_device', label: '处理中设备', order: 110 },
  { metricCode: 'completed_device', label: '已完成设备', order: 120 },
  { metricCode: 'exception_device', label: '异常设备', order: 130 },
  { metricCode: 'visible_orders', label: '参与单据', order: 140 },
  { metricCode: 'assigned_devices', label: '已赋码设备', order: 150 },
  { metricCode: 'total_order', label: '变更单总数', order: 160 },
  { metricCode: 'total_item', label: '变更明细总数', order: 170 },
  { metricCode: 'type:seal', label: '封存', order: 180 },
  { metricCode: 'type:enable', label: '启用', order: 190 },
  { metricCode: 'type:transfer', label: '设备转移', order: 200 },
  { metricCode: 'type:category', label: '管理类别调整', order: 210 },
  { metricCode: 'type:cycle', label: '检定周期调整', order: 220 },
  { metricCode: 'type:scrap', label: '报废', order: 230 },
  { metricCode: 'type:precheck', label: '用前检定', order: 240 },
  { metricCode: 'unknown_type', label: '未知变更类型', order: 250 },
  { metricCode: 'device_total', label: '抽检设备总数', order: 260 },
  { metricCode: 'terminal_device', label: '抽检已结束设备', order: 270 },
  { metricCode: 'order_total', label: '产品配套单总数', order: 280 },
  { metricCode: 'ratio_count', label: '配套比例项', order: 290 },
  { metricCode: 'item_count', label: '送检明细', order: 300 }
]

/** 单类状态变更工作流的集中展示定义。 */
interface ChangeWorkflowTypeDefinition {
  /** 状态变更类型稳定编码。 */
  code: string
  /** 状态变更类型中文名称。 */
  label: string
  /** 该类型后端允许返回的工作流节点编码。 */
  nodeCodes: readonly string[]
}

/** 七种状态变更类型及各自合法节点，顺序与后端生产流程保持一致。 */
const CHANGE_WORKFLOW_TYPE_DEFINITIONS: readonly ChangeWorkflowTypeDefinition[] = [
  { code: 'seal', label: '封存', nodeCodes: ['dept_leader_approve', 'measure_leader_review', 'verifier_handle'] },
  { code: 'enable', label: '启用', nodeCodes: ['dept_leader_approve', 'measure_leader_review', 'verifier_handle'] },
  {
    code: 'transfer',
    label: '设备转移',
    nodeCodes: ['dept_leader_approve', 'measure_leader_review', 'receive_dept_leader_confirm', 'receive_admin_confirm']
  },
  { code: 'category', label: '管理类别调整', nodeCodes: ['dept_leader_approve', 'responsible_engineer_review'] },
  { code: 'cycle', label: '检定周期调整', nodeCodes: ['dept_leader_approve', 'responsible_engineer_review', 'verifier_handle'] },
  {
    code: 'scrap',
    label: '报废',
    nodeCodes: ['dept_leader_approve', 'measure_leader_review', 'responsible_engineer_review', 'verifier_handle']
  },
  { code: 'precheck', label: '用前检定', nodeCodes: ['dept_leader_approve', 'measure_leader_review', 'verifier_handle'] }
]

/** 状态变更工作流节点的中文与语义色定义。 */
const CHANGE_WORKFLOW_NODE_DEFINITIONS: Readonly<Record<string, { label: string; tone: FlowStatusTone }>> = {
  dept_leader_approve: { label: '待分厂主管领导审批', tone: 'warning' },
  measure_leader_review: { label: '待计量领导审批', tone: 'warning' },
  responsible_engineer_review: { label: '待责任工程师审批', tone: 'warning' },
  verifier_handle: { label: '待检定员处理', tone: 'processing' },
  receive_dept_leader_confirm: { label: '待接收部门主管确认', tone: 'warning' },
  receive_admin_confirm: { label: '待接收部门管理员确认', tone: 'warning' }
}

/** 状态变更工作流实例终态的中文与语义色定义。 */
const CHANGE_PROCESS_STAGE_DEFINITIONS: Readonly<Record<string, { label: string; tone: FlowStatusTone }>> = {
  approved: { label: '流程已通过', tone: 'success' },
  rejected: { label: '流程已驳回', tone: 'error' },
  cancelled: { label: '流程已取消', tone: 'neutral' },
  returned: { label: '流程已退回', tone: 'error' }
}

/**
 * 生成后端“变更类型:节点”编码的完整展示定义。
 *
 * 该函数只展开静态生产流程元数据，不读取明细数据，也不参与数量计算。
 *
 * @returns 状态变更工作流全部合法状态的集中展示定义。
 */
function buildChangeWorkflowStageDefinitions(): FlowStageDefinition[] {
  return CHANGE_WORKFLOW_TYPE_DEFINITIONS.flatMap((typeDefinition, typeIndex) => {
    const nodeDefinitions = typeDefinition.nodeCodes.map((nodeCode, nodeIndex) => {
      const nodeDefinition = CHANGE_WORKFLOW_NODE_DEFINITIONS[nodeCode]
      return {
        dimensionCode: 'workflow' as const,
        stageCode: `${typeDefinition.code}:${nodeCode}`,
        label: `${typeDefinition.label} · ${nodeDefinition.label}`,
        tone: nodeDefinition.tone,
        order: 1000 + typeIndex * 100 + nodeIndex * 10,
        showWhenZero: false
      }
    })
    const terminalDefinitions = Object.entries(CHANGE_PROCESS_STAGE_DEFINITIONS).map(
      ([processStatus, processDefinition], terminalIndex) => ({
        dimensionCode: 'workflow' as const,
        stageCode: `${typeDefinition.code}:process_${processStatus}`,
        label: `${typeDefinition.label} · ${processDefinition.label}`,
        tone: processDefinition.tone,
        order: 1060 + typeIndex * 100 + terminalIndex * 10,
        showWhenZero: false
      })
    )
    return [...nodeDefinitions, ...terminalDefinitions]
  })
}

/**
 * 全模块状态编码的唯一前端展示配置。
 *
 * 此配置只决定中文、颜色、顺序和零值显隐；不得加入基于任务字段的统计条件。
 */
export const FLOW_STAGE_DEFINITIONS: readonly FlowStageDefinition[] = [
  { dimensionCode: 'business', stageCode: 'draft', label: '草稿', tone: 'neutral', order: 10, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'submitted', label: '已提交', tone: 'info', order: 11, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'processing', label: '处理中', tone: 'processing', order: 12, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'plan_issue', label: '计划下发', tone: 'info', order: 20, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'manager_check', label: '待分类', tone: 'warning', order: 30, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'returned', label: '退回待修改', tone: 'error', order: 31, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'dept_leader_approve', label: '待主管领导审批', tone: 'warning', order: 40, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'engineer_confirm_type', label: '待责任工程师确认', tone: 'warning', order: 50, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'plan_confirm', label: '待计划确认', tone: 'warning', order: 60, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'manager_receive', label: '待管理员接收', tone: 'warning', order: 65, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'admin_exception_dispatch', label: '待异常分流', tone: 'error', order: 66, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'verifier_receive', label: '待扫码接收', tone: 'warning', order: 67, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'self_verify', label: '待自检', tone: 'processing', order: 70, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'verification_record', label: '待检定录入', tone: 'processing', order: 80, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'verifier_verify', label: '待检定员处理', tone: 'processing', order: 90, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'wait_receive', label: '待接收', tone: 'warning', order: 91, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'wait_sendout_return', label: '待外委送回', tone: 'warning', order: 92, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'external_returned', label: '外委已送回', tone: 'info', order: 93, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'verifier_received', label: '已接收', tone: 'success', order: 94, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'admin_confirm', label: '待管理员确认', tone: 'warning', order: 91, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'send_out', label: '外委处理中', tone: 'info', order: 100, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'send_out_return', label: '待外委送回', tone: 'warning', order: 105, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'supplier_fill_info', label: '待外扩填写', tone: 'warning', order: 110, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'verifier_fill_info', label: '待外委检定员填写', tone: 'warning', order: 120, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'verifier_second_judge', label: '待外委检定员二次判定', tone: 'warning', order: 125, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'responsible_second_judge', label: '待责任工程师二次判定', tone: 'warning', order: 130, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'responsible_third_judge', label: '待责任工程师三次判定', tone: 'warning', order: 135, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'verifier_third_judge', label: '待外委检定员三次判定', tone: 'warning', order: 140, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'responsible_fourth_judge', label: '待责任工程师四次判定', tone: 'warning', order: 145, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'verifier_scrap_disposal', label: '待外委检定员报废处置', tone: 'error', order: 148, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'manager_forward_confirm', label: '待管理员转办', tone: 'warning', order: 150, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'confirmer_confirm', label: '待确认员确认', tone: 'warning', order: 160, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'planner_approve', label: '待计划员审批', tone: 'warning', order: 170, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'measure_leader_approve', label: '待计量领导审批', tone: 'warning', order: 180, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'verifier_handle', label: '待检定员处理', tone: 'processing', order: 190, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'responsible_engineer_handle', label: '待责任工程师处理', tone: 'warning', order: 200, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'assign_code', label: '待完善计量编号', tone: 'processing', order: 210, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'admin_receive', label: '待管理员取回', tone: 'processing', order: 220, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'exception_disposal', label: '异常流程处理中', tone: 'error', order: 230, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'approved', label: '已通过', tone: 'success', order: 245, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'rejected', label: '已驳回', tone: 'error', order: 250, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'cancelled', label: '已取消', tone: 'neutral', order: 260, showWhenZero: false },
  { dimensionCode: 'business', stageCode: 'completed', label: '已完成', tone: 'success', order: 270, showWhenZero: false },

  { dimensionCode: 'workflow', stageCode: 'dept_leader_approve', label: '待分厂主管领导审批', tone: 'warning', order: 10, showWhenZero: false },
  { dimensionCode: 'workflow', stageCode: 'measure_leader_review', label: '待计量领导审批', tone: 'warning', order: 20, showWhenZero: false },
  { dimensionCode: 'workflow', stageCode: 'measure_leader_approve', label: '待计量领导审批', tone: 'warning', order: 21, showWhenZero: false },
  { dimensionCode: 'workflow', stageCode: 'responsible_engineer_review', label: '待责任工程师审批', tone: 'warning', order: 30, showWhenZero: false },
  { dimensionCode: 'workflow', stageCode: 'verifier_handle', label: '待检定员处理', tone: 'processing', order: 40, showWhenZero: false },
  { dimensionCode: 'workflow', stageCode: 'manager_complete', label: '待管理员办结', tone: 'processing', order: 50, showWhenZero: false },
  { dimensionCode: 'workflow', stageCode: 'approved', label: '流程已通过', tone: 'success', order: 60, showWhenZero: false },
  { dimensionCode: 'workflow', stageCode: 'rejected', label: '流程已驳回', tone: 'error', order: 70, showWhenZero: false },
  { dimensionCode: 'workflow', stageCode: 'cancelled', label: '流程已取消', tone: 'neutral', order: 80, showWhenZero: false },
  { dimensionCode: 'workflow', stageCode: 'returned', label: '流程已退回', tone: 'error', order: 90, showWhenZero: false },
  ...buildChangeWorkflowStageDefinitions(),

  { dimensionCode: 'physical', stageCode: 'none', label: '未进入实物交接', tone: 'neutral', order: 1, showWhenZero: false },
  { dimensionCode: 'physical', stageCode: 'wait_verifier_receive', label: '待检定员接收', tone: 'warning', order: 10, showWhenZero: false },
  { dimensionCode: 'physical', stageCode: 'verifier_received', label: '检定员已接收', tone: 'success', order: 20, showWhenZero: false },
  { dimensionCode: 'physical', stageCode: 'wait_external_receive', label: '待送出', tone: 'warning', order: 30, showWhenZero: false },
  { dimensionCode: 'physical', stageCode: 'external_received', label: '外扩已接收', tone: 'success', order: 40, showWhenZero: false },
  { dimensionCode: 'physical', stageCode: 'wait_sendout_return_receive', label: '待送回', tone: 'warning', order: 50, showWhenZero: false },
  { dimensionCode: 'physical', stageCode: 'sendout_return_received', label: '送回已接收', tone: 'success', order: 60, showWhenZero: false },
  { dimensionCode: 'physical', stageCode: 'wait_manager_take_back', label: '待管理员取回', tone: 'warning', order: 70, showWhenZero: false },
  { dimensionCode: 'physical', stageCode: 'wait_take_back', label: '待管理员取回', tone: 'warning', order: 71, showWhenZero: false },
  { dimensionCode: 'physical', stageCode: 'taken_back', label: '管理员已取回', tone: 'success', order: 80, showWhenZero: false },

  { dimensionCode: 'label', stageCode: 'none', label: '未生成', tone: 'neutral', order: 1, showWhenZero: false },
  { dimensionCode: 'label', stageCode: 'not_ready', label: '未生成', tone: 'neutral', order: 10, showWhenZero: false },
  { dimensionCode: 'label', stageCode: 'not_generated', label: '未生成', tone: 'neutral', order: 11, showWhenZero: false },
  { dimensionCode: 'label', stageCode: 'pending', label: '待打印', tone: 'warning', order: 20, showWhenZero: false },
  { dimensionCode: 'label', stageCode: 'printed', label: '已打印', tone: 'success', order: 30, showWhenZero: false },
  { dimensionCode: 'label', stageCode: 'voided', label: '已作废', tone: 'error', order: 40, showWhenZero: false },

  { dimensionCode: 'result', stageCode: 'none', label: '未产生结果', tone: 'neutral', order: 1, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'pending', label: '待判定', tone: 'warning', order: 10, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'processing', label: '处理中', tone: 'processing', order: 11, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'qualified', label: '合格', tone: 'success', order: 20, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'unqualified', label: '不合格', tone: 'error', order: 30, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'limited', label: '限用', tone: 'warning', order: 35, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'repair', label: '维修', tone: 'warning', order: 40, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'scrap', label: '报废', tone: 'error', order: 50, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'cancelled', label: '已取消', tone: 'neutral', order: 60, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'completed', label: '已完成', tone: 'success', order: 70, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'verification:qualified', label: '检定合格', tone: 'success', order: 100, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'verification:unqualified', label: '检定不合格', tone: 'error', order: 110, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'verification:scrap', label: '检定报废', tone: 'error', order: 120, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'verification:repair', label: '检定维修', tone: 'warning', order: 130, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'approval:draft', label: '审批草稿', tone: 'neutral', order: 200, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'approval:submitted', label: '审批已提交', tone: 'info', order: 210, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'approval:processing', label: '审批处理中', tone: 'processing', order: 220, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'approval:returned', label: '审批已退回', tone: 'error', order: 230, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'approval:approved', label: '审批已通过', tone: 'success', order: 240, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'approval:rejected', label: '审批已驳回', tone: 'error', order: 250, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'approval:cancelled', label: '审批已取消', tone: 'neutral', order: 260, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'approval:completed', label: '审批已完成', tone: 'success', order: 270, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'item:pending', label: '明细待处理', tone: 'warning', order: 300, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'item:processing', label: '明细处理中', tone: 'processing', order: 310, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'item:completed', label: '明细已完成', tone: 'success', order: 320, showWhenZero: false },
  { dimensionCode: 'result', stageCode: 'item:cancelled', label: '明细已取消', tone: 'neutral', order: 330, showWhenZero: false }
]

/** 状态定义检索表，仅用于展示映射，不包含统计规则。 */
const stageDefinitionIndex = new Map(
  FLOW_STAGE_DEFINITIONS.map((definition) => [
    `${definition.dimensionCode}:${definition.stageCode}`,
    definition
  ])
)

/** 概览指标定义检索表。 */
const overviewDefinitionIndex = new Map(
  FLOW_OVERVIEW_METRIC_DEFINITIONS.map((definition) => [definition.metricCode, definition])
)

/**
 * 将数据库聚合驱动可能返回的数字字符串标准化为前端数值。
 *
 * @param value 后端汇总契约中的数量值。
 * @returns 可参与数量守恒校验和 Ant Design 数字展示的有限数值。
 */
function normalizeFlowCount(value: number): number {
  const normalizedValue = Number(value)
  return Number.isFinite(normalizedValue) ? normalizedValue : 0
}

/**
 * 校验后端维度汇总是否满足互斥计数守恒。
 *
 * 函数只报告契约问题，不修改或重算任何后端数量。
 *
 * @param summary 后端返回的流程汇总快照。
 * @returns 每个不满足守恒约束的维度问题。
 */
export function validateFlowSummary(summary: FlowSummary): FlowSummaryValidationIssue[] {
  return summary.dimensions.flatMap((dimension) => {
    const classifiedCount = Object.values(dimension.stageCounts).reduce(
      (total, count) => total + normalizeFlowCount(count),
      0
    )
    const unknownCount = normalizeFlowCount(dimension.unknownCount)
    const totalCount = normalizeFlowCount(dimension.totalCount)
    const expectedTotal = classifiedCount + unknownCount

    if (expectedTotal === totalCount) return []

    return [
      {
        dimensionCode: dimension.dimensionCode,
        message: `${FLOW_DIMENSION_DEFINITIONS[dimension.dimensionCode].label}总数 ${totalCount}，已分类 ${classifiedCount}，未知 ${unknownCount}，数量不守恒`
      }
    ]
  })
}

/**
 * 将后端汇总快照转换为纯展示模型。
 *
 * 状态数量逐项使用 `stageCounts` 原值；本函数只补充中文、颜色、单位和顺序，
 * 不读取任务明细，也不根据状态组合推断业务事实。
 *
 * @param summary 后端权威流程汇总快照。
 * @returns 可由统一组件直接渲染的展示模型。
 */
export function buildFlowStatusViewModel(summary: FlowSummary): FlowStatusViewModel {
  const validationIssues = validateFlowSummary(summary)

  const overview = summary.overview
    .filter((metric) => metric.metricCode === 'pending' || metric.metricCode === 'today_new')
    .map((metric): FlowOverviewMetricView => {
      const definition = overviewDefinitionIndex.get(metric.metricCode)
      return {
        ...metric,
        value: normalizeFlowCount(metric.value),
        label: definition?.label || `未配置指标（${metric.metricCode}）`,
        countUnitLabel: FLOW_COUNT_UNIT_DEFINITIONS[metric.countUnit].symbol,
        order: definition?.order ?? Number.MAX_SAFE_INTEGER
      }
    })
    .sort((left, right) => left.order - right.order || left.metricCode.localeCompare(right.metricCode))

  const dimensions = summary.dimensions
    .map((dimension): FlowDimensionView => {
      const dimensionDefinition = FLOW_DIMENSION_DEFINITIONS[dimension.dimensionCode]
      const unitDefinition = FLOW_COUNT_UNIT_DEFINITIONS[dimension.countUnit]
      const stages = Object.entries(dimension.stageCounts)
        .map(([stageCode, count]): FlowStatusStageView => {
          const definition = stageDefinitionIndex.get(`${dimension.dimensionCode}:${stageCode}`)
          return {
            stageCode,
            label: definition?.label || `未知状态（${stageCode}）`,
            count: normalizeFlowCount(count),
            countUnitLabel: unitDefinition.symbol,
            tone: definition?.tone || 'error',
            order: definition?.order ?? Number.MAX_SAFE_INTEGER,
            unregistered: !definition
          }
        })
        .filter((stage) => {
          const definition = stageDefinitionIndex.get(
            `${dimension.dimensionCode}:${stage.stageCode}`
          )
          return stage.unregistered || stage.count !== 0 || definition?.showWhenZero === true
        })
        .sort((left, right) => left.order - right.order || left.stageCode.localeCompare(right.stageCode))
      const unregisteredStageCodes = stages
        .filter((stage) => stage.unregistered)
        .map((stage) => stage.stageCode)
      const hasContractIssue = validationIssues.some(
        (issue) => issue.dimensionCode === dimension.dimensionCode
      )

      return {
        ...dimension,
        totalCount: normalizeFlowCount(dimension.totalCount),
        unknownCount: normalizeFlowCount(dimension.unknownCount),
        label: dimensionDefinition.label,
        countUnitName: unitDefinition.label,
        countUnitLabel: unitDefinition.symbol,
        order: dimensionDefinition.order,
        stages,
        unregisteredStageCodes,
        hasWarning: normalizeFlowCount(dimension.unknownCount) > 0 || unregisteredStageCodes.length > 0 || hasContractIssue
      }
    })
    .sort((left, right) => left.order - right.order)

  const pendingDimension = dimensions.find((dimension) => dimension.dimensionCode === 'business')
    ?? dimensions.find((dimension) => dimension.dimensionCode === 'workflow')

  return { overview, dimensions, pendingDimension }
}
