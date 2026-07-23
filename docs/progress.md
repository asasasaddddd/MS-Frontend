# 前端重构进度

## 2026-07-22 状态变更总代办聚合

- 工作台状态变更当前待办聚合为一条“状态变更”入口，显示当前角色实际待处理的变更单总数。
- 统计保留待办状态、角色节点和检定员类型过滤，并按业务单 ID 去重。
- 聚合入口不携带单据 ID，进入当前角色详情页后由表格逐单展示和处理。
- 状态变更已办仍按一张变更单一条记录展示，并可携带单据 ID 直接查看历史。
- 验证通过：42 个 Node 契约测试、`npm run typecheck`、`npm run build`。

## 2026-07-22 周检异常检定周期仅允许延长

- 周检异常周期调整下拉仅显示严格大于设备当前周期的生产字典项。
- 批量设备共用一个目标周期时，以本批最大当前周期作为过滤基准，并在“调整前”显示本批最长周期。
- 请求构建按设备再次校验，目标周期相等、缩短或设备缺少有效当前周期时阻止提交并显示明确提示。
- 字典异步加载或设备批次变化后，已选周期不再合法时自动清空。
- 验证通过：41 个 Node 契约测试、`npm run typecheck`、`npm run build`。

## 2026-07-22 管理类别调整批量与逐台选择规则

- 周检异常管理类别调整固定目标为 C 类；原 C 类设备在前端提交前拦截，模型和后端均保留最终校验。
- 周检异常已选器具桌面端改为一排两台，窄屏自动退回一排一台。
- 管理员手动管理类别调整仅允许原管理类别一致的批量设备；弹窗内每台设备单独选择目标类别，选项排除本台原类别，并逐台写入提交项。
- 后端按设备解析并规范化目标类别，拒绝缺少原类别、非法类别、目标等于原类别，以及周检来源目标不为 C 类的请求。
- 验证通过：41 个前端 Node 契约测试、`npm run typecheck`、`npm run build`。

## 2026-07-22 首检确认员边界与附件鉴权下载

- 已复核首检管理员分类弹窗和请求：只提交责任工程师，不存在确认员字段或确认员姓名必填校验，也不存在首检管理员转办接口。
- 检定员外委否通用检定弹窗继续保留确认员选择，该字段仅用于标签署名，不创建确认员审批待办。
- 附件列表与上传结果统一改为鉴权 Blob 下载，复用当前 Axios 会话请求头，修复直接打开下载链接导致“未登录或登录已失效”的问题。
- 本轮不修改周检、抽检确认员流程，也不修改旧前端目录。
- 验证通过：首检确认员边界测试、附件契约测试、TypeScript 类型检查和 Vite 生产构建。

## 2026-07-06 状态变更主管审批弹窗复刻
- 输入原型：`C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\2026-06-12-09-10-13\分厂主管领导状态变更审批详情弹窗.html`。
- 新增 `src/views/change/components/ChangeApprovalDialog.vue`，按原型复刻：760px 居中弹窗、标题区、返回/退回/同意按钮、设备明细表、调整信息、申请日期、附件、审批意见。
- `ChangeDeptLeaderView.vue` 已改为点击单条“处理”或批量按钮时打开审批弹窗，不再从列表直接审批。
- 批量处理已约束为同一变更类型；选中一类后其他类型复选框禁用，避免混合审批。
- 弹窗标题和调整字段会根据变更类型实时切换：封存、启用、转移、管理类别调整、检定周期调整、非正常报废、用前检定。
- 顺手清理 `changeDisplayModel.ts` 中状态变更中文映射乱码，统一输出正常中文。
- 验证通过：`npm run typecheck`、`npm run build`。

