# 首检检定员扫码状态统一记录（2026-07-10）

## 问题
- 责任工程师推送检定员后，工作流节点进入 `verifier_verify`。
- 后端同时把首检单 `scanStatus` 置为 `wait_receive`。
- 扫码模块按 `scanStatus` 显示“待接收”，但首检检定员页面只看 `nodeCode=verifier_verify`，误显示“已接收”并允许打开检定填写。

## 结论
- 这是前端展示和入口判断问题，不改后端派单规则。
- 工作流节点用于判断“轮到哪个角色处理”，实物是否到位必须以 `scanStatus` 为准。

## 实现
- 新增 `src/views/firstcheck/firstCheckVerifierModel.ts`：
  - `resolveFirstCheckVerifierStatus` 统一推导检定员页显示状态。
  - `firstCheckVerifierAction` 统一推导按钮动作。
  - `canOpenFirstCheckVerify` 限制只有实物到位后才能打开检定填写。
- 修改 `src/views/firstcheck/FirstCheckVerifierView.vue`：
  - `scanStatus=wait_receive` 显示“待接收”，点击处理跳转 `/scan?module=firstcheck&action=receive`。
  - `scanStatus=wait_sendout` 显示“待外委送出”，不再误开检定弹窗。
  - `scanStatus=sent_out` 显示“已外委送出”，等待外委送回。
  - `scanStatus=wait_sendout_return` 显示“待外委送回”，点击处理跳转扫码送回。
  - 自检 `scanStatus=received` 或外委 `scanStatus=sendout_returned` 才显示可上传附件/填写检定。
  - 表格行 key 和选中 key 改为字符串，避免雪花 ID 精度问题。

## 验证
- `node --experimental-strip-types tests\firstCheckVerifierModel.test.ts` 通过。
- `Get-ChildItem tests\*.test.ts | ForEach-Object { node --experimental-strip-types $_.FullName }` 通过。
- `npm run typecheck` 通过。
- `npm run build` 通过。
