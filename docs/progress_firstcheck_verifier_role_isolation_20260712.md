# 首检检定员角色待办隔离（2026-07-12）

- 根因：`/api/workflow/my-tasks` 按工号返回待办，同一工号多角色时前端未按当前角色继续过滤。
- `FirstCheckVerifierView.vue` 在详情加载后按 `verificationType` 与当前角色过滤。
- `WorkspaceTodoView.vue` 的首检条目和首检待办数量使用同一过滤规则。
- 公共匹配函数位于 `firstCheckVerifierModel.ts`，不修改公共工作流组件。
- 验证：模型测试、类型检查、生产构建全部通过。
