# 2026-07-04 扫码、标签、管理员赋码重构进度

## 本轮目标

- 复刻并接入：
  - `计量管理员设备扫码模块.html`
  - `计量检定员设备扫码模块.html`
  - `外扩检定供应商扫码模块.html`
  - `检定员打印标签页面.html`
  - `检定员已打印标签页面.html`
- 去旧项目查看管理员赋码页面和弹窗，并按新项目 Ant Design Vue 组件重构。
- 严格区分扫码码值：
  - 赋码前：扫码使用首检临时码、首检单号或后端允许的临时编码。
  - 赋码后：管理员取回扫码使用单台合格设备的计量编号。

## 已完成代码

- 公共扫码页：
  - 文件：`src/views/scan/DeviceScanView.vue`
  - 接口：`GET /api/scan/firstcheck/inbox`
  - 根据当前登录角色固定显示动作：
    - `MEASURE_ADMIN`：只显示 `take-back`，取回扫码提交 `POST /api/scan/firstcheck/take-back`，扫码内容为计量编号。
    - `VERIFIER_SELF / VERIFIER_EXTERNAL`：显示 `receive / sendout-return`，提交 `POST /api/scan/firstcheck/receive` 或 `POST /api/scan/firstcheck/sendout-return`，扫码内容为首检临时码。
    - `EXTERNAL_OPERATOR`：只显示 `sendout`，提交 `POST /api/scan/firstcheck/sendout`，扫码内容为首检临时码。
  - 页面包含待扫码/已扫码分类、筛选方案、扫码失败弹窗。
- 扫码 API：
  - 文件：`src/api/scan.ts`
  - 新增 `receiveFirstCheckDevice`、`sendoutFirstCheckDevice`、`returnFirstCheckDevice`、`takeBackFirstCheckDevice`、`submitFirstCheckScan`。
- 标签打印页：
  - 文件：`src/views/label/LabelPrintView.vue`
  - 公共组件：`src/views/label/components/LabelListPanel.vue`
  - 新增依赖：`qrcode`、`@types/qrcode`，标签预览使用真实二维码图片，不再使用占位图。
  - 接口：
    - 未打印：`GET /api/label/unprintedList`
    - 打印：首检来源优先走 `POST /api/firstcheck/batch-print-label`，用于推动流程到管理员取回；其他来源走 `POST /api/label/print/{recordId}`。
  - 标签预览包含二维码区域、计量编号、设备基础信息、来源流程、管理类别、是否通用、有效期、检定日期、签名人。
- 已打印标签页：
  - 文件：`src/views/label/LabelPrintedView.vue`
  - 接口：
    - 已打印：`GET /api/label/printedList`
    - 再次打印：`POST /api/label/print/{recordId}`
  - 表格包含打印次数。
- 标签 API：
  - 文件：`src/api/label.ts`
  - 新增标签记录类型、未打印列表、已打印列表、打印接口。
- 管理员赋码弹窗：
  - 文件：`src/views/firstcheck/components/FirstCheckAssignCodeDialog.vue`
  - 预览：`GET /api/firstcheck/preview-device-codes/{orderId}`
  - 提交：`POST /api/firstcheck/batch-assign-codes`
  - 行为：按合格数量炸开，每行代表一台合格设备，每行一个计量编号。
- 管理员首检页：
  - 文件：`src/views/firstcheck/FirstCheckAdminView.vue`
  - `assign_code` 节点点击处理时打开赋码弹窗。
  - 状态条增加 `待赋码`、`待领取`。
- 路由：
  - 文件：`src/router/index.ts`
  - 接入 `/label/print`、`/label/printed`。

## 验证

- `npm run typecheck`：通过。
- `npm run build`：通过。
- 路由 200：
  - `/scan`
  - `/label/print`
  - `/label/printed`
  - `/firstcheck/admin`

## 注意

- 标签记录后端当前主要返回 `deviceCode/deviceId/validUntil/verificationDate/manageCategory/isCommon/signUserName/printCount/qrCodeData/sourceType/sourceId`。若后端未返回 `deviceName/verificationMethod`，页面保留字段位并显示 `-`。
- 首检标签打印必须走 `/api/firstcheck/batch-print-label` 才会推动工作流进入管理员取回节点。
