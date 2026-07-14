# 周检检定信息填写弹窗复刻设计

## 目标

严格复刻以下两个原型的字段、分组和操作布局，同时沿用当前项目的 Ant Design Vue 组件及周检真实接口：

- `检定员填写周检信息自检及外委通用弹窗（已添加到检定员首检待办详情点击处理跳出弹窗）.html`
- `检定员周检填写检定信息外委否通用设备（已添加到检定员首检待办详情点击处理跳出弹窗）.html`

本轮只修改周检检定信息填写弹窗，不修改工作流节点、接口路径、扫码、标签、首检或公共布局组件。

## 修改边界

修改文件：

- `src/views/periodic/components/PeriodicVerifyDialog.vue`
- `src/views/periodic/components/PeriodicExternalVerifyDialog.vue`
- 与上述两个弹窗字段契约直接相关的测试文件

不修改：

- `PeriodicSupplierFillDialog.vue`
- `PeriodicTaskWorkspace.vue` 的节点流转规则
- `/api/periodic/*` 接口定义
- 后端 DTO、数据库及工作流
- 公共附件、侧边栏和页面框架组件

## 共同布局

- 弹窗宽度使用 `95vw`，最大宽度约 `1400px`，内容区域可纵向滚动。
- 标题区左侧显示面包屑和页面标题，右侧显示“取消”“提交”。
- 内容区分为两个白色面板：`设备状态基础信息`、`检定人员检定`。
- 每个面板使用 4 列栅格；窄屏降为单列。
- 基础信息来自 `PeriodicTaskVO`，只读字段使用只读输入框；设备状态、管理类别和检定方法使用禁用选择框，保留原型控件形态但不伪提交。
- 面板右上角分别显示计量编号蓝色标签和“待填写”橙色标签。

## 设备状态基础信息

两个弹窗均严格显示以下 12 个字段：

| 原型字段 | 前端数据来源 | 交互 |
| --- | --- | --- |
| 计量编号 | `task.deviceCode` | 只读 |
| 设备名称 | `task.deviceName` | 只读 |
| 生产厂商 | `task.manufacturer` | 只读 |
| 出厂编号 | `task.factoryCode` | 只读 |
| 规格型号 | `task.modelSpec` | 只读 |
| 有效期 | `task.validUntil` | 只读 |
| 检定周期 | `task.verificationCycleMonth` | 只读，显示月数 |
| 使用部门 | `task.deptName` | 只读 |
| 设备状态 | `task.deviceStatusName || task.deviceStatus` | 禁用选择框 |
| 管理类别 | `task.manageCategory` | 禁用选择框 |
| 检定方法 | `task.verificationMethod` | 禁用选择框，中文显示自检/外委 |
| 学科分类 | `task.subjectCategory` | 只读 |

后端未返回值时显示 `-`，不使用静态示例值或前端占位业务数据。

## 自检及外委通用弹窗

组件：`PeriodicVerifyDialog.vue`

标题：`测量设备填写检定信息`

填写字段：

| 原型字段 | 实现及提交映射 |
| --- | --- |
| 检定人 | 只读显示 `assignedVerifierId（assignedVerifierName）` |
| 检定时间 | 日期输入，提交 `verificationTime` |
| 新有效期 | 日期输入，默认按“检定时间 + 检定周期月数 - 1 天”计算，提交 `newValidUntil` |
| 检定结果 | 合格 `qualified` / 不合格 `unqualified`，提交 `result` |
| 不合格处理方式 | 报废 `scrap` / 维修 `repair`，仅不合格时可选，提交 `nonconformingDisposal` |
| 责任工程师 | 按任务部门查询 `RESPONSIBLE_ENGINEER`；不合格时必选 |
| 数据目录 | 点击后展开责任工程师选择框 |
| 检定意见 | 提交 `opinion`，同时作为 `conclusion` |
| 上传附件 | 复用附件组件，提交 `certificateAttachmentGroupId` |

责任工程师映射：

- 报废：写入 `scrapEngineerId`、`scrapEngineerName`。
- 维修：写入 `repairUserId`、`repairUserName`。
- 合格：不提交处置方式及责任人员字段。

移除原型不存在的报告编号、检定单位、强制有效期、环境温湿度、是否需要确认员等可见字段。已有后端字段保持可选，不伪造提交值。

## 外委否通用弹窗

组件：`PeriodicExternalVerifyDialog.vue`

标题：`检定员填写周检信息外委否通用设备`

填写字段严格保留：

| 原型字段 | 实现及提交映射 |
| --- | --- |
| 检定时间 | 日期输入，提交 `verificationDate` |
| 检定意见 | 提交 `opinion` |
| 上传附件 | 复用附件组件，提交 `certificateAttachmentGroupId` |

删除当前原型不存在的“检定单位”字段，不向接口提交 `verificationUnit`。

## 校验与错误处理

- 两个弹窗没有任务数据时不提交。
- 检定时间不能为空。
- 自检弹窗选择“不合格”时，不合格处理方式和责任工程师均不能为空。
- 提交期间按钮显示加载态，保持现有父组件统一错误提示和刷新逻辑。
- 责任工程师查询失败时选择框为空，不注入静态人员数据。

## 测试与验收

测试先行增加源码契约断言，至少覆盖：

- 两个弹窗包含原型全部字段。
- 自检弹窗不再显示原型外字段。
- 外委否通用弹窗不再显示“检定单位”。
- 不合格处置能按维修/报废映射人员字段。
- 新有效期计算遵守“检定时间 + 周期 - 1 天”。
- 责任工程师查询角色固定为 `RESPONSIBLE_ENGINEER`。

最终执行：

```bash
npm run typecheck
npm run build
```

并使用 Playwright/Edge 对两个弹窗进行桌面视口截图核对，确认字段顺序、四列布局、面板标题、标签和按钮与原型一致。
