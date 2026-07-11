# 2026-07-04 首检责任工程师与确认员页面复刻

## 输入原型
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\确认员待办总览.html`
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\确认员首检待办详情.html`
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\确认员首检弹窗.html`
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\确认员的首检外委否通用设备带报告判定弹窗.html`
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\责任工程师待办总览.html`
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\责任工程师首检待办详情.html`
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\2026-06-12-09-10-13\责任工程师首检确认弹窗.html`

## 后端字段对齐
- 责任工程师提交：`POST /api/firstcheck/engineer-confirm-type`
  - `orderId`
  - `verificationType`：`self_check` / `external_commission`
  - `isCommon`：`1` 通用，`0` 否通用
  - 自检：`selfVerifierId/selfVerifierName`
  - 外委：`externalVerifierId/externalVerifierName` + `externalOperatorId/externalOperatorName`
  - `opinion`
- 确认员提交：`POST /api/firstcheck/confirmer-confirm`
  - `orderId`
  - `confirmResult`：`PASS` / `REJECT` / `RETURN`
  - `opinion`
- 人员下拉：
  - `GET /api/system/users/by-dept-role?deptId=&roleCode=VERIFIER_SELF`
  - `GET /api/system/users/by-dept-role?deptId=&roleCode=VERIFIER_EXTERNAL`
  - `GET /api/system/users/by-dept-role?deptId=&roleCode=EXTERNAL_OPERATOR`

## 工作流对齐
- 责任工程师页面：
  - 当前待办只查 `GET /api/workflow/my-tasks`。
  - 只过滤 `businessType=first_check` 且 `nodeCode=engineer_confirm_type`。
  - 提交后由后端流转到 `verifier_receive`，并派给选中的自检/外委检定员。
  - 原型中的“退回”按钮保留；由于首检责任工程师专用退回接口当前未暴露，前端提示不可提交退回。
- 确认员页面：
  - 当前待办只查 `GET /api/workflow/my-tasks`。
  - 只过滤 `businessType=first_check` 且 `nodeCode=confirmer_confirm`。
  - `PASS` 后端流转到 `assign_code`。
  - `REJECT` 后端终止首检单。
  - `RETURN` 后端退回到检定员重检节点。
  - 外委否通用且带报告时，复用确认员弹窗并显示“首检外委判定”标题。

## 已实现文件
- `src/views/firstcheck/FirstCheckEngineerView.vue`
- `src/views/firstcheck/FirstCheckConfirmerView.vue`
- `src/views/firstcheck/components/FirstCheckEngineerDialog.vue`
- `src/views/firstcheck/components/FirstCheckConfirmDialog.vue`
- `src/router/index.ts`
- `src/api/firstcheck.ts`
- `src/types/firstcheck.ts`
- `src/views/WorkspaceTodoView.vue`

## 验证
- `npm run typecheck` 通过。
- `npm run build` 通过。
- `http://127.0.0.1:5174/todo` 返回 200。
- `http://127.0.0.1:5174/firstcheck/engineer` 返回 200。
- `http://127.0.0.1:5174/firstcheck/confirmer` 返回 200。
