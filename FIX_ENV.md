# 🔧 修复 "Invalid API key" 错误

## 问题诊断

您的 `.env.local` 文件缺少 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，这是导致注册失败的原因。

## 快速修复步骤

### 1. 打开 Supabase Dashboard
访问：https://app.supabase.com/project/lqdgjjjyxrfhlfxktxde/settings/api

### 2. 获取 API Keys

在 **Project API keys** 部分，您会看到两个密钥：

#### a) anon public key
- 标签显示：`anon` `public`
- 这个密钥用于：用户认证（登录/注册）
- 添加到 `.env.local` 作为：`NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### b) service_role secret key  
- 标签显示：`service_role` `secret`
- 这个密钥用于：管理员操作（绕过 RLS）
- 添加到 `.env.local` 作为：`SUPABASE_SERVICE_ROLE_KEY`

### 3. 更新 .env.local 文件

确保您的 `.env.local` 文件包含以下三行：

```env
NEXT_PUBLIC_SUPABASE_URL=https://lqdgjjjyxrfhlfxktxde.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（完整的 anon key）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（完整的 service_role key）
```

### 4. 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

## 如何区分两个密钥？

- **anon key**: JWT payload 中包含 `"role":"anon"`
- **service_role key**: JWT payload 中包含 `"role":"service_role"`

您可以使用 https://jwt.io 解码 JWT token 来验证。

## 验证配置

重启后，如果控制台没有显示环境变量错误信息，说明配置成功。

如果仍有问题，请检查：
1. `.env.local` 文件是否在项目根目录
2. 环境变量名称是否正确（注意大小写）
3. 密钥是否完整（没有截断）
4. 是否已重启开发服务器