## 2026-07-06 表格长字段重合修复
- 本轮只修改新前端 `F:\MetrologySystem\MS-Frontend`，未修改后端。
- 修复测量设备台账表格中“计量编号”和“器具名称”长文本重合问题：扩大计量编号、器具名称、规格型号、使用部门列宽，并增加固定表格布局、单元格溢出隐藏和省略号显示。
- 修复周检公共任务表、管理员核实弹窗表格、周检详情弹窗和周检检定/确认/外扩填写弹窗的长字段溢出问题；只读表单输入框统一增加省略号显示，完整内容可通过悬停查看。
- 影响文件：`DeviceLedgerView.vue`、`periodicDisplayModel.ts`、`PeriodicTaskTable.vue`、`PeriodicPlanConfirmDialog.vue`、`PeriodicDetailDialog.vue`、`PeriodicVerifyDialog.vue`、`PeriodicExternalVerifyDialog.vue`、`PeriodicSupplierFillDialog.vue`、`PeriodicConfirmDialog.vue`。
- 验证通过：`node --experimental-strip-types tests\deviceLedgerModel.test.ts`、`node --experimental-strip-types tests\periodicDisplayModel.test.ts`、`npm run typecheck`、`npm run build`。

## 2026-07-04 登录页
- 新前端根目录：`F:\MetrologySystem\MS-Frontend`。
- 已补齐最小 Vue 3 + Vite + TypeScript + Pinia + Vue Router + Ant Design Vue 工程入口。
- 已实现登录链路：
  - `POST /api/auth/login`
  - 入参：`employeeId`、`password`
  - 返回：`token`、`employeeId`、`employeeName`、`roleCode`、`roleName`、`deptId`、`deptName`、`homePath`
- 已实现统一请求封装：
  - baseURL 默认 `/api`
  - Vite 代理默认转发到 `http://127.0.0.1:8080`
  - 自动携带 `Authorization: Bearer <token>`
  - 自动携带 `X-User-Id`、`X-User-Name`、`X-User-Role`、`X-User-Dept-Id`、`X-User-Dept-Name`
  - `code !== 200` 时抛出后端 `message`
  - 401 时清理本地会话并跳转 `/login`
- 已实现会话持久化：
  - localStorage key：`ms-frontend.login-user`
  - Pinia store：`src/stores/session.ts`
- 已实现路由守卫：
  - 未登录访问业务页跳转 `/login`
  - 已登录访问 `/login` 跳转后端返回的 `homePath`
  - 已按后端 `RoleCode.getHomePath()` 注册临时工作台路由
- 验证结果：
  - `npm run typecheck` 通过
  - `npm run build` 通过
  - 前端服务已启动：`http://127.0.0.1:5174/login`
  - 直连后端 `POST http://127.0.0.1:8080/api/auth/login` 已通过；请求体需要按 UTF-8 JSON 文件或正确转义发送

## 2026-07-04 全角色登录验证
- 验证方式：
  - 真库查询 `SYS_ROLE`、`SYS_USER_ROLE`、`SYS_USER`，获取当前已配置角色账号。
  - 直连后端 `POST http://127.0.0.1:8080/api/auth/login`。
  - 通过前端代理 `POST http://127.0.0.1:5174/api/auth/login`。
  - 密码统一使用 `Metrology@2024`。
- 通过角色：
  - `MEASURE_ADMIN` / `U00109024` / `/periodic/admin`
  - `VERIFIER_SELF` / `U00108406` / `/periodic/verifier`
  - `VERIFIER_EXTERNAL` / `U00108405` / `/periodic/verifier-external`
  - `CONFIRMER` / `U00109156` / `/periodic/confirmer`
  - `DEPT_LEADER` / `U00109027` / `/change/approval`
  - `RESPONSIBLE_ENGINEER` / `U00108072` / `/firstcheck/engineer`
  - `EXTERNAL_OPERATOR` / `EXT001` / `/scan`
