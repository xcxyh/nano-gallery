# 注册时创建用户资料失败 - 修复指南

## 问题描述

注册时出现错误："注册成功，但创建用户资料失败。请稍后重试登录或联系管理员"

## 问题原因

`profiles` 表的 RLS (Row Level Security) 策略中**缺少 INSERT 策略**，导致即使使用 admin client 也无法插入数据。

## 解决方案

### 方案 1: 添加 INSERT 策略（推荐）

在 Supabase Dashboard 的 SQL Editor 中运行以下 SQL：

```sql
-- 添加 insert 策略：允许插入 profile
CREATE POLICY IF NOT EXISTS "Allow profile creation" ON profiles
  FOR INSERT
  WITH CHECK (true);
```

或者直接运行 `supabase/fix_profiles_rls.sql` 文件。

### 方案 2: 更新 create_table.sql 并重新运行

我已经更新了 `supabase/create_table.sql` 文件，添加了 INSERT 策略。如果您需要重新创建表，可以：

1. 删除现有的 RLS 策略（如果需要）：
```sql
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
```

2. 运行更新后的 `create_table.sql` 中的策略部分：
```sql
create policy "Allow profile creation" on profiles for insert with check (true);
```

## 验证修复

运行以下 SQL 检查策略是否正确添加：

```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

应该看到以下策略：
- "Public profiles" (SELECT)
- "Users can update own profile" (UPDATE)
- "Allow profile creation" (INSERT) ← 新添加的

## 其他可能的原因

如果添加策略后仍然失败，请检查：

### 1. 环境变量配置

确保 `.env.local` 中配置了正确的 `SUPABASE_SERVICE_ROLE_KEY`：

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. Admin Client 配置

检查 `utils/supabase/admin.ts` 是否正确使用 SERVICE_ROLE_KEY。

### 3. 数据库表结构

确保 `profiles` 表已创建，运行：

```sql
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';
```

### 4. 检查控制台错误

查看服务器控制台的详细错误信息，应该会显示：
- RLS 策略错误
- 权限错误
- 或其他数据库错误

## 临时解决方案

如果无法立即修复 RLS 策略，用户可以：

1. **注册后直接登录**：登录时会自动创建 profile（已在代码中实现）
2. **手动创建 profile**：在 Supabase Dashboard 中手动创建

## 已改进的错误处理

代码中已添加更详细的错误信息：
- 检测 RLS 策略问题
- 提供更明确的错误提示
- 建议用户稍后重试登录（登录时会自动创建 profile）

## 测试步骤

1. 运行 `supabase/fix_profiles_rls.sql` 添加 INSERT 策略
2. 尝试注册新用户
3. 检查 Supabase Dashboard > Table Editor > profiles 中是否有新记录
4. 如果仍然失败，查看控制台错误信息

