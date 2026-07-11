import { request } from '@/api/request'
import type {
  SamplingAdminConfirmRequest,
  SamplingCreatePlanRequest,
  SamplingEntityId,
  SamplingPlanVO,
  SamplingTaskVO,
  SamplingVerificationSubmitRequest
} from '@/types/sampling'

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

export function listSamplingMyTasks(status?: string) {
  return request<SamplingTaskVO[]>({
    url: '/sampling/my-tasks',
    method: 'GET',
    params: status ? { status } : undefined
  })
}

export function listSamplingMyHistory(status?: string) {
  return request<SamplingTaskVO[]>({
    url: '/sampling/my-history',
    method: 'GET',
    params: status ? { status } : undefined
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
