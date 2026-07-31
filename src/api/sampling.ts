import { request } from '@/api/request'
import type {
  SamplingAdminConfirmRequest,
  SamplingCreatePlanRequest,
  SamplingEligibleDevice,
  SamplingEntityId,
  SamplingPlanVO,
  SamplingTaskVO,
  SamplingVerificationSubmitRequest
} from '@/types/sampling'

export function listSamplingEligibleDevices(deptId?: string) {
  return request<SamplingEligibleDevice[]>({
    url: '/sampling/eligible-devices',
    method: 'GET',
    params: deptId ? { deptId } : undefined
  })
}

export function createSamplingPlan(data: SamplingCreatePlanRequest) {
  return request<SamplingEntityId>({
    url: '/sampling/plans',
    method: 'POST',
    data
  })
}

export function getSamplingPlan(planId: SamplingEntityId) {
  return request<SamplingPlanVO>({
    url: `/sampling/plans/${planId}`,
    method: 'GET'
  })
}

export function listSamplingPlanTasks(planId: SamplingEntityId) {
  return request<SamplingTaskVO[]>({
    url: `/sampling/plans/${planId}/tasks`,
    method: 'GET'
  })
}

export function getSamplingTask(
  samplingTaskId: SamplingEntityId,
  workflowTaskIdOrSignal?: SamplingEntityId | AbortSignal,
  signal?: AbortSignal
) {
  const hasWorkflowTaskId =
    typeof workflowTaskIdOrSignal === 'string' || typeof workflowTaskIdOrSignal === 'number'
  const workflowTaskId = hasWorkflowTaskId ? workflowTaskIdOrSignal : undefined
  const requestSignal = hasWorkflowTaskId ? signal : workflowTaskIdOrSignal
  return request<SamplingTaskVO>({
    url: `/sampling/tasks/${samplingTaskId}`,
    method: 'GET',
    params: workflowTaskId === undefined ? undefined : { taskId: workflowTaskId },
    signal: requestSignal
  })
}

export function adminConfirmSampling(data: SamplingAdminConfirmRequest) {
  return request<void>({
    url: '/sampling/admin-confirm',
    method: 'POST',
    data
  })
}

export function verifierSubmitSampling(data: SamplingVerificationSubmitRequest) {
  return request<void>({
    url: '/sampling/verifier-submit',
    method: 'POST',
    data
  })
}

export function confirmerSubmitSampling(data: SamplingVerificationSubmitRequest) {
  return request<void>({
    url: '/sampling/confirmer-submit',
    method: 'POST',
    data
  })
}
