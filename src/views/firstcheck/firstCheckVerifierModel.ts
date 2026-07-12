export type FirstCheckVerifierStatusColor = 'orange' | 'blue' | 'red' | 'green' | 'cyan' | 'default'

export type FirstCheckVerifierStatusKey =
  | 'wait_receive'
  | 'wait_sendout'
  | 'sent_out'
  | 'wait_sendout_return'
  | 'verifier_verify'
  | 'assign_code'
  | 'manager_forward'
  | 'confirmer_confirm'
  | 'unknown'

export type FirstCheckVerifierAction =
  | 'scan_receive'
  | 'scan_sendout_return'
  | 'verify'
  | 'assign_code'
  | 'wait'

export interface FirstCheckVerifierStatusSource {
  nodeCode?: string
  currentNodeCode?: string
  currentNode?: string
  currentNodeName?: string
  taskNodeName?: string
  verificationType?: string
  scanStatus?: string
}

export function matchesFirstCheckVerifierRole(
  source: Pick<FirstCheckVerifierStatusSource, 'verificationType'>,
  roleCode?: string
) {
  if (roleCode === 'VERIFIER_SELF') return source.verificationType === 'self_check'
  if (roleCode === 'VERIFIER_EXTERNAL') return source.verificationType === 'external_commission'
  return true
}

export interface FirstCheckVerifierResolvedStatus {
  statusKey: FirstCheckVerifierStatusKey
  statusLabel: string
  statusColor: FirstCheckVerifierStatusColor
}

function workflowNodeCode(source: FirstCheckVerifierStatusSource) {
  return source.nodeCode || source.currentNodeCode || source.currentNode || ''
}

export function resolveFirstCheckVerifierStatus(source: FirstCheckVerifierStatusSource): FirstCheckVerifierResolvedStatus {
  const nodeCode = workflowNodeCode(source)
  const scanStatus = source.scanStatus || ''

  if (nodeCode === 'assign_code') return { statusKey: 'assign_code', statusLabel: '待赋码', statusColor: 'cyan' }
  if (nodeCode === 'manager_forward') return { statusKey: 'manager_forward', statusLabel: '报告待转发', statusColor: 'orange' }
  if (nodeCode === 'confirmer_confirm') return { statusKey: 'confirmer_confirm', statusLabel: '报告待确认', statusColor: 'orange' }

  if (nodeCode === 'verifier_receive' || scanStatus === 'wait_receive') {
    return { statusKey: 'wait_receive', statusLabel: '待接收', statusColor: 'orange' }
  }

  if (nodeCode === 'verifier_return_verify' || scanStatus === 'wait_sendout_return') {
    return { statusKey: 'wait_sendout_return', statusLabel: '待外委送回', statusColor: 'blue' }
  }

  if (scanStatus === 'wait_sendout') {
    return { statusKey: 'wait_sendout', statusLabel: '待外委送出', statusColor: 'blue' }
  }

  if (scanStatus === 'sent_out') {
    return { statusKey: 'sent_out', statusLabel: '已外委送出', statusColor: 'blue' }
  }

  if (nodeCode === 'verifier_verify') {
    if (source.verificationType === 'external_commission' && scanStatus === 'sendout_returned') {
      return { statusKey: 'verifier_verify', statusLabel: '外委已送回', statusColor: 'orange' }
    }
    if (source.verificationType !== 'external_commission' && scanStatus === 'received') {
      return { statusKey: 'verifier_verify', statusLabel: '已接收', statusColor: 'orange' }
    }
  }

  return {
    statusKey: 'unknown',
    statusLabel: source.currentNodeName || source.taskNodeName || '待处理',
    statusColor: 'default'
  }
}

export function firstCheckVerifierAction(source: FirstCheckVerifierStatusSource): FirstCheckVerifierAction {
  const status = resolveFirstCheckVerifierStatus(source)
  if (status.statusKey === 'wait_receive') return 'scan_receive'
  if (status.statusKey === 'wait_sendout_return') return 'scan_sendout_return'
  if (status.statusKey === 'verifier_verify') return 'verify'
  if (status.statusKey === 'assign_code') return 'assign_code'
  return 'wait'
}

export function canOpenFirstCheckVerify(source: FirstCheckVerifierStatusSource) {
  return firstCheckVerifierAction(source) === 'verify'
}
