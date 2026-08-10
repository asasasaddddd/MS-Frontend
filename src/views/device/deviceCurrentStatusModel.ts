export type DeviceCurrentStatusColor = 'red' | 'orange' | 'green' | 'blue' | 'default'

export interface DeviceCurrentStatusInput {
  deviceStatus?: string
  verificationStatus?: string
  sourceType?: string
  sourceOrderId?: string | number
}

export interface DeviceCurrentStatusView {
  code: string
  text: string
  color: DeviceCurrentStatusColor
  intermediate: boolean
}

interface StatusDefinition extends DeviceCurrentStatusView {
  aliases: string[]
}

const verificationStatuses: StatusDefinition[] = [
  {
    code: 'first_check',
    text: '首检中',
    color: 'blue',
    intermediate: true,
    aliases: ['first_check', 'firstcheck', '首检中', '首次检定中']
  },
  {
    code: 'periodic_check',
    text: '周检中',
    color: 'blue',
    intermediate: true,
    aliases: ['periodic_check', 'periodic', 'periodiccheck', '周期检定中', '周检中']
  },
  {
    code: 'sampling_check',
    text: '抽检中',
    color: 'blue',
    intermediate: true,
    aliases: ['sampling_check', 'sampling', 'samplingcheck', '抽检中']
  },
  {
    code: 'pre_use_check',
    text: '用前检定中',
    color: 'blue',
    intermediate: true,
    aliases: ['pre_use_check', 'precheck', 'pre_check', 'before_use', '用前检定中']
  },
  {
    code: 'change_processing',
    text: '状态变更中',
    color: 'orange',
    intermediate: true,
    aliases: ['change_processing', 'change-processing', 'change processing', '状态变更中']
  },
  {
    code: 'deferred',
    text: '缓检',
    color: 'orange',
    intermediate: true,
    aliases: ['deferred', 'defer', '缓检']
  }
]

const deviceStatuses: StatusDefinition[] = [
  {
    code: 'pending_verification',
    text: '待检定',
    color: 'orange',
    intermediate: false,
    aliases: ['pending_verification', '待检定']
  },
  {
    code: 'in_use',
    text: '在用',
    color: 'green',
    intermediate: false,
    aliases: ['in_use', '在用']
  },
  {
    code: 'sealed',
    text: '封存',
    color: 'orange',
    intermediate: false,
    aliases: ['sealed', '封存']
  },
  {
    code: 'pending_enable',
    text: '待启用',
    color: 'orange',
    intermediate: false,
    aliases: ['pending_enable', '待启用']
  },
  {
    code: 'stopped',
    text: '停用',
    color: 'orange',
    intermediate: false,
    aliases: ['stopped', 'disabled', '停用']
  },
  {
    code: 'repair',
    text: '维修中',
    color: 'orange',
    intermediate: true,
    aliases: ['repair', 'repairing', '维修中']
  },
  {
    code: 'delayed',
    text: '缓检中',
    color: 'orange',
    intermediate: true,
    aliases: ['delayed', '缓检中', '缓检']
  },
  {
    code: 'pending_scrap',
    text: '待报废',
    color: 'orange',
    intermediate: false,
    aliases: ['pending_scrap', '待报废']
  },
  {
    code: 'scrapped',
    text: '已报废',
    color: 'red',
    intermediate: false,
    aliases: ['scrapped', '已报废', '报废']
  }
]

/** 仅这些设备本体状态允许由进行中的检定状态进一步细化展示。 */
const verificationRefinableDeviceStatuses = new Set([
  'in_use',
  'pending_verification',
  'pending_enable'
])

function normalize(value?: string) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function findStatus(value: string | undefined, definitions: StatusDefinition[]) {
  const normalized = normalize(value)
  if (!normalized) return undefined
  return definitions.find((definition) => definition.aliases.some((alias) => normalize(alias) === normalized))
}

function toView(definition: StatusDefinition): DeviceCurrentStatusView {
  const { aliases: _aliases, ...view } = definition
  return view
}

/**
 * 将设备本体状态和检定状态合并成页面使用的“当前状态”。
 *
 * 后续可升级：改为直接消费统一“活动业务投影”。当前不能通过
 * sourceType/sourceOrderId 判断占用，因为首检完成后它们仍可能作为来源快照保留。
 */
export function resolveDeviceCurrentStatus(device: DeviceCurrentStatusInput): DeviceCurrentStatusView {
  const baseStatus = findStatus(device.deviceStatus, deviceStatuses)
  const verificationStatus = findStatus(device.verificationStatus, verificationStatuses)
  const rawStatus = String(device.deviceStatus || '').trim()
  if (baseStatus?.code === 'sealed' && verificationStatus?.code === 'change_processing') {
    return toView(verificationStatus)
  }
  if (baseStatus && !verificationRefinableDeviceStatuses.has(baseStatus.code)) {
    return toView(baseStatus)
  }
  if (!baseStatus && rawStatus) {
    return {
      code: normalize(rawStatus),
      text: rawStatus,
      color: 'default',
      intermediate: false
    }
  }

  if (verificationStatus) return toView(verificationStatus)

  if (baseStatus) return toView(baseStatus)

  return {
    code: normalize(rawStatus),
    text: rawStatus || '-',
    color: 'default',
    intermediate: false
  }
}
