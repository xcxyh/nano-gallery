# Profile 和积分问题修复说明

## 问题诊断

### 问题 1: 用户登录后积分清零
**原因**：登录时如果 profile 不存在，代码会返回 `credits: 0`，导致积分显示为 0。

### 问题 2: 数据没有写到 profile 表
**原因**：
- 注册时 profile 创建可能失败，但没有正确处理错误
- 登录时如果 profile 不存在，没有自动创建

## 已修复的问题

### 1. 登录时自动创建 Profile

**修复前**：
```typescript
const credits = profile?.credits ?? 0; // 如果 profile 不存在，返回 0
```

**修复后**：
- 如果 profile 不存在，自动创建一个默认的 profile
- 默认积分设置为 3（而不是 0）
- 使用 admin client 确保可以绕过 RLS 策略

### 2. 注册时确保 Profile 创建成功

**修复前**：
```typescript
const { error: profileError } = await supabaseAdmin.from('profiles').insert({...});
if (profileError) {
    // 只尝试 upsert，但没有检查是否成功
    await supabaseAdmin.from('profiles').upsert({...});
}
```

**修复后**：
- 使用 `.select().single()` 获取创建后的 profile 数据
- 如果 insert 失败，尝试 upsert
- 如果 upsert 也失败，返回明确的错误信息
- 确保 profile 创建成功后才返回成功

### 3. getSessionAction 也自动创建 Profile

**修复**：
- 如果 profile 不存在，自动创建
- 确保返回的积分有正确的默认值（3）

### 4. 积分扣除逻辑改进

**修复**：
- 添加了错误处理和日志记录
- 确保积分更新操作被正确执行

## 数据库表结构

根据 `supabase/create_table.sql`，profiles 表结构为：

```sql
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  role text default 'user',
  credits int default 3,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

**注意**：
- `credits` 字段默认值为 3
- 表有 RLS（Row Level Security）策略
- 需要使用 admin client 来绕过 RLS 进行写入操作

## RLS 策略

根据 SQL 文件，profiles 表的 RLS 策略为：

```sql
alter table profiles enable row level security;
create policy "Public profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
```

**说明**：
- 所有用户都可以读取 profiles（公开读取）
- 用户只能更新自己的 profile
- **没有 insert 策略**，所以需要使用 admin client 来创建 profile

## 修复后的流程

### 注册流程
1. 验证邮箱和密码
2. 创建 Supabase 用户（auth.users）
3. 自动确认邮箱（如果启用）
4. **创建 profile**（使用 admin client）
   - 如果 insert 失败，尝试 upsert
   - 确保创建成功后才返回
5. 返回用户信息（包含正确的积分）

### 登录流程
1. 验证邮箱和密码
2. 获取用户信息
3. **检查 profile 是否存在**
   - 如果不存在，自动创建默认 profile（积分 = 3）
   - 如果存在，使用现有数据
4. 返回用户信息（包含正确的积分）

### 获取会话流程
1. 获取当前用户
2. **检查 profile 是否存在**
   - 如果不存在，自动创建默认 profile
3. 返回用户信息

## 测试步骤

1. **测试注册**：
   - 使用新邮箱注册
   - 检查 Supabase Dashboard > Authentication > Users 中用户是否创建
   - 检查 Supabase Dashboard > Table Editor > profiles 中是否有对应的 profile
   - 检查积分是否为 3（或管理员为 9999）

2. **测试登录**：
   - 使用注册的邮箱和密码登录
   - 检查积分是否正确显示
   - 检查控制台是否有错误信息

3. **测试积分扣除**：
   - 生成图片
   - 检查积分是否正确扣除
   - 检查数据库中的积分是否更新

4. **测试已存在用户**：
   - 如果之前有用户但没有 profile，登录后应该自动创建
   - 检查积分是否为默认值 3

## 如果仍然有问题

### 检查清单

1. ✅ 确认 Supabase 表已创建
   - 运行 `supabase/create_table.sql` 中的 SQL
   - 检查 profiles 表是否存在

2. ✅ 确认 RLS 策略已设置
   - 检查 profiles 表的 RLS 是否启用
   - 检查策略是否正确

3. ✅ 确认环境变量配置
   - `SUPABASE_SERVICE_ROLE_KEY` 必须配置正确
   - 这是创建 profile 所必需的

4. ✅ 检查控制台日志
   - 查看是否有 profile 创建错误
   - 查看是否有 RLS 策略错误

5. ✅ 检查 Supabase Dashboard
   - 进入 Table Editor > profiles
   - 查看是否有数据
   - 检查数据是否正确

## 注意事项

1. **Admin Client 的重要性**：
   - 创建 profile 必须使用 `supabaseAdmin`（admin client）
   - 普通 client 无法绕过 RLS 策略进行 insert

2. **默认积分**：
   - 新用户默认积分为 3
   - 管理员（使用 access code）默认积分为 9999
   - 如果 profile 不存在，自动创建时使用默认值 3

3. **错误处理**：
   - 所有数据库操作都有错误处理
   - 失败时会记录详细的错误信息到控制台

