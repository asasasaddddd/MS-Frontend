import { request } from '@/api/request'
import {
  buildPeriodicJudgementRequest,
  buildPeriodicScanRequest,
  buildPeriodicScrapDisposalRequest,
  buildPeriodicVerificationRecordRequest,
  periodicEndpoint
} from '@/api/periodicContract'
import type {
  EntityId,
  GenerateBeforeUsePlanRequest,
  GeneratePeriodicPlanRequest,
  PeriodicConfirmerConfirmRequest,
  PeriodicExceptionChangeSubmitRequest,
  PeriodicJudgementRequest,
  PeriodicManagerForwardConfirmRequest,
  PeriodicPlanVO,
  PeriodicScanRequest,
  PeriodicScrapDisposalRequest,
  PeriodicSupplierFillInfoRequest,
  PeriodicTestPlanScenario,
  PeriodicTaskVO,
  PeriodicVerificationRecordRequest,
  PeriodicVerifierFillInfoRequest
} from '@/types/periodic'

export function generatePeriodicPlan(data: GeneratePeriodicPlanRequest) {
  return request<EntityId>({
    url: periodicEndpoint('generatePlan'),
    method: 'POST',
    data
  })
}

export function generatePeriodicTestPlan(scenario: PeriodicTestPlanScenario) {
  return request<EntityId>({
    url: periodicEndpoint('generateTestPlan'),
    method: 'POST',
    params: { scenario }
  })
}

export function generatePeriodicMonthPlan(planYear: number, planMonth: number) {
  return request<EntityId[]>({
    url: periodicEndpoint('generateMonthPlan'),
    method: 'POST',
    params: { planYear, planMonth }
  })
}

export function generateBeforeUsePlans(data: GenerateBeforeUsePlanRequest) {
  return request<EntityId[]>({
    url: periodicEndpoint('generateBeforeUsePlan'),
    method: 'POST',
    data
  })
}

export function getPeriodicPlan(planId: EntityId) {
  return request<PeriodicPlanVO>({
    url: periodicEndpoint('planDetail', planId),
    method: 'GET'
  })
}

export function listPeriodicPlanTasks(planId: EntityId) {
  return request<PeriodicTaskVO[]>({
    url: periodicEndpoint('planTasks', planId),
    method: 'GET'
  })
}

export function getPeriodicTask(periodicTaskId: EntityId, workflowTaskId: EntityId, signal?: AbortSignal) {
  return request<PeriodicTaskVO>({
    url: periodicEndpoint('taskDetail', periodicTaskId),
    method: 'GET',
    params: { taskId: workflowTaskId },
    signal
  })
}

export function verifierReceivePeriodic(data: PeriodicScanRequest) {
  return request<void>({
    url: periodicEndpoint('verifierReceive'),
    method: 'POST',
    data: buildPeriodicScanRequest(data)
  })
}

export function externalSendOutPeriodic(data: PeriodicScanRequest) {
  return request<void>({
    url: periodicEndpoint('externalSendOut'),
    method: 'POST',
    data: buildPeriodicScanRequest(data)
  })
}

export function sendOutReturnPeriodic(data: PeriodicScanRequest) {
  return request<void>({
    url: periodicEndpoint('sendOutReturn'),
    method: 'POST',
    data: buildPeriodicScanRequest(data)
  })
}

export function verificationRecordPeriodic(data: PeriodicVerificationRecordRequest) {
  return request<void>({
    url: periodicEndpoint('verificationRecord'),
    method: 'POST',
    data: buildPeriodicVerificationRecordRequest(data)
  })
}

export function managerForwardConfirmPeriodic(data: PeriodicManagerForwardConfirmRequest) {
  return request<void>({
    url: periodicEndpoint('managerForwardConfirm'),
    method: 'POST',
    data
  })
}

export function confirmerConfirmPeriodic(data: PeriodicConfirmerConfirmRequest) {
  return request<void>({
    url: periodicEndpoint('confirmerConfirm'),
    method: 'POST',
    data
  })
}

export function submitPeriodicExceptionChange(data: PeriodicExceptionChangeSubmitRequest) {
  return request<EntityId>({
    url: periodicEndpoint('exceptionChangeSubmit'),
    method: 'POST',
    data
  })
}

export function supplierFillInfoPeriodic(data: PeriodicSupplierFillInfoRequest) {
  return request<void>({
    url: periodicEndpoint('supplierFillInfo'),
    method: 'POST',
    data
  })
}

export function verifierFillInfoPeriodic(data: PeriodicVerifierFillInfoRequest) {
  return request<void>({
    url: periodicEndpoint('verifierFillInfo'),
    method: 'POST',
    data
  })
}

/**
 * 提交当前周检待办的统一判定结果。
 *
 * @param data 判定结果与处理意见。
 */
export function submitPeriodicJudgement(data: PeriodicJudgementRequest) {
  return request<void>({
    url: periodicEndpoint('judgements'),
    method: 'POST',
    data: buildPeriodicJudgementRequest(data)
  })
}

export function managerTakeBackPeriodic(data: PeriodicScanRequest) {
  return request<void>({
    url: periodicEndpoint('managerTakeBack'),
    method: 'POST',
    data: buildPeriodicScanRequest(data)
  })
}

/**
 * 提交外委检定员的周检报废处置意见。
 *
 * @param data 报废原因与处理意见。
 */
export function submitPeriodicScrapDisposal(data: PeriodicScrapDisposalRequest) {
  return request<void>({
    url: periodicEndpoint('scrapDisposal'),
    method: 'POST',
    data: buildPeriodicScrapDisposalRequest(data)
  })
}

export {
  periodicNodeName,
  periodicStatusName
} from '@/api/periodicContract'
