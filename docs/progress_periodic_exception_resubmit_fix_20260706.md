# 周检异常分支二次提交修复记录（2026-07-06）

## 问题
- 管理员在周检详情页提交异常分支后，设备条目仍留在当前表格。
- 条目进入 `exception_disposal` 后仍可被再次勾选，并再次提交异常分支。

## 根因
- 管理员周检页把 `exception_disposal` 放进了当前可处理节点范围。
- 批量提交异常的候选节点也包含 `exception_disposal`。
- 提交成功后只刷新列表，未立即清空弹窗任务和勾选状态。

## 修复
- `PeriodicAdminView.vue`：管理员当前待办只显示 `plan_issue`、`plan_confirm`、`manager_receive`。
- `periodicExceptionModel.ts`：新增 `periodicExceptionSubmitNodeCodes` 和 `canSubmitPeriodicException`。
- `PeriodicTaskWorkspace.vue`：批量异常候选统一使用 `canSubmitPeriodicException`。
- `PeriodicTaskWorkspace.vue`：提交成功后清空 `exceptionTasks`、`activeTask`、`selectedRowKeys`、`selectedTasks`。

## 验证
- `node --experimental-strip-types tests\periodicExceptionModel.test.ts`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。

## 后续边界
- `exception_disposal` 属于已进入状态变更/异常处置后的节点，不再允许从周检管理员异常分支表单重复提交。
- 如需查看已提交异常的设备，应走参与记录或状态变更模块，不放在管理员异常提交待办里继续处理。
