# 2026-07-04 首检管理员分类与检定员页面复刻

## 输入原型
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\管理员首检分类弹窗页面.html`
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\检定员待办总览.html`
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\检定员首检待办详情.html`
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\检定员首检检定信息填写.html`

## 后端字段对齐
- 管理员分类提交：`POST /api/firstcheck/confirm-category`
  - `orderId`
  - `isWithReport`
  - `reportFileId`
  - `requestedCategory`：前端传 `A类/B类/C类`
  - `measureManagerId/name`
  - `responsibleEngineerId/name`
  - `deptLeaderId/name`
  - `opinion`
- 检定员填写检定信息：`POST /api/firstcheck/verifier-verify`
  - `orderId`
  - `verificationResult`
  - `qualifiedQuantity`
  - `unqualifiedQuantity`
  - `certificateAttachmentGroupId`
  - 入库设备字段：`deviceName/modelSpec/deviceUsage/measureRange/resolution/precisionLevel/allowedError/manufacturer/factoryCode/factoryDate/subjectCategory/subjectSubcategory/deviceStatus/isMandatory/standardDevice/confirmInterval/specialProject/verificationCycleMonth/verificationDate/validUntil/storageLocation/verificationOpinion/selfCost/sendoutCost/opinion`
- 检定员标签打印节点：`POST /api/firstcheck/print-label/{orderId}`

## 工作流对齐
- 管理员首检页：
  - `manager_check` 点击处理打开“首检设备分类”弹窗。
  - 分类提交成功后由后端流转到 `dept_leader_approve`。
  - `manager_forward` 仍走管理员转发确认员。
- 检定员首检页：
  - 当前待办只从 `GET /api/workflow/my-tasks` 获取。
  - 只保留 `businessType=first_check` 且当前节点属于检定员节点的数据。
  - `verifier_receive`：提示去公共扫码模块接收实物。
  - `verifier_verify`：打开“首次检定表单填写”弹窗。
  - `print_label`：直接调用标签打印节点接口，成功后流转到管理员取回。

## 已实现文件
- `src/views/firstcheck/components/FirstCheckCategoryDialog.vue`
- `src/views/firstcheck/components/FirstCheckVerifyDialog.vue`
- `src/views/firstcheck/FirstCheckAdminView.vue`
- `src/views/firstcheck/FirstCheckVerifierView.vue`
- `src/views/WorkspaceTodoView.vue`
- `src/components/AppShell.vue`
- `src/router/index.ts`
- `src/api/firstcheck.ts`
- `src/types/firstcheck.ts`

## 页面表现
- 管理员分类弹窗复刻原型的页头、基本信息、设备分类、保存/提交按钮。
- 检定员待办总览在 `/todo` 对检定员角色显示为“检定员待办总览”，统计数量从工作流待办计算。
- 检定员首检详情复刻原型统计卡、状态条、筛选区、首检明细表格、上传附件按钮、处理按钮。
- 检定填写弹窗复刻原型基本信息、结果判定、入库设备信息、底部证书/日期表格。

## 验证
- `npm run typecheck` 通过。
- `npm run build` 通过。
- `http://127.0.0.1:5174/todo` 返回 200。
- `http://127.0.0.1:5174/firstcheck/admin` 返回 200。
- `http://127.0.0.1:5174/firstcheck/verifier` 返回 200。
