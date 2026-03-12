# Nano Gallery

AI 图像生成画廊应用，基于 Next.js 14 和 Google Gemini API。

## Language Policy
默认使用 **简体中文** 回复。
规则：
- 解释使用中文
- 代码保持原始语言
- 代码注释优先中文
- API / 类名保持英文

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Google Gemini 3 Pro (`gemini-3-pro-image-preview`)

## 项目结构

```
app/
├── actions.ts          # 所有 Server Actions（后端逻辑）
├── page.tsx            # 首页
├── layout.tsx          # 根布局
└── globals.css         # 全局样式

components/
├── GeneratorModal.tsx  # 图像生成弹窗
├── LoginModal.tsx      # 登录/注册弹窗
└── TemplateCard.tsx    # 模板卡片

types/
└── index.ts            # 类型定义

utils/supabase/
├── admin.ts            # 服务端客户端（绕过 RLS）
├── client.ts           # 浏览器客户端
└── server.ts           # 服务端客户端

supabase/migrations/    # 数据库迁移文件
```

## 环境变量

```env
GEMINI_API_KEY=              # Google Gemini API 密钥
NEXT_PUBLIC_SUPABASE_URL=    # Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase 匿名密钥
SUPABASE_SERVICE_ROLE_KEY=   # Supabase 服务角色密钥
ADMIN_ACCESS_CODE=           # 管理员注册码
```

## 核心数据模型

### profiles 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 用户 ID |
| name | text | 显示名称 |
| role | text | 'user' \| 'admin' |
| credits | integer | 积分余额 |

### templates 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 模板 ID |
| title | text | 标题 |
| prompt | text | 提示词 |
| aspect_ratio | text | 宽高比 |
| image_url | text | 预览图 URL |
| reference_image | text | 参考图 (Base64) |
| reference_images | jsonb | 多张参考图 |
| owner_id | uuid | 创建者 ID |
| status | text | 'pending' \| 'approved' \| 'rejected' |

## 开发规范

### Server Actions
所有后端逻辑集中在 `app/actions.ts`，使用 `'use server'` 指令。

```typescript
// 返回格式统一
return { success: true, data: ... };
return { success: false, error: "错误信息" };
```

### Supabase 客户端选择
- **浏览器组件**: `utils/supabase/client.ts` - 受 RLS 限制
- **Server Actions**: `utils/supabase/server.ts` - 受 RLS 限制
- **需要绕过 RLS**: `utils/supabase/admin.ts` - 使用 service_role

### 积分系统
- 普通用户默认 3 积分
- 图像成本: 1K=1积分, 2K=2积分, 4K=4积分
- 管理员无限积分
- 积分扣除使用原子操作（RPC `deduct_credits`）

### 命名约定
- 组件文件: PascalCase（`TemplateCard.tsx`）
- 工具文件: camelCase（`username.ts`）
- 常量: UPPER_SNAKE_CASE（`MODEL_NAME`）

## 常用命令

```bash
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run start    # 生产运行
```

## 数据库迁移

迁移文件位于 `supabase/migrations/`。在 Supabase Dashboard 的 SQL Editor 中执行。

关键迁移:
- `20250312_add_deduct_credits_rpc.sql` - 原子积分扣除函数

## 用户角色

| 角色 | 积分 | 模板审核 | 权限 |
|------|------|---------|------|
| user | 默认 3 | 需审核 | 生成图像、创建模板 |
| admin | 无限 | 自动批准 | 审核模板、管理内容 |