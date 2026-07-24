import { request } from '@/api/request'
import type { FlowSummary } from '@/types/flowSummary'

/** 可安全转换为 URL 路径参数的业务主键。雪花 ID 在前端应优先使用字符串。 */
export type FlowSummaryEntityId = string | number

/**
 * 生成周检计划权威状态汇总接口地址。
 *
 * @param planId 周检计划雪花 ID；调用方应使用字符串避免 JavaScript 数字精度丢失。
 * @returns 已完成 URL 编码的接口相对路径。
 */
export function periodicPlanFlowSummaryEndpoint(planId: FlowSummaryEntityId): string {
  return `/periodic/plans/${encodeURIComponent(String(planId))}/summary`
}

/**
 * 读取一个周检计划在当前登录角色权限下的状态汇总快照。
 *
 * 本函数只转交后端统计结果，不请求任务明细，也不在前端补算数量。
 *
 * @param planId 周检计划雪花 ID。
 * @returns 后端一次只读事务生成的统一流程状态快照。
 * @throws {ApiError} 后端拒绝访问、计划不存在或网络请求失败时抛出。
 */
export function getPeriodicPlanFlowSummary(planId: FlowSummaryEntityId): Promise<FlowSummary> {
  return request<FlowSummary>({
    url: periodicPlanFlowSummaryEndpoint(planId),
    method: 'GET'
  })
}

/** 状态变更汇总可查询的权限范围。 */
export type ChangeFlowSummaryScope = 'pending' | 'history' | 'applied'

/**
 * 按当前角色和指定范围读取状态变更汇总。
 *
 * @param scope 当前待办、历史已办或本人申请范围。
 * @returns 状态变更单、工作流节点和明细结果的统一快照。
 */
export function getChangeFlowSummary(scope: ChangeFlowSummaryScope): Promise<FlowSummary> {
  return request<FlowSummary>({
    url: '/change/summary',
    method: 'GET',
    params: { scope }
  })
}

/**
 * 读取一张 C 类抽检计划的权威状态汇总。
 *
 * @param planId 抽检计划雪花 ID。
 * @returns 按设备统计的业务、标签和结果快照。
 */
export function getSamplingPlanFlowSummary(planId: FlowSummaryEntityId): Promise<FlowSummary> {
  return request<FlowSummary>({
    url: `/sampling/plans/${encodeURIComponent(String(planId))}/summary`,
    method: 'GET'
  })
}

/**
 * 读取当前检定员产品配套待办的权威状态汇总。
 *
 * @returns 按订单和明细分别计数的产品配套快照。
 */
export function getProductSupportTaskFlowSummary(): Promise<FlowSummary> {
  return request<FlowSummary>({
    url: '/product-support/my-tasks/summary',
    method: 'GET'
  })
}
