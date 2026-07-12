import { request } from '@/api/request'
import {
  buildPeriodicManagerScanRequest,
  buildPeriodicScanRequest,
  buildPeriodicSecondJudgeRequest,
  buildPeriodicVerificationRecordRequest,
  periodicEndpoint
} from '@/api/periodicContract'
import type {
  EntityId,
  GenerateBeforeUsePlanRequest,
  GeneratePeriodicPlanRequest,
  PeriodicConfirmerConfirmRequest,
  PeriodicExceptionDisposeRequest,
  PeriodicManagerForwardConfirmRequest,
  PeriodicPlanVO,
  PeriodicResponsibleSecondJudgeRequest,
  PeriodicScanRequest,
  PeriodicSecondJudgeRequest,
  PeriodicSupplierFillInfoRequest,
  PeriodicTaskVO,
  PeriodicVerificationRecordRequest,
  PeriodicVerifierFillInfoRequest
} from '@/types/periodic'
import type { ChangeSubmitRequest } from '@/types/change'

export function generatePeriodicPlan(data: GeneratePeriodicPlanRequest) {
  return request<EntityId>({
    url: periodicEndpoint('generatePlan'),
    method: 'POST',
    data
  })
}

export function generatePeriodicTestPlan() {
  return request<EntityId>({
    url: periodicEndpoint('generateTestPlan'),
    method: 'POST'
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

export function listPeriodicMyTasks(status?: string) {
  return request<PeriodicTaskVO[]>({
    url: periodicEndpoint('myTasks'),
    method: 'GET',
    params: status ? { status } : undefined
  })
}

export function listPeriodicMyHistory(status?: string) {
  return request<PeriodicTaskVO[]>({
    url: periodicEndpoint('myHistory'),
    method: 'GET',
    params: status ? { status } : undefined
  })
}

export function getPeriodicTask(taskId: EntityId) {
  return request<PeriodicTaskVO>({
    url: periodicEndpoint('taskDetail', taskId),
    method: 'GET'
  })
}

export function managerReceivePeriodic(data: PeriodicScanRequest) {
  return request<void>({
    url: periodicEndpoint('managerReceive'),
    method: 'POST',
    data: buildPeriodicManagerScanRequest(data)
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

export function exceptionDisposePeriodic(data: PeriodicExceptionDisposeRequest) {
  return request<void>({
    url: periodicEndpoint('exceptionDispose'),
    method: 'POST',
    data
  })
}

export function submitPeriodicExceptionChange(data: ChangeSubmitRequest) {
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

export function secondJudgePeriodic(data: PeriodicSecondJudgeRequest) {
  return request<void>({
    url: periodicEndpoint('secondJudge'),
    method: 'POST',
    data: buildPeriodicSecondJudgeRequest(data)
  })
}

export function responsibleSecondJudgePeriodic(data: PeriodicResponsibleSecondJudgeRequest) {
  return request<void>({
    url: periodicEndpoint('responsibleSecondJudge'),
    method: 'POST',
    data
  })
}

export {
  periodicNodeName,
  periodicStatusName
} from '@/api/periodicContract'
