import type { FlowSummary } from '@/types/flowSummary'
import type { WorkflowTask } from '@/types/workflow'

/**
 * 将统一任务查询结果转换为当前角色待办状态汇总。
 *
 * 该函数只汇总同一次统一任务查询返回的权威节点，不参与权限判断或业务状态推导。
 */
export function buildWorkflowTaskSummary(tasks: WorkflowTask[], businessType: string): FlowSummary {
  const stageCounts = tasks.reduce<Record<string, number>>((counts, task) => {
    counts[task.nodeCode] = (counts[task.nodeCode] || 0) + 1
    return counts
  }, {})

  return {
    businessType,
    scope: 'current_role_todo',
    snapshotAt: new Date().toISOString(),
    overview: [{ metricCode: 'pending', countUnit: 'order', value: tasks.length }],
    dimensions: [{
      dimensionCode: 'business',
      countUnit: 'order',
      totalCount: tasks.length,
      unknownCount: 0,
      stageCounts
    }]
  }
}
