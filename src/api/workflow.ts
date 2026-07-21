import { request } from '@/api/request'
import type { WorkflowProcess, WorkflowTask } from '@/types/workflow'

export function listWorkflowTasks() {
  return request<WorkflowTask[]>({
    url: '/workflow/my-tasks',
    method: 'GET'
  })
}

export function listWorkflowHistory() {
  return request<WorkflowTask[]>({
    url: '/workflow/my-history',
    method: 'GET'
  })
}

export function getWorkflowProcessByBusiness(businessType: string, businessId: string | number) {
  return request<WorkflowProcess | null>({
    url: '/workflow/process/by-business',
    method: 'GET',
    params: { businessType, businessId }
  })
}
