/**
 * 后端支持的流程状态统计维度。
 *
 * 业务状态、工作流任务、实物交接、扫码门禁、标签、处理结果和异常分支分别统计，
 * 禁止将不同事实来源压缩到同一状态字段。
 */
export type FlowDimensionCode =
  | 'business'
  | 'workflow'
  | 'physical'
  | 'scan'
  | 'label'
  | 'result'
  | 'exception'

/** 后端统计值的业务粒度，禁止前端自行换算。 */
export type FlowCountUnit = 'order' | 'device' | 'item'

/**
 * 流程概览指标。
 *
 * `value` 已由后端按当前用户权限与查询范围计算，前端只能展示，不能根据明细重算。
 */
export interface FlowOverviewMetric {
  /** 稳定的指标编码，例如 `total`、`pending` 或 `completed`。 */
  metricCode: string
  /** 指标采用的统计粒度。 */
  countUnit: FlowCountUnit
  /** 后端快照中的指标值。 */
  value: number
}

/**
 * 单个状态维度的权威统计快照。
 *
 * 同一个统计对象在本维度只能命中一个 `stageCode`。后端必须保证
 * `stageCounts` 合计加 `unknownCount` 等于 `totalCount`。
 */
export interface FlowDimensionSummary {
  /** 状态所属维度。 */
  dimensionCode: FlowDimensionCode
  /** 本维度采用的统计粒度。 */
  countUnit: FlowCountUnit
  /** 本维度纳入统计范围的对象总数。 */
  totalCount: number
  /** 后端无法归入已知状态的对象数量。 */
  unknownCount: number
  /** 后端状态编码到权威数量的映射。 */
  stageCounts: Record<string, number>
}

/**
 * 统一流程状态汇总响应。
 *
 * 该对象是某一时刻、某一权限范围内的一致性快照。业务页面不得混入其他接口的
 * 明细数据补算或覆盖其中的数量。
 */
export interface FlowSummary {
  /** 业务类型稳定编码，例如 `firstcheck`、`periodic` 或 `change`。 */
  businessType: string
  /** 后端使用的查询范围标识，例如计划、单据或当前角色待办范围。 */
  scope: string
  /** 后端生成本次一致性快照的 ISO-8601 时间。 */
  snapshotAt: string
  /** 页面顶部概览指标；为空表示该业务未定义概览指标。 */
  overview: FlowOverviewMetric[]
  /** 业务实际支持的状态维度；不适用的维度不返回。 */
  dimensions: FlowDimensionSummary[]
}
