# 2026-07-04 工作流准备与管理员首检待办详情

## 输入依据
- `F:\MetrologySystem\MetrologySystem\11111111111.md`
- `C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\管理员首检待办详情.html`

## 已完成
- 新增统一工作流配置：`src/workflows/metrologyWorkflow.ts`
  - 首检：覆盖供应商提交、管理员分类、主管审批、工程师确认、检定员接收/检定、管理员转发、确认员确认、赋码、标签打印、实物取回。
  - 周检：覆盖计划确认、检定员接收、自检/外委、外委送出、送回、检定信息、二次判定、管理员转办、确认员判定、标签打印、返回分厂、管理员取回。
  - 状态变更：覆盖提交、部门审批、计量领导审批。
  - 统一处理 `first_check/FIRST_CHECK/firstcheck` 等业务类型别名。
- 新增接口与类型：
  - `src/types/workflow.ts`
  - `src/api/workflow.ts`
  - `src/types/firstcheck.ts`
  - `src/api/firstcheck.ts`
  - `src/api/system.ts`
- 侧边栏节点来源改为工作流配置，避免后续各页面各写一套节点。
- `/firstcheck/admin` 已切换为真实页面 `src/views/firstcheck/FirstCheckAdminView.vue`。
- 页头对齐原型：
  - 面包屑：`首页 / 工作台 / 待办事项 / 首次检定`
  - 标题：`首次检定待办`
- 管理员首检待办详情页已按原型实现：
  - 首检待办、今日新增统计卡。
  - 待分类、待转发、退回待修改状态条。
  - 首检明细面板。
  - 当前状态筛选、关键词查询、重置。
  - 转发确认员下拉和提交按钮。
  - 表格列：当前状态、首检编号、申请时间、设备名称、数量、物料编码、物料描述、使用部门、操作。
  - 点击处理打开弹窗详情，不在页面下方展开。

## 真实接口对接
- 当前待办：`GET /api/workflow/my-tasks`
- 首检详情：`GET /api/firstcheck/detail/{orderId}`
- 确认员下拉：`GET /api/system/users/by-dept-role?deptId=&roleCode=CONFIRMER`
- 管理员转发确认员：`POST /api/firstcheck/manager-forward`

## 验证
- `npm run typecheck` 通过。
- `npm run build` 通过。