- 待处理：
  - `MEASURE_LEADER` 当前与 `DEPT_LEADER` 共用工号 `U00109027`。
  - 后端登录实现只取该用户第一条角色映射，所以使用 `U00109027` 登录实际返回 `DEPT_LEADER`，无法单独验证 `MEASURE_LEADER`。
  - 需要给 `MEASURE_LEADER` 配置独立账号，或后端登录支持选择角色。

## 2026-07-04 角色侧边栏与统一入口
- 输入文件：
  - `F:\MetrologySystem\MetrologySystem\11111111111.md`
  - 已按其中首检、周检、状态变更三条流程的节点矩阵设计侧边栏。
- 已实现：
  - `src/composables/useNavSections.ts`
    - 抽出角色-模块-节点侧边栏配置。
    - 所有角色固定有 `/todo` 统一入口。
    - 不参与周检的角色不会出现周检侧边栏按钮。
  - `src/components/AppShell.vue`
    - 深色固定侧边栏。
    - 顶栏显示面包屑、页面标题、角色标签、当前用户、退出按钮。
    - 支持侧边栏收起/展开。
  - `src/stores/app.ts`
    - 保存侧边栏折叠状态。
  - `src/router/index.ts`
    - `/login` 留在布局外。
    - `/todo` 和所有业务模块统一进入 `AppShell`。
    - 角色无权限访问模块路由时回到 `/todo`。
    - 登录成功默认进入 `/todo`，不直接跳后端 `homePath`，满足统一入口。
  - `src/views/WorkspaceTodoView.vue`
    - 展示当前登录人信息。
    - 展示当前角色可进入模块卡片。
    - 当前模块页面未实现时显示建设中提示。
- 当前侧栏权限：
  - `MEASURE_ADMIN`：首检管理员、周检管理员、状态变更申请、扫码、已打印标签、设备台账。
  - `VERIFIER_SELF`：首检检定、自检周检、扫码、标签打印、设备台账。
  - `VERIFIER_EXTERNAL`：首检检定、外委周检、扫码、标签打印、设备台账。
  - `CONFIRMER`：首检确认、周检确认、设备台账。
  - `DEPT_LEADER`：首检主管审批、状态变更审批、设备台账。
  - `RESPONSIBLE_ENGINEER`：首检工程师、设备台账。
  - `MEASURE_LEADER`：状态变更审批、设备台账。
  - `SUPPLIER`：首检申请。
  - `EXTERNAL_OPERATOR`：设备扫码。
  - `PLANNER` / `PURCHASE_WAREHOUSE`：当前只保留统一入口，等待流程文件补充对应节点后扩展。
- 清理：
  - 删除 `src` 下上一轮 TypeScript 误生成的 `.js` 文件，避免 Vite 优先解析旧文件。
- 验证：
  - `npm run typecheck` 通过。
  - `npm run build` 通过。
  - `http://127.0.0.1:5174/todo` 返回 200。
  - `http://127.0.0.1:5174/periodic/admin` 返回 200。

## 2026-07-04 统一待办页原型对齐
- 输入：
  - 浏览器批注：`管理员待办页面.html` 中的页头和待办内容区。
  - 原型文件：`C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\管理员待办页面.html`
  - 原型样式：`C:\Users\30676\Desktop\prototype-html(1)\prototype-html\standalone\styles.css`
- 已实现：
  - `src/components/AppShell.vue`
    - 页头改为原型结构：`首页 / 工作台 / 待办事项` + `待办事项`。
    - 右侧改为角色下拉样式：`角色 · 姓名`。
    - 去掉内容区上方额外说明条，让 `/todo` 内容直接贴近原型。
  - `src/views/WorkspaceTodoView.vue`
    - 按原型实现三张统计卡：待办流程、未送检器具、状态变更未完流程。
    - 按原型实现“我的待办”面板。
    - 使用 Ant Design Vue 组件承载筛选栏：`a-select`、`a-input`、`a-button`、`a-tag`。
    - 待办项按角色权限过滤：
      - 首次检定：供应商、采购库房、管理员、主管、工程师、检定员、确认员。
      - 周检计划：管理员、自检检定员、外委检定员、确认员。
      - 状态变更：管理员、分厂主管、计量领导。
      - 抽检计划：计划员。
    - 点击“查看详情”跳转到当前角色对应模块路由。
  - `src/composables/useNavSections.ts`
    - 工作台入口命名对齐为“待办事项”。
    - 增加计划员抽检入口 `/sampling/plan`。
