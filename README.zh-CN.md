# Elife Service API

## 项目说明

基于 NestJS 框架的后端服务,使用 Prisma ORM 和 PostgreSQL 数据库。

## 技术栈

- **框架**: NestJS 11
- **数据库**: PostgreSQL + Prisma
- **验证**: class-validator + class-transformer
- **API文档**: Swagger/OpenAPI
- **安全**: Helmet + CORS
- **代码规范**: ESLint + Prettier

## 项目结构

```
src/
├── common/              # 通用模块
│   ├── filters/        # 全局过滤器
│   ├── interceptors/   # 全局拦截器
│   └── dto/            # 通用DTO
├── config/             # 配置文件
├── prisma/             # Prisma模块
├── health/             # 健康检查
└── main.ts            # 应用入口
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置:

```bash
cp .env.example .env
```

### 3. 配置数据库

修改 `.env` 中的 `DATABASE_URL`:

```
DATABASE_URL="postgresql://username:password@localhost:5432/elife_db?schema=public"
```

### 4. 运行数据库迁移

```bash
npx prisma migrate dev
```

### 5. 启动开发服务器

```bash
npm run start:dev
```

应用将运行在:
- API地址: http://localhost:3000/api
- Swagger文档: http://localhost:3000/api/docs
- 健康检查: http://localhost:3000/api/health

## 可用脚本

- `npm run start` - 生产模式启动
- `npm run start:dev` - 开发模式启动(热重载)
- `npm run start:debug` - 调试模式启动
- `npm run build` - 构建生产版本
- `npm run lint` - 代码检查
- `npm run format` - 代码格式化
- `npm run test` - 运行测试

## API 文档

开发环境下访问 Swagger 文档:

```
http://localhost:3000/api/docs
```

## 已配置的功能

✅ 环境变量配置 (ConfigModule + Joi验证)
✅ 全局验证管道 (ValidationPipe)
✅ 全局异常过滤器 (HttpExceptionFilter)
✅ Prisma数据库集成 (全局模块)
✅ 安全配置 (Helmet + CORS)
✅ Swagger API文档
✅ API版本控制 (请求头方式)
✅ 请求速率限制 (防止API滥用)
✅ 健康检查接口 (多版本示例)

## 开发规范

1. **DTO验证**: 使用 class-validator 装饰器进行数据验证
2. **模块化**: 按功能划分模块,保持单一职责
3. **全局前缀**: 所有API路由带 `/api` 前缀
4. **错误处理**: 使用标准HTTP异常和全局过滤器
5. **代码风格**: 遵循 ESLint + Prettier 配置

## Prisma 常用命令

```bash
# 生成 Prisma Client
npx prisma generate

# 创建迁移
npx prisma migrate dev --name your_migration_name

# 部署迁移
npx prisma migrate deploy

# 打开 Prisma Studio
npx prisma studio

# 重置数据库
npx prisma migrate reset
```

## 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| NODE_ENV | 运行环境 | development / production |
| PORT | 服务端口 | 3000 |
| THROTTLE_TTL | 速率限制时间窗口(秒) | 60 |
| THROTTLE_LIMIT | 时间窗口内最大请求数 | 10 |
| DATABASE_URL | 数据库连接字符串 | postgresql://... |

## 高级功能

### API 版本控制
使用请求头 `X-API-Version` 指定版本:
```bash
curl -H "X-API-Version: 1" http://localhost:3000/api/health
curl -H "X-API-Version: 2" http://localhost:3000/api/health
```

详见: [API版本控制文档](./docs/API_VERSIONING.md)

### 请求速率限制
默认限制: 每60秒10个请求
- 跳过限制: 使用 `@SkipThrottle()` 装饰器
- 自定义限制: 使用 `@Throttle()` 装饰器

详见: [速率限制文档](./docs/RATE_LIMITING.md)

### 响应最佳实践
详见: [最佳实践文档](./docs/BEST_PRACTICES.md)
