import { request } from '@/api/request'
import type { WorkflowTask } from '@/types/workflow'

export function listWorkflowTasks() {
  return request<WorkflowTask[]>({
    url: '/workflow/my-tasks',
    method: 'GET'
  })
}
