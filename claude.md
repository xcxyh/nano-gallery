# Nano Gallery - 工程师上手指南

## 项目概述

Nano Gallery 是一个基于 Next.js 14 和 Google Gemini AI 的 AI 图像生成画廊应用。用户可以创建、分享和发现由 Gemini 3 Pro 模型生成的图像模板。

### 🎯 项目特色

- **AI 图像生成**: 使用 Google Gemini 3 Pro 模型生成高质量图像
- **模板系统**: 用户可以创建和分享图像生成模板
- **用户认证**: 基于 Supabase 的安全认证系统
- **响应式设计**: 使用 Tailwind CSS 构建的现代化界面
- **积分系统**: 用户积分管理，支持不同分辨率的图像生成成本
- **管理员面板**: 内容审核和管理功能

## 技术栈

### 前端
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **状态管理**: React Hooks (useState, useEffect)

### 后端 & 数据库
- **后端**: Next.js Server Actions
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **存储**: Supabase Storage (图像存储)

### AI & 第三方服务
- **AI 服务**: Google Gemini API
- **头像生成**: DiceBear API

## 项目结构

```
nano-gallery/
├── app/                    # Next.js App Router
│   ├── actions.ts          # Server Actions (所有后端逻辑)
│   ├── globals.css         # 全局样式
│   ├── layout.tsx          # 根布局
│   └── page.tsx            # 首页
├── components/             # React 组件
│   ├── GeneratorModal.tsx # 图像生成模态框
│   ├── LoginModal.tsx      # 登录模态框
│   └── TemplateCard.tsx    # 模板卡片组件
├── types/                  # TypeScript 类型定义
│   └── index.ts
├── utils/                  # 工具函数
│   ├── supabase/
│   │   ├── admin.ts        # 管理员客户端
│   │   ├── client.ts       # 客户端
│   │   └── server.ts       # 服务端客户端
│   └── username.ts         # 用户名处理工具
├── constants.ts            # 常量定义
├── metadata.json           # 项目元数据
├── postcss.config.js       # PostCSS 配置
├── tailwind.config.ts     # Tailwind CSS 配置
├── next.config.mjs        # Next.js 配置
└── package.json           # 依赖包管理
```

## 环境配置

### 必需的环境变量

创建 `.env.local` 文件并配置以下变量：

```env
# Gemini API Key (必需)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 管理员访问码
ADMIN_ACCESS_CODE=your_admin_access_code
```

### 环境变量说明

- `GEMINI_API_KEY`: Google Gemini API 密钥，用于图像生成
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 项目的 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 匿名密钥，客户端使用
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 服务角色密钥，服务端使用
- `ADMIN_ACCESS_CODE`: 管理员注册码，用于创建管理员账户

## 开发指南

### 快速开始

1. **克隆并安装依赖**
   ```bash
   git clone <repository-url>
   cd nano-gallery
   npm install
   ```

2. **配置环境变量**
   - 复制 `.env.local` 模板并填写正确的配置

