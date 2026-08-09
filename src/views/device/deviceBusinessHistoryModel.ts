import type {
  AttachmentCaseGroupVO,
  BusinessFlowLogVO,
  CaseAttachmentFileVO,
  DeviceBusinessEventVO
} from '@/types/device'
import type { EntityId } from '@/types/common'

export type HistoryTagColor = 'red' | 'orange' | 'green' | 'blue' | 'default'

export interface BusinessEventRow {
  key: string
  caseId: EntityId
  typeText: string
  businessNo: string
  title: string
  statusCode: string
  statusText: string
  currentNodeText: string
  resultText: string
  dateText: string
  color: HistoryTagColor
  source: DeviceBusinessEventVO
}

export interface BusinessFlowRow {
  key: string
  kindText: string
  nodeText: string
  actionText: string
  nextNodeText: string
  operatorText: string
  opinion: string
  resultText: string
  dateText: string
  color: HistoryTagColor
  source: BusinessFlowLogVO
}

export interface CaseAttachmentSection {
  key: string
  groupNo: string
  purposeText: string
  scopeText: string
  statusText: string
  files: CaseAttachmentFileVO[]
  source: AttachmentCaseGroupVO
}

function text(value: unknown, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

export function formatBusinessDateTime(value?: string) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}

export function businessTypeText(code?: string, name?: string) {
  if (name) return name
  const names: Record<string, string> = {
    first_check: '首次检定',
    periodic_plan: '周检计划',
    periodic_task: '周检任务',
    change: '状态变更',
    sampling_plan: '抽检计划',
    sampling_task: '抽检任务',
    product_support: '产品配套'
  }
  return code ? names[code.toLowerCase()] || code : '-'
}

export function statusText(code?: string, name?: string) {
  if (name) return name
  const names: Record<string, string> = {
    draft: '草稿',
    pending: '待处理',
    waiting: '待处理',
    running: '进行中',
    in_progress: '进行中',
    processing: '进行中',
    completed: '已完成',
    approved: '已完成',
    rejected: '已驳回',
    cancelled: '已终止',
    terminated: '已终止'
  }
  return code ? names[code.toLowerCase()] || code : '-'
}

export function resultText(code?: string, name?: string) {
  if (name) return name
  const names: Record<string, string> = {
    qualified: '合格',
    approve: '通过',
    approved: '通过',
    pass: '通过',
    unqualified: '不合格',
    reject: '驳回',
    rejected: '驳回',
    fail: '不合格',
    repair: '维修',
    scrap: '报废',
    sealed: '封存'
  }
  return code ? names[code.toLowerCase()] || code : '-'
}

export function statusTagColor(code?: string): HistoryTagColor {
  const normalized = String(code || '').toLowerCase()
  if (['completed', 'approved'].includes(normalized)) return 'green'
  if (['rejected', 'cancelled', 'terminated'].includes(normalized)) return 'red'
  if (['pending', 'waiting', 'draft'].includes(normalized)) return 'orange'
  if (['running', 'in_progress', 'processing'].includes(normalized)) return 'blue'
  return 'default'
}

export function mapBusinessEventRow(event: DeviceBusinessEventVO): BusinessEventRow {
  return {
    key: String(event.caseId),
    caseId: event.caseId,
    typeText: businessTypeText(event.businessType, event.businessTypeName),
    businessNo: text(event.businessNo),
    title: text(event.title || event.businessNo),
    statusCode: text(event.statusCode, ''),
    statusText: statusText(event.statusCode, event.statusName),
    currentNodeText: text(event.currentNodeName || event.currentNodeCode),
    resultText: resultText(event.resultCode, event.resultName),
    dateText: formatBusinessDateTime(event.startedAt || event.joinedAt || event.endedAt),
    color: statusTagColor(event.statusCode),
    source: event
  }
}

function eventKindText(code?: string, name?: string) {
  if (name) return name
  const names: Record<string, string> = {
    FLOW: '流程流转',
    APPROVAL: '审批',
    PHYSICAL: '实物交接',
    SEND_OUT: '外委流转',
    LABEL: '标签打印',
    SYSTEM: '系统事件'
  }
  return code ? names[code.toUpperCase()] || code : '-'
}

function operatorText(name?: string, employeeId?: string) {
  if (name && employeeId) return `${name}（${employeeId}）`
  return text(name || employeeId)
}

export function mapBusinessFlowRow(flow: BusinessFlowLogVO): BusinessFlowRow {
  return {
    key: String(flow.id),
    kindText: eventKindText(flow.eventKind, flow.eventKindName),
    nodeText: text(flow.nodeName || flow.nodeCode),
    actionText: text(flow.actionName || flow.actionCode),
    nextNodeText: text(flow.nextNodeName || flow.nextNodeCode),
    operatorText: operatorText(flow.operatorName, flow.operatorId),
    opinion: text(flow.opinion),
    resultText: resultText(flow.resultCode, flow.resultName),
    dateText: formatBusinessDateTime(flow.operatedAt),
    color: flow.resultCode && /reject|fail|unqualified/i.test(flow.resultCode)
      ? 'red'
      : flow.eventKind === 'APPROVAL' ? 'blue' : 'green',
    source: flow
  }
}

export function mapCaseAttachmentSection(item: AttachmentCaseGroupVO): CaseAttachmentSection {
  return {
    key: String(item.group.id),
    groupNo: text(item.group.groupNo),
    purposeText: text(item.purposeName || item.link?.purpose),
    scopeText: text(item.linkScopeName || item.link?.linkScope),
    statusText: text(item.statusName || item.group.status),
    files: item.group.files || [],
    source: item
  }
}
