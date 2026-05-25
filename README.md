# AI Council

让多个 AI 模型组成专家委员会，围绕你的问题进行结构化辩论，最终给出经过多方审视的可靠结论。

## 工作流程

1. **提出你的问题** - 任何需要深入思考的问题
2. **AI 委员会展开辩论** - 3 位不同视角的 AI 专家 + 1 位主持人，进行多轮结构化讨论
3. **获得共识结论** - 经过多方审视的可靠答案

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **数据库**: SQLite + Prisma 7
- **认证**: NextAuth v5
- **UI**: Tailwind CSS + shadcn/ui
- **AI 集成**: Vercel AI SDK (OpenAI + Anthropic)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 或编辑 `.env.local`：

```env
AUTH_SECRET=your-auth-secret
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

生成 AUTH_SECRET：`openssl rand -base64 32`

### 3. 初始化数据库

```bash
npx prisma migrate dev
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 生产部署

### Docker

```bash
docker compose up -d
```

### 手动部署

```bash
npm run build
npm start
```

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # 认证 API
│   │   └── councils/      # Council CRUD + SSE
│   ├── council/[id]/      # 实时辩论页面
│   ├── history/           # 历史记录
│   ├── login/             # 登录注册
│   └── page.tsx           # 首页
├── components/
│   └── ui/                # shadcn/ui 组件
├── lib/
│   ├── council-engine.ts  # 辩论引擎核心
│   ├── auth-utils.ts      # 认证工具
│   ├── db.ts              # 数据库客户端
│   └── utils.ts           # 通用工具
└── generated/prisma/      # Prisma 客户端
```

## 默认 AI 委员会成员

| 角色 | 模型 | 视角 |
|------|------|------|
| AI 主持人 | GPT-4o | 引导讨论、推动共识 |
| 务实派专家 | GPT-4o | 工程可行性、最小方案 |
| 创新派专家 | Claude Sonnet 4 | 前沿技术、突破思维 |
| 安全派专家 | Claude Sonnet 4 | 安全可靠、长期维护 |

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/[...nextauth]` | * | NextAuth 认证 |
| `/api/councils` | GET/POST | 列表/创建 Council |
| `/api/councils/[id]` | GET/DELETE | 查看/删除 Council |
| `/api/councils/[id]/stream` | GET | SSE 实时流 |

## V2 计划

- [ ] 自定义 AI 参与者（选择模型、自定义视角）
- [ ] 讨论回放（逐轮回放过去的辩论）
- [ ] 分享功能（生成讨论链接）
- [ ] 讨论导出（PDF/Markdown）
- [ ] 更多的 AI 模型支持
- [ ] 参数调节（温度、轮数等）
- [ ] 多语言问题支持
- [ ] 语音输入