3. **运行开发服务器**
   ```bash
   npm run dev
   ```
   访问 [http://localhost:3000](http://localhost:3000) 查看应用

4. **构建生产版本**
   ```bash
   npm run build
   npm start
   ```

### 代码规范

#### 命名约定

- **文件名**: 使用 PascalCase 组件文件，kebab-case 其他文件
  - `TemplateCard.tsx` (组件)
  - `actions.ts` (服务端操作)
  - `username.ts` (工具函数)

- **变量名**: 使用 camelCase
  ```typescript
  const currentTab = 'gallery';
  const fetchTemplates = async () => {};
  ```

- **常量**: 使用 UPPER_SNAKE_CASE
  ```typescript
  const MODEL_NAME = "gemini-3-pro-image-preview";
  const ADMIN_ACCESS_CODE = "your_admin_code";
  ```

#### 组件规范

1. **函数组件**: 使用 React Hooks
2. **类型定义**: 始终定义 TypeScript 类型
3. **Props**: 使用接口定义组件 props
4. **状态管理**: 优先使用 React Hooks

#### Server Actions 规范

1. **位置**: 所有 Server Actions 放在 `app/actions.ts` 中
2. **权限**: 使用 Supabase RLS 策略控制数据访问
3. **错误处理**: 返回统一格式的响应
4. **缓存**: 使用 `revalidatePath` 更新缓存

### 数据库设计

#### 主要数据表

**profiles** 表 (用户资料)
- `id`: 用户 ID (主键)
- `name`: 显示名称
- `role`: 用户角色 ('user' | 'admin')
- `credits`: 用户积分

**templates** 表 (图像模板)
- `id`: 模板 ID
- `title`: 标题
- `prompt`: 提示词
- `aspect_ratio`: 宽高比
- `image_url`: 预览图 URL
- `reference_image`: 参考图像 (Base64)
- `owner_id`: 创建者 ID
- `status`: 审核状态 ('pending' | 'approved' | 'rejected')
- `created_at`: 创建时间

### API 集成

#### Gemini API

使用 `@google/genai` 包调用 Google Gemini API：

```typescript
const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model: MODEL_NAME,
  contents: { parts: [{ text: prompt }] },
  config: {
    imageConfig: {
      aspectRatio: aspectRatio,
      imageSize: imageSize
    }
  }
});
```

#### Supabase API

- **认证**: `supabase.auth.signUp()` / `supabase.auth.signInWithPassword()`
- **数据查询**: `supabase.from('table').select()`
- **存储**: `supabase.storage.from('bucket').upload()`

## 关键功能实现

### 1. 图像生成流程

1. 用户配置参数 (prompt、尺寸、数量)
2. 检查用户积分或管理员权限
3. 调用 Gemini API 生成图像
4. 上传到 Supabase Storage
5. 扣除用户积分
6. 返回生成结果

### 2. 模板管理系统

- **创建**: 用户填写模板信息，保存为 pending 状态
- **审核**: 管理员审核并批准或拒绝模板
- **展示**: 已批准的模板在画廊中展示
- **搜索**: 支持标题和提示词搜索

### 3. 用户权限系统

- **普通用户**:
  - 拥有默认积分 (3 积分)
  - 可以创建和查看自己的模板
  - 需要审核才能公开模板
- **管理员**:
  - 无限积分
  - 可以审核所有模板
  - 自动批准自己的模板

## 性能优化

### 1. 分页加载

使用分页 API 减少初始加载时间：

```typescript
export async function getTemplatesAction(page: number, limit: number, search: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  // 返回分页数据
}
```

### 2. 缓存策略

- 使用 React 状态缓存已加载的数据
- 搜索时重置缓存
- 标签切换时保留缓存数据

### 3. 图像优化

- 压缩图像大小
- 使用 Supabase 的 CDN
- 实现懒加载

## 部署指南

### Vercel 部署 (推荐)

1. **连接 Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **配置环境变量**
   - 在 Vercel Dashboard 中添加所有环境变量

3. **部署**
   ```bash
   vercel --prod
   ```

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 故障排除

### 常见问题

1. **GEMINI_API_KEY 未配置**
   - 检查 `.env.local` 文件是否包含 API Key
   - 确保 API Key 有效且有配额

2. **Supabase 连接失败**
   - 验证 Supabase URL 和密钥是否正确
   - 检查 RLS (Row Level Security) 策略

3. **图像上传失败**
   - 检查 Supabase Storage 权限
   - 确认 Bucket 配置正确

4. **积分扣除错误**
   - 验证数据库中 profiles 表的数据
   - 检查更新 credits 的 SQL 语句

### 调试技巧

1. **查看服务器日志**
   ```bash
   npm run dev  # 查看开发日志
   ```

2. **使用 Supabase Dashboard**
   - 查看数据库实时数据
   - 检查认证日志
   - 监控存储使用情况

3. **浏览器开发者工具**
   - 检查网络请求
   - 查看 Console 错误
   - 分析性能指标

## 开发建议

### 新功能开发

1. **需求分析**: 确定功能范围和用户场景
2. **技术方案**: 选择合适的技术实现
3. **代码实现**: 遵循现有代码规范
4. **测试**: 在开发环境充分测试
5. **文档**: 更新相关文档

### 代码审查要点

- 类型安全性 (TypeScript)
- 错误处理
- 性能影响
- 代码可读性
- 安全性考虑

### 测试策略

1. **单元测试**: 核心业务逻辑
2. **集成测试**: API 调用和数据库操作
3. **E2E 测试**: 完整用户流程

## 贡献指南

### 提交规范

```bash
# 功能开发
git commit -m "feat: add template search functionality"

# 问题修复
git commit -m "fix: resolve image upload timeout issue"

# 文档更新
git commit -m "docs: update API documentation"

# 样式修改
git commit -m "style: improve button styling"
```

### 分支策略

- `main`: 主分支，始终可部署
- `develop`: 开发分支
- `feature/*`: 新功能分支
- `bugfix/*`: 错误修复分支

## 联系方式

- 项目维护者: XCC
- GitHub Issues: 提交问题和建议
- 邮箱: 通过项目仓库获取

---

*最后更新: 2025-01-11*