- 验证：
  - `npm run typecheck` 通过。
  - `npm run build` 通过。
  - 重启 Vite dev server 到 `http://127.0.0.1:5174/`，清掉旧 `.js` 模块缓存。
  - Playwright 使用本机 Chrome 预览 `/todo` 成功，管理员角色显示：首次检定、周检计划、状态变更。
  - 供应商角色验证：显示首次检定，不显示周检计划待办。
## 2026-07-06 周检单级工作台入口
- 本轮仅修改 `F:\MetrologySystem\MS-Frontend`，未改后端。
- `src\views\WorkspaceTodoView.vue`：统一待办工作台中的周检不再按模块汇总成一条“周检计划”，而是按 `/api/periodic/my-tasks` 返回的 `planId` 分组；一张周检单显示一条记录。
- 周检工作台行显示：`周检单 <编号>`、设备数量、当前节点摘要；行内数量仍表示该周检单内设备台数。
- 点击某一条周检单时带 `?planId=<planId>` 跳转到对应角色周检页面。
- `src\views\periodic\components\PeriodicTaskWorkspace.vue`：读取路由 `planId` 后只展示该周检单下的设备；计划概览、当前待办、参与记录都会按该 `planId` 收窄。
- 验证通过：`node --experimental-strip-types tests\periodicDisplayModel.test.ts`、`node --experimental-strip-types tests\periodicContract.test.ts`、`npm run typecheck`、`npm run build`。
## 2026-07-06 首检单级工作台入口
- 本轮仅修改新前端 `F:\MetrologySystem\MS-Frontend`，后端未改。
- 统一待办工作台中的首检不再显示为一个静态模块入口，改为读取 `/api/workflow/my-tasks` 当前待办；按 `businessId/orderId` 展示为“一张首检单一条记录”。
- 工作台首检条目会补查 `/api/firstcheck/detail/{orderId}`，展示首检编号、设备名称、数量和当前节点摘要。
- 点击首检条目时，管理员、主管领导、责任工程师、检定员、确认员分别跳转到对应首检角色页，并携带 `?orderId=<orderId>`。
- 首检管理员、主管领导、责任工程师、检定员、确认员页面均读取路由 `orderId`，在 `/api/workflow/my-tasks` 结果中过滤到当前这一张首检单；未带 `orderId` 时仍保留角色详情总览能力。
- 外扩人员首检条目直接进入统一设备扫码页 `/scan`，携带 `module=firstcheck`、`orderId` 和由节点推导的扫码动作。
- 验证通过：`npm run typecheck`、`npm run build`。
## 2026-07-06 测量设备台账页面完成
- 本轮仅修改新前端 `F:\MetrologySystem\MS-Frontend`，后端未改。
- 新增 `src/views/device/DeviceLedgerView.vue`，并在路由中接入 `/device/ledger`，侧边栏“测量设备台账”现在进入真实页面，不再落到占位工作台。
- 台账页按截图复刻：标题、搜索区、状态筛选、类别筛选、全部/本部开关、查询/重置/新增器具按钮、紧凑表格、横向滚动、分页、详情/履历操作。
- 台账列表对接真实 `/api/device/page`；详情弹窗点击时补查 `/api/device/{deviceCode}`，展示计量编号、物料号、器具名称、规格型号、制造厂家、使用部门、管理类别、状态、是否强检、检定周期、检定方式、上次检定、下次检定、量程、精度等级、指定检定员、计量管理员。
- 履历弹窗已做成弹窗样式，当前后端 `DeviceController` 尚未暴露设备履历 HTTP 接口，因此前端先基于设备当前字段生成首条履历摘要；后续若补 `/api/device/{deviceCode}/history`，替换弹窗数据源即可。
- 新增展示模型 `src/views/device/deviceLedgerModel.ts` 和测试 `tests/deviceLedgerModel.test.ts`，覆盖类别中文、状态中文、检定方式、检定周期、超期判断和履历摘要。
- 验证通过：`node --experimental-strip-types tests\deviceLedgerModel.test.ts`、`npm run typecheck`、`npm run build`。
## 2026-07-06 周检页面测试数据
- 本轮未改前端代码，配合页面测试在真库写入周检视觉测试数据。
- 后端脚本位置：`F:\MetrologySystem\MetrologySystem\.dbtest\SeedPeriodicVisualData.java`。
- 真库批次号：`14587717`。
- 计划号前缀：`ZJ-VIS-14587717-`；设备计量编号前缀：`ZJVIS-14587717-`。
- 共插入 7 张周检计划、21 台设备，每张周检计划 3 台设备，匹配当前总代办“按周检单一条记录、进入后处理该单设备明细”的前端逻辑。
- 测试账号：
  - 管理员：`U03013971 / 胡兰氪 / MEASURE_ADMIN`，可看 `plan_confirm`、`manager_receive`、`manager_forward_confirm`、`manager_take_back`、`exception_disposal`。
  - 自检检定员：`U00108406 / 自检检定员 / VERIFIER_SELF`，可看 `transfer_verifier`、`self_verify`、`print_label`。
  - 外委检定员：`U00108405 / 外委检定员 / VERIFIER_EXTERNAL`，可看 `transfer_verifier`、`send_out_return`、`verifier_fill_info`、`print_label`、`return_factory`。
  - 外扩人员：`EXT001 / 外扩人员 / EXTERNAL_OPERATOR`，可看 `send_out`、`supplier_fill_info`。
  - 确认员：`U00109156 / 张晓红 / CONFIRMER`，可看 `confirmer_confirm`。
