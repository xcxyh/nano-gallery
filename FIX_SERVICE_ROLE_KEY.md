# 修复 "Invalid API key" 错误

## 问题诊断

错误信息显示：
```
Invalid API key
Double check your Supabase `anon` or `service_role` API key.
```

**根本原因**：`.env.local` 文件中缺少 `SUPABASE_SERVICE_ROLE_KEY` 环境变量。

## 解决方案

### 步骤 1: 获取 SERVICE_ROLE_KEY

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目：`lqdgjjjyxrfhlfxktxde`
3. 进入 **Settings** > **API**
4. 在 **Project API keys** 部分找到：
   - `service_role` `secret` 键
   - **⚠️ 注意**：这是 `secret` 键，不是 `anon` `public` 键

### 步骤 2: 添加到 .env.local

在项目根目录的 `.env.local` 文件中添加：

```env
NEXT_PUBLIC_SUPABASE_URL=https://lqdgjjjyxrfhlfxktxde.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_secret_key_在这里
```

### 步骤 3: 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

## 验证配置

重启后，检查控制台是否还有以下错误：
- ❌ `SUPABASE_SERVICE_ROLE_KEY 未配置或使用占位符！`

如果不再出现此错误，说明配置成功。

## 为什么需要 SERVICE_ROLE_KEY？

`SUPABASE_SERVICE_ROLE_KEY` 用于：

1. **创建用户 profile**：注册时自动创建 profile 表记录
2. **绕过 RLS 策略**：执行需要管理员权限的操作
3. **自动确认邮箱**：注册时自动确认用户邮箱
4. **管理积分**：扣除和更新用户积分

**⚠️ 安全警告**：
- `SERVICE_ROLE_KEY` 拥有最高权限，可以绕过所有 RLS 策略
- **永远不要**将此密钥暴露在客户端代码中
- **永远不要**提交到版本控制系统（确保 `.env.local` 在 `.gitignore` 中）

## 当前配置状态

根据检查，您的 `.env.local` 文件目前包含：
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - 已配置
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - 已配置
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - **缺失**

## 如何区分两个密钥？

在 Supabase Dashboard 的 API 设置页面，您会看到：

1. **anon** `public` 键
   - 标签：`anon` `public`
   - 用于：`NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - 用途：客户端和服务器端的用户认证
   - 可以公开暴露

2. **service_role** `secret` 键
   - 标签：`service_role` `secret`
   - 用于：`SUPABASE_SERVICE_ROLE_KEY`
   - 用途：管理员操作，绕过 RLS
   - **必须保密**

## 如果仍然有问题

1. **检查密钥是否正确**：
   - 确保复制的是完整的密钥（通常很长）
   - 确保没有多余的空格或换行

2. **检查环境变量名称**：
   - 必须是 `SUPABASE_SERVICE_ROLE_KEY`（注意大小写）
   - 不能有 `NEXT_PUBLIC_` 前缀

3. **检查文件位置**：
   - `.env.local` 必须在项目根目录
   - 与 `package.json` 在同一目录

4. **重启服务器**：
   - 环境变量更改后必须重启开发服务器

