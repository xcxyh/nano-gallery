# Plan: 现有邮箱注册新增 Google 邮箱注册关联

## Requirements Summary
- 现状：邮箱密码登录走 [`app/actions.ts:15`](app/actions.ts:15) 的 `loginAction`，邮箱密码注册走 [`app/actions.ts:129`](app/actions.ts:129) 的 `registerAction`，会创建 `profiles` 资料并发放默认积分。会话恢复走 [`app/actions.ts:295`](app/actions.ts:295) 的 `getSessionAction`。
- 现状：登录/注册入口集中在 [`components/LoginModal.tsx:28`](components/LoginModal.tsx:28) 到 [`components/LoginModal.tsx:160`](components/LoginModal.tsx:160)，目前只有邮箱+密码表单，没有第三方登录按钮。
- 现状：Supabase SSR client 已具备浏览器端和服务端封装，分别在 [`utils/supabase/client.ts:3`](utils/supabase/client.ts:3) 和 [`utils/supabase/server.ts:4`](utils/supabase/server.ts:4)。
- 现状：登录相关文案在 [`i18n/messages/en.json:105`](i18n/messages/en.json:105) 和 [`i18n/messages/zh.json:105`](i18n/messages/zh.json:105)，需要同步补齐 Google 登录/注册文案。
- 目标：新增 Google OAuth 登录/注册，并把“同一邮箱的 Google 身份”与现有邮箱注册体系接入为同一业务账户，避免重复 profile、重复积分或用户看到两个账户。

## Assumptions
- v1 只支持 `Google -> 普通用户账户`；管理员 `accessCode` 仍保留邮箱注册路径，不通过 Google 首次注册直接授予管理员权限。这是为了避免把 OAuth 首登和高权限授予绑在一起。
- “关联”定义为：同一邮箱地址的 Google 登录最终落到同一个业务账户资料与积分体系，而不是新增一套平行资料。
- 若 Supabase 原生身份自动合并能力不足，则以“显式 identity linking 或受控迁移/合并逻辑”为准，不依赖模糊的默认行为。

## Acceptance Criteria
- 用户在登录弹窗可见 Google 登录入口，登录态与现有邮箱密码流程一致。
- 新用户使用 Google 首次登录后，能够自动创建 `profiles` 记录，并获得与邮箱注册一致的默认积分策略。
- 已存在邮箱密码账户的用户，使用同邮箱 Google 登录后，不会生成重复业务资料，不会多发初始积分。
- OAuth 回调失败、用户取消授权、邮箱未返回、关联冲突时，都能返回明确错误并回到可恢复页面。
- 中英文文案完整覆盖 Google 登录按钮、加载态、错误态、关联提示。
- 本地验证至少覆盖：全新 Google 注册、已有邮箱账户 Google 登录关联、重复登录幂等、回调失败回退。

## Implementation Steps
1. 明确账号关联策略并封装认证公共逻辑。
   在 [`app/actions.ts:15`](app/actions.ts:15)、[`app/actions.ts:129`](app/actions.ts:129)、[`app/actions.ts:295`](app/actions.ts:295) 之间已经存在重复的“补 profile / 默认积分 / displayName”逻辑。先抽出一个统一的 `ensureUserProfile`/`buildAppUser` 辅助函数，接受 Supabase `user` 和可选角色策略，统一处理 profile 查询、缺失补建、默认积分和头像生成。

2. 新增 Google OAuth 发起入口。
   在 [`components/LoginModal.tsx:76`](components/LoginModal.tsx:76) 附近加入 “Continue with Google” 按钮，并使用浏览器端 Supabase client（[`utils/supabase/client.ts:3`](utils/supabase/client.ts:3)）发起 `signInWithOAuth({ provider: 'google' })`。按钮应与现有邮箱表单并列，但不替代表单；登录态切换、错误态和 loading 需要独立控制，避免影响邮箱密码提交。

3. 新增 OAuth callback 路由并完成 code exchange。
   当前 `app/` 下没有 auth callback 路由，需要新增 `app/auth/callback/route.ts`。该路由负责：
   - 读取 `code` 和 `next` 参数。
   - 通过服务端 Supabase client（[`utils/supabase/server.ts:4`](utils/supabase/server.ts:4)）执行 `exchangeCodeForSession(code)`。
   - 交换成功后跳回首页或 locale 入口页；交换失败时附带错误参数重定向回登录入口。
   如果后续要保留语言上下文，推荐把 `next` 规范为 `/${locale}`，而不是写死 `/`。

