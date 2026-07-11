# 2026-07-04 首检主管领导、供应商、外扩扫码复刻进度

## 本轮完成

- 读取并复刻以下原型：
  - `分厂主管领导首检确认弹窗.html`
  - `外扩检定供应商扫码模块.html`
  - `分厂主管领导待办.html`
  - `分厂主管领导首检详情.html`
  - `供应商首检填写页面.html`
- 新增主管领导首检详情页：
  - 文件：`src/views/firstcheck/FirstCheckLeaderView.vue`
  - 当前待办来源：`GET /api/workflow/my-tasks`
  - 过滤条件：`businessType=first_check` 且 `nodeCode=dept_leader_approve`
  - 详情补字段：`GET /api/firstcheck/detail/{orderId}`
  - 单条处理打开 `FirstCheckLeaderDialog.vue`
  - 批量同意对接 `POST /api/firstcheck/batch-dept-leader-approve`
  - 退回按钮保留原型位置，提示后端当前未暴露主管退回接口。
- 新增主管领导首检确认弹窗：
  - 文件：`src/views/firstcheck/components/FirstCheckLeaderDialog.vue`
  - 字段：采购订单编号、物料编号、物料描述、数量、使用部门、供应商名称、附件、申请时间、设备分类、使用场景、审批意见。
  - 同意对接：`POST /api/firstcheck/dept-leader-approve`
- 新增供应商首检填写页：
  - 文件：`src/views/firstcheck/FirstCheckSupplierView.vue`
  - 对接：`POST /api/firstcheck/start`
  - 请求模型按后端 `StartFirstCheckRequest`：页面可见字段进入 `material`，一张首检单对应一种物料/设备。
- 新增外扩检定供应商扫码页：
  - 文件：`src/views/scan/DeviceScanView.vue`
  - 收件箱对接：`GET /api/scan/firstcheck/inbox`
  - 外委送出扫码对接：`POST /api/scan/firstcheck/sendout`
  - 只显示外扩人员可处理的 `sendout / wait_sendout / sent_out` 首检扫码行。
  - 扫码失败弹窗显示计量编号、设备名称、报错信息。
- 新增扫码 API：
  - 文件：`src/api/scan.ts`
  - 包含首检扫码收件箱、首检外委送出扫码、扫码动作/状态中文映射。
- 更新首检 API：
  - 文件：`src/api/firstcheck.ts`
  - 增加 `startFirstCheck`、`deptLeaderApproveFirstCheck`、`batchDeptLeaderApproveFirstCheck`。
- 更新工作流配置：
  - 文件：`src/workflows/metrologyWorkflow.ts`
  - 补充真实首检节点 `external_sendout`、`verifier_return_verify`。
- 更新路由：
  - 文件：`src/router/index.ts`
  - 接入 `/firstcheck/leader`、`/firstcheck/supplier`、`/scan` 的真实页面组件。

## 验证

- `npm run typecheck`：通过。
- `npm run build`：通过。
- 当前目录 `F:\MetrologySystem\MS-Frontend` 不是 git 仓库，本轮未提交 commit。

## 后续注意

- 主管领导退回：后端当前没有单独退回接口，前端只保留按钮和提示。
- 供应商采购订单搜索、附件上传：当前后端没有本页专用采购订单查询接口，附件入口先保留。
- 外扩扫码依赖后端扫码收件箱按当前登录人工号和角色返回数据，若外扩账号看不到数据，优先检查首检单 `externalOperatorId` 和扫码状态是否为 `wait_sendout`。