- 标签页面数据：`MET_LABEL_PRINT_RECORD` 已有待打印 3 条、已打印 2 条，`SOURCE_TYPE=PERIODIC`，`SOURCE_ID=周检任务ID`，可用于 `/label/print` 页面验证选择、预览、二维码和打印次数展示。
# 2026-07-06 P4 费用、抽检、产品配套计划固定

- 本轮未修改前端业务代码，只做后续实现计划。
- 确认当前前端状态：
  - `src/views/cost/CostListView.vue` 仍是占位页。
  - `src/views/sampling/SamplingPlannerView.vue`、`SamplingAdminView.vue`、`SamplingVerifierView.vue`、`SamplingConfirmerView.vue` 为空文件。
  - 产品配套模块尚无 `src/views/product-support`、`src/api/productSupport.ts`、`src/types/productSupport.ts`。
  - `src/router/index.ts` 尚未接入抽检真实页面和产品配套路由。
  - `src/composables/useNavSections.ts` 当前只有计划员抽检入口，缺少管理员、检定员、确认员抽检入口和产品配套入口。
- 已固定计划文档到后端文档目录：`F:\MetrologySystem\MetrologySystem\docs\p4_cost_sampling_product_plan.md`。
- 下一步前端执行顺序：费用页面复刻 -> 抽检页面复刻/联调 -> 产品配套页面复刻/联调 -> 统一待办和侧栏补齐。
## 2026-07-06 周检管理员异常分流规则固定
- 用户最终确认：周检管理员详情单不再做“核实筛选”；管理员直接勾选一条或多条周检设备，选择异常分支类型后提交。
- 新前端 `F:\MetrologySystem\MS-Frontend` 已删除旧 `PeriodicPlanConfirmDialog.vue`，不再保留单独“管理员核实/批量核实”弹窗和入口。
- 前端已删除旧 `/periodic/plan-confirm` API 封装与 `PeriodicPlanConfirmRequest` 类型，只保留 `/periodic/exception-change/submit` 作为周检异常分流提交入口。
- 管理员周检表格保持无“操作”列；页面右上角统一使用异常分支选择器和“提交异常分支”按钮，要求选中任务属于同一张周检单。
- 验证通过：`node --experimental-strip-types tests\periodicDisplayModel.test.ts`、`node --experimental-strip-types tests\periodicContract.test.ts`、`npm run typecheck`、`npm run build`。
# 2026-07-12 首检费用字段统一

