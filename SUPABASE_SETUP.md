# Supabase 配置说明

## 环境变量配置

在 `.env.local` 文件中，您需要配置以下 Supabase 相关的环境变量：

### 必需的环境变量

1. **NEXT_PUBLIC_SUPABASE_URL**
   - 您的 Supabase 项目 URL
   - 可以从 Supabase 项目设置中获取: https://app.supabase.com/project/_/settings/api
   - 这是公开的，可以暴露在客户端代码中

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Supabase 匿名密钥 (anon/public key)
   - 用于客户端和服务器端的用户认证
   - 可以从 Supabase 项目设置中获取
   - 这是公开的，可以暴露在客户端代码中

3. **SUPABASE_SERVICE_ROLE_KEY**
   - Supabase 服务角色密钥
   - 用于绕过 Row Level Security (RLS)，仅在服务器端使用
   - ⚠️ **警告**: 永远不要将此密钥暴露在客户端代码中
   - 可以从 Supabase 项目设置中获取

### 示例配置

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 项目结构

项目中的 Supabase 配置位于以下位置：

- `utils/supabase/client.ts` - 客户端端 Supabase 客户端（用于浏览器）
- `utils/supabase/server.ts` - 服务器端 Supabase 客户端（用于 Server Components 和 Server Actions）
- `utils/supabase/admin.ts` - 管理员客户端（使用 SERVICE_ROLE_KEY，绕过 RLS）
- `middleware.ts` - Next.js 中间件，用于自动刷新用户会话

## 如何获取 Supabase 密钥

1. 登录到 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目
3. 进入 **Settings** > **API**
4. 在 **Project URL** 下找到 `NEXT_PUBLIC_SUPABASE_URL`
5. 在 **Project API keys** 下找到：
   - `anon` `public` 键 → 这是 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` 键 → 这是 `SUPABASE_SERVICE_ROLE_KEY`

## 注意事项

- `NEXT_PUBLIC_*` 前缀的环境变量会被暴露到客户端代码中
- `SUPABASE_SERVICE_ROLE_KEY` 没有 `NEXT_PUBLIC_` 前缀，因此只在服务器端可用
- 确保 `.env.local` 文件已添加到 `.gitignore` 中，不要提交到版本控制

