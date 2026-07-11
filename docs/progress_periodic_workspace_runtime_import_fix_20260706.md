# 周检页面运行时导入报错修复记录（2026-07-06）

## 问题
- 进入周检页面时报错：
  `periodicExceptionModel.ts does not provide an export named canSubmitPeriodicException`
- 报错发生在 `PeriodicTaskWorkspace.vue` 的运行时 named import。

## 处理
- `PeriodicTaskWorkspace.vue` 不再运行时导入 `canSubmitPeriodicException`。
- 只保留 `PeriodicExceptionAction` 的类型导入。
- 将周检管理员异常分支可提交节点判断放在当前工作区组件内部：
  - 允许节点：`plan_issue`、`plan_confirm`、`manager_receive`
  - 禁止状态：`exception`、`completed`、`rejected`、`cancelled`

## 原因
- `periodicExceptionModel.ts` 磁盘文件存在导出，但页面加载时仍命中旧模块导出表，导致路由进入前直接失败。
- 该判断只服务当前工作区的按钮可用性和选中校验，放在组件本地可以切断运行时导入风险。

## 验证
- `curl http://127.0.0.1:5173/src/views/periodic/components/PeriodicTaskWorkspace.vue?t=fixcheck`：返回内容中已无从 `periodicExceptionModel.ts` 导入该函数。
- `node --experimental-strip-types tests\periodicExceptionModel.test.ts`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
