import { request } from '@/api/request'
import type {
  BusinessType,
  WorkflowEntityId,
  WorkflowTask,
  WorkflowTaskPage,
  WorkflowTaskQuery,
  WorkflowTimelineEntry
} from '@/types/workflow'

/** 查询统一工作流的待办、已办、参与记录或部门流程。 */
export function queryWorkflowTasks(query: WorkflowTaskQuery, signal?: AbortSignal) {
  return request<WorkflowTaskPage>({
    url: '/workflow/tasks',
    method: 'GET',
    signal,
    params: {
      view: query.view,
      current: query.current || 1,
      size: query.size || 200,
      businessType: query.businessType
    }
  })
}

/** 读取当前激活角色的待办任务。 */
export async function listWorkflowTasks(businessType?: BusinessType, signal?: AbortSignal): Promise<WorkflowTask[]> {
  const page = await queryWorkflowTasks({ view: 'todo', businessType }, signal)
  return page.records
}

/** 读取当前激活角色真实处理过的任务。 */
export async function listWorkflowHistory(businessType?: BusinessType, signal?: AbortSignal): Promise<WorkflowTask[]> {
  const page = await queryWorkflowTasks({ view: 'handled', businessType }, signal)
  return page.records
}

/** 鉴权读取一条统一共享任务。 */
export function getWorkflowTask(taskId: WorkflowEntityId, signal?: AbortSignal) {
  return request<WorkflowTask>({
    url: `/workflow/tasks/${taskId}`,
    method: 'GET',
    signal
  })
}

/** 读取统一流程的不可变流转轨迹。 */
export function getWorkflowTimeline(processInstanceId: WorkflowEntityId, signal?: AbortSignal) {
  return request<WorkflowTimelineEntry[]>({
    url: `/workflow/processes/${processInstanceId}/timeline`,
    method: 'GET',
    signal
  })
}