- 首检详情和检定提交类型统一为 `verificationUnitPrice: number`。
- 删除首检前端的 `selfCost/sendoutCost` 双字段，不保留旧请求参数。
- 检定弹窗自检、外委共用“单台检定费用（元）”。
- Ant Design 5 `InputNumber` 固定最小值 0、精度 2、步长 0.01。
- 新增 `tests/firstCheckCostContract.test.ts`，约束字段、文案和控件精度。
- 后端真库已同步为 `MET_FIRST_CHECK_ORDER.VERIFICATION_UNIT_PRICE DECIMAL(18,2)`。

## 2026-07-12 首检检定员角色待办隔离

- 同一工号兼任自检检定员和外委检定员时，总代办与首检检定员详情页统一按当前角色过滤。
- `VERIFIER_SELF` 仅显示 `verificationType=self_check`，`VERIFIER_EXTERNAL` 仅显示 `verificationType=external_commission`。
- 非检定员角色不受该过滤规则影响。
- 新增模型测试覆盖自检、外委和非检定员角色匹配。
- 验证通过：模型测试、`npm run typecheck`、`npm run build`。

## 2026-07-12 周检可控测试任务生成

- 周检管理员工作台新增“生成周检待办”按钮，调用 `/api/periodic/plans/generate-test-one`。
- 生成成功后自动定位新计划并刷新当前待办列表；后端无合格候选设备时展示业务错误。
- 新增前端周期接口契约断言；`node --experimental-strip-types tests\\periodicContract.test.ts`、`npm run typecheck`、`npm run build` 通过。

## 2026-07-13 周检测试任务固定王熙然归属

- 管理员周检工作台“生成周检待办”继续调用真实接口 `/api/periodic/plans/generate-test-one`。
- 二次确认明确说明：创建全新测试设备，归 `数智部 / 王熙然` 管理，并派给王熙然自检。
- 成功提示同步显示计划 ID、设备归属和自检派单结果，避免误认为任务归当前任意管理员。
- 前端契约测试增加固定文案断言；`npm run build` 通过。

## 2026-07-13 周检三类全链路测试单选择

- 管理员周检工作台在“生成周检待办”按钮前增加场景选择：自检、外委通用设备、外委否通用设备。
- `generatePeriodicTestPlan` 接收强类型 `PeriodicTestPlanScenario`，并通过 `scenario` 查询参数调用真实后端接口。
- 二次确认和成功提示按当前选择动态显示，不再固定描述为自检。
- 前端契约测试已覆盖三个场景编码、中文选项和 API 参数；直接 Node 契约测试、`npm run typecheck`、`npm run build` 通过。
# 2026-07-22 首检分类规则调整

- 管理员选择带报告不再强制上传报告附件；分类弹窗保留报告字段和可选附件能力。
- 责任工程师选择自检时通用设备控件禁用，切换到自检自动固定为“是”，请求提交再次固定 `isCommon=1`。
- 外委时通用/否通用控件保持可用，由后端校验必填和值域。
- 新增 `tests/firstCheckClassificationRulesContract.test.ts` 固化前端契约。
- 验证通过：38 个契约测试、`npm run typecheck`、`npm run build`、`git diff --check`。

# 2026-07-22 生产字段字典接入

