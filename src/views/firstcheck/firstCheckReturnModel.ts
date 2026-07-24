import type { BusinessCaseDetailVO, BusinessFlowLogVO } from '@/types/device'

const RETURNABLE_FIRST_CHECK_NODES = new Set([
  'dept_leader_approve',
  'engineer_route'
])

export interface FirstCheckReturnFeedback {
  operatorId?: string
  operatorName?: string
  nodeCode?: string
  nodeName?: string
  opinion?: string
  operatedAt?: string
}

function isFirstCheckRevisionReturn(log: BusinessFlowLogVO) {
  return log.actionCode === 'RETURN_AND_FORWARD'
    && Boolean(log.nodeCode && RETURNABLE_FIRST_CHECK_NODES.has(log.nodeCode))
}

/**
 * 返回统一首检轨迹中最近一次主管领导或责任工程师退回修订记录。
 * 首次分类不存在退回流转记录，因此返回 undefined。
 */
export function latestFirstCheckReturnFeedback(
  history?: BusinessCaseDetailVO
): FirstCheckReturnFeedback | undefined {
  let latest: BusinessFlowLogVO | undefined

  for (const log of history?.timeline || []) {
    if (!isFirstCheckRevisionReturn(log)) continue
    if (!latest || (log.operatedAt || '') >= (latest.operatedAt || '')) {
      latest = log
    }
  }

  if (!latest) return undefined
  return {
    operatorId: latest.operatorId,
    operatorName: latest.operatorName,
    nodeCode: latest.nodeCode,
    nodeName: latest.nodeName,
    opinion: latest.opinion,
    operatedAt: latest.operatedAt
  }
}