4. 在 callback 后执行“同邮箱关联或幂等补齐”。
   回调拿到 session user 后，不要只依赖 [`app/actions.ts:295`](app/actions.ts:295) 的被动补 profile。需要新增一层明确的 OAuth post-login 处理：
   - 读取 OAuth user 的 `email`、provider、identity 信息。
   - 查找是否已存在同邮箱邮箱密码账户对应的业务 profile。
   - 若 Supabase 已把 identity 落到同一 auth user，则只做 `ensureUserProfile`。
   - 若 Supabase 为同邮箱创建了新的 auth user，则执行受控合并策略：保留旧业务 profile，不重复发积分，并给出需要人工/显式 link identity 的兜底日志与错误提示。
   这里的关键不是“让两个 auth user 共存”，而是保证应用层只认一个业务账户。

5. 收敛前端会话刷新和登录成功回调。
   首页当前依赖 [`app/[locale]/page.tsx:93`](app/[locale]/page.tsx:93) 附近的 `getSessionAction()` 拉取登录态。Google 回调完成后应复用这条链路，不额外造第二套 session store。必要时在回调返回首页后触发弹窗关闭、用户信息刷新，保持与邮箱登录成功后的 `onLoginSuccess` 体验一致。

6. 补齐国际化与错误提示。
   在 [`i18n/messages/en.json:105`](i18n/messages/en.json:105) 和 [`i18n/messages/zh.json:105`](i18n/messages/zh.json:105) 下新增：
   - Google 登录按钮文案
   - Google 注册说明
   - OAuth 回调失败/取消授权/账号已存在但未关联/关联成功提示
   - 管理员权限仅支持邮箱注册的说明

7. 补充环境配置与部署文档。
   README 或新文档中补充：
   - Supabase Dashboard 启用 Google Provider
   - 配置 Google Client ID / Secret
   - 配置站点 URL 与 callback URL
   - `.env.local` 所需变量
   - 本地和生产环境 callback 域名差异

## Recommended Design Decisions
- 优先复用现有 `profiles` 作为唯一业务账户来源，不把“是否 Google 用户”写成新的业务主键。
- 将“默认积分发放”绑定到 profile 首次创建，而不是绑定到任意登录方式，避免 Google 首登给老用户重复发积分。
- 将 `accessCode` 限制在邮箱注册流程，避免 OAuth 首登路径直接进入高权限分支。
- 若 Supabase 官方推荐使用显式 identity linking，则实现显式 linking；若当前项目阶段不适合改 auth user 合并，则至少先做到业务层 profile 幂等和冲突拦截。

## Risks and Mitigations
- 风险：同邮箱 Google 登录可能生成第二个 auth user。
  缓解：把 profile 作为业务唯一账户层，增加同邮箱冲突检测与幂等补齐；必要时使用 Supabase 官方 identity linking 能力。

- 风险：OAuth callback 在多语言路由下跳错页面。
  缓解：统一使用 `next` 参数和白名单相对路径，禁止开放重定向。

- 风险：重复创建 profile 导致积分重复发放。
  缓解：把“发放默认积分”严格收敛到 profile 首次 insert 成功时。

- 风险：Google 首登缺失 `name` 或用户取消授权。
  缓解：displayName 退回邮箱前缀，取消授权和缺少 email 进入可恢复错误页。

- 风险：管理员逻辑被 OAuth 绕过。
  缓解：Google 路径不接入 `accessCode`，管理员只走现有邮箱注册或后台授权。

## Verification Steps
1. 在 Supabase Dashboard 启用 Google provider，并配置本地 callback URL。
2. 手工验证全新 Google 用户首次登录后，`profiles` 新增一条记录，`credits` 为默认值，仅创建一次。
3. 先用邮箱密码注册，再用同邮箱 Google 登录，确认不会新增第二条业务 profile，也不会重复发初始积分。
4. 反复退出/登录 Google，确认 `getSessionAction` 返回同一业务用户数据。
5. 模拟 callback 缺少 `code`、`next` 非法值、用户取消授权，确认安全回退。
6. 运行 `npm run build`、`npx tsc --noEmit`，并手动检查登录弹窗的中英文文案。

## Open Decisions
- 如果 Supabase 当前租户未启用或不支持稳定的 identity linking，v1 是接受“业务层合并 + auth 层保留差异”作为过渡，还是直接补做 auth identity linking。我的建议是先验证官方 linking 能力；若接入成本过高，先保证业务层唯一账户和积分幂等。

## External References
- Supabase OAuth sign-in: https://supabase.com/docs/client/auth-signin
- Supabase Next.js auth callback pattern: https://supabase.com/docs/guides/auth/social-login/auth-twitter