- 新增 `src/api/dict.ts`，统一调用后端 `/api/dict/item/listByType`。
- 新增 `useProductionDictionaries`：一次加载设备用途、检定周期、学科大类/小类和专用项目，提供会话级缓存、并发请求去重、错误状态和学科父子级联。
- 首检检定弹窗中的设备用途、学科大类、小类、专用项目和检定周期全部改读后端字典；学科小类支持 271 项搜索并按大类过滤。
- 超级管理员台账编辑表单使用相同字典，并通过 `withCurrentOption` 保留历史旧值展示，避免打开旧台账时静默丢值。
- 状态变更申请、检定员处理和周检异常分支的周期选择统一改读正数生产周期；删除模型层和模板中的硬编码周期数组。
- 更新旧版首检布局契约，禁止重新引入数字周期硬编码；新增生产字典总契约。
- 验证通过：39 个契约测试文件、`npm run typecheck`、`npm run build`、`git diff --check`。
- 后端真库迁移已执行；启用项数量为设备用途 5、检定周期 10、学科大类 13、学科小类 271、专用项目 9，前端可通过字典接口加载完整生产选项。

# 2026-07-22 首检单台检定要求调整

- 完善计量编号表格的检定日期列增加红色必填标识和原生 `required` 属性，提交前继续逐行拦截空日期。
- 删除外委分支逐台附件必传校验，移除 `attachmentRequired` 组件参数和“必传”动态标题。
- 自检、外委通用、外委否通用的单台附件统一显示为“检定证书（选传）”；已上传附件仍随请求提交并绑定对应设备。
- 新增规则契约测试；前端 40 个契约测试文件、`npm run typecheck`、`npm run build` 通过。

# 2026-07-22 台账履历附件按设备隔离

- 台账设备履历不再调用只带 `caseId` 的全案例附件接口，改为调用 `/api/attachment/cases/{caseId}/devices/{deviceId}`。
- 打开业务案例详情时从当前台账设备读取真实主键；主键缺失时提示错误并阻止查询，避免再次显示同案例全部设备附件。
- 案例公共附件继续展示，当前设备附件继续展示，同批其他设备附件由后端查询层排除。
- 更新 `tests/deviceBusinessHistoryApi.test.ts` 固化设备范围接口和调用参数。
- 验证通过：40 个契约测试文件、`npm run typecheck`、`npm run build`、`git diff --check`。

# 2026-07-23 Task 7 工作台角色隔离

- 工作台角色切换时立即清空上一角色的待办、已办和详情快照，并重新请求后端当前角色数据。
- 每轮加载记录角色编码和加载代次；旧角色请求晚返回时直接丢弃，防止异步响应串写。
- 首检和状态变更不再复制后端节点权限表，只展示详情接口确认当前角色可见的业务单。
- 周检、抽检和产品配套已办直接消费后端互斥历史接口，不再在前端重复扣除当前待办。
- 产品配套申请必须选择自检或外委检定员角色，人员下拉只查询当前部门该角色人员。
- 验证通过：51 个契约测试、`npm run typecheck`、`npm run build`、`git diff --check`。
- `dist.zip` 保持未跟踪，不纳入提交。

# 2026-07-23 Task 8 统一汇总生产验证

- 前端五模块继续只消费后端权威汇总接口，不从明细列表拼装业务数量。
- 只读真库 E2E 已核对首检、周检、状态变更真实样本的列表、详情、汇总和权限；抽检、产品配套因真库无样本仅验证空数据契约。
- 页面指标到 API、Service、权威表字段、权限规则和测试证据的完整映射记录在后端仓库 `docs/flow_summary_operation_matrix.md`。
- 新增跨平台 `npm test` 入口，稳定按文件名顺序执行全部 `tests/*.test.ts`，任一测试失败立即返回非零退出码。
- 规模 p95 和抽检/产品配套完整写流程 E2E 仍需隔离数据环境，前端进度不得将空表标记为全链路通过。
- `dist.zip` 继续保持未跟踪，不纳入提交。

# 2026-07-23 全角色全流程汇总布局恢复

- 用户确认统一汇总必须保留各业务页面原有页头和明细布局，禁止用一张纵向大卡片替换页面结构。
- 公共 `FlowStatusSummary` 恢复旧版横向摘要样式：概览指标使用紧凑小卡片，状态分类使用同一行的轻量分块。
- 全角色、全流程统一按“业务流程、实物交接、标签状态”三组展示；工作流、结果和异常归入业务流程，扫码归入实物交接。
- 状态分块默认收起，点击后只展开当前一组详情，避免分类多时把明细表整体向下挤压。
- 修复 MySQL 聚合数量以数字字符串返回时前端发生字符串拼接的问题，不再出现“已分类 00004100”类错误告警。
- 验证通过：51 个契约测试、`npm run typecheck`、`npm run build`；910px Playwright 点检无横向溢出、无控制台错误，三个分块均可点击展开。
- 后端 8080 已后台启动并单次 HTTP 验证返回 200，保持运行供手动测试。

# 2026-07-23 公共流程汇总分块切换稳定性修复

- `FlowStatusSummary.vue` 的分块点击由“展开/收起切换”改为幂等选择；重复点击当前分块保持详情展示，仅允许通过详情右上角关闭按钮收起。
- 删除汇总快照刷新时主动清空当前分块的监听逻辑；后端数据短暂刷新期间保留用户选择，维度数据恢复后继续展示原分块。
- 补充公共组件契约测试，覆盖“业务流程 -> 实物交接 -> 业务流程”和重复点击当前分块不收起的交互约束。

# 2026-07-23 公共流程汇总详情切换稳定性修复

- `FlowStatusSummary.vue` 不再通过 `activeGroup` 二次查找单个详情；每个分块直接使用同一份 `dimensionGroups` 数据渲染。
- 三个详情面板常驻 DOM，仅使用 `v-show` 切换可见性，避免业务流程与实物交接切换时标题更新但详情子节点丢失。
- 回归验证覆盖切换后可见详情维度数量、状态标签数量、活动分块数量及重复点击行为；三个面板中始终只有一个可见。

# 2026-07-23 全角色全流程统一待办汇总收口

- 公共 `FlowStatusSummary` 取消“业务流程 / 实物交接 / 标签状态”三个点击分块，顶部固定展示后端 `pending` 和 `today_new`，下方直接平铺 `business` 当前节点。
- 首检管理员、检定员、责任工程师、主管领导，周检全部处理角色，状态变更待办角色，抽检处理角色和产品配套检定员统一复用公共组件。
- 周检和抽检仍可保留各自计划基本信息卡，但待办指标与节点状态只由公共组件渲染，不再维护模块专用统计样式。
- 状态变更发起页和历史已办页移除待办汇总；供应商首检发起、抽检计划编制和产品配套送检同样保持发起页职责，不伪装为角色待办页。
- 新增全页面契约测试，约束实际待办页必须接入公共组件、非待办页不得接入、所有页面不得增加汇总定时轮询。
- `dist.zip`、`dist (2).zip`、`dist (3).zip` 保持未跟踪，不纳入提交。
- 本轮完整 `npm test`、类型检查和生产构建结果将在最终提交前补充。
# 2026-07-23 全角色全流程统一待办汇总收尾

- 所有实际待办页面复用 `FlowStatusSummary.vue`，统一显示当前角色待办、今日新增和后端返回的业务当前节点；发起页与历史页不挂待办汇总。
- 清理前端过期的“参与流程汇总”语义及旧汇总测试契约，保留模块自己的表格、页头和详情布局；不增加轮询。
- 验证通过：`npm test` 52 个契约测试、`npm run typecheck`、`npm run build` 均通过；`git diff --check` 无错误。
