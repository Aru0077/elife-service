# eLife 项目总览

## 📱 项目简介

**eLife** 是一个蒙古话费充值微信公众号网页应用，为微信用户提供便捷的蒙古国 Unitel 运营商话费和流量充值服务。

- **前端**: 微信公众号网页（H5）
- **后端**: elife-service（本项目）- 基于 NestJS 的 API 服务
- **目标用户**: 微信用户
- **主要功能**: Unitel 话费/流量充值、订单管理

---

## 🛠️ 技术栈

### 后端框架
- **NestJS** 11.x - 渐进式 Node.js 框架
- **TypeScript** 5.7 - 类型安全的 JavaScript
- **Prisma** 6.17 - 现代化 ORM
- **PostgreSQL** - 关系型数据库
- **Redis** - 缓存与 Token 管理

### 核心依赖
- `@nestjs/axios` - HTTP 客户端（Unitel API 调用）
- `@nestjs/config` - 配置管理
- `@nestjs/swagger` - API 文档
- `@nestjs/throttler` - 限流保护
- `ioredis` - Redis 客户端
- `class-validator` + `class-transformer` - 数据验证
- `helmet` - 安全中间件

### 第三方集成（计划中）
- **Unitel API** - 蒙古国运营商 API
- **微信支付** - 微信公众号支付
- **微信网页授权** - 用户身份认证

---

## 🏗️ 项目结构

### 当前实现的模块

```
elife-service/
├── src/
│   ├── main.ts                  # 应用入口
│   ├── app.module.ts            # 根模块
│   │
│   ├── config/                  # 全局配置
│   │   └── env.validation.ts    # 环境变量验证
│   │
│   ├── common/                  # 共享组件
│   │   ├── guards/              # 守卫（限流代理）
│   │   ├── filters/             # 异常过滤器
│   │   └── dto/                 # 共享 DTO
│   │
│   ├── prisma/                  # Prisma 模块
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   │
│   ├── redis/                   # Redis 模块
│   │   ├── redis.service.ts
│   │   ├── redis.config.ts
│   │   └── redis.module.ts
│   │
│   ├── health/                  # 健康检查模块
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   │
│   └── modules/                 # 业务模块
│       │
│       ├── exchange-rate/       # 汇率管理模块
│       │   ├── services/
│       │   ├── dto/
│       │   ├── exchange-rate.controller.ts
│       │   └── exchange-rate.module.ts
│       │
│       └── operators/           # 运营商模块（预留）
│           ├── unitel/          # Unitel 运营商（开发中）
│           │   ├── config/      # Unitel 配置
│           │   └── controllers/ # 控制器（待开发）
│           │
│           └── ondo/            # Ondo 运营商（预留）
│
├── prisma/
│   └── schema.prisma            # 数据库模型定义
│
└── docs/                        # 项目文档
    ├── PROJECT_OVERVIEW.md      # 本文档
    ├── BEST_PRACTICES.md        # 最佳实践
    ├── API_VERSIONING.md        # API 版本管理
    └── RATE_LIMITING.md         # 限流配置
```

### 计划中的模块

以下模块尚未实现，属于下一阶段开发内容：

```
src/modules/
├── auth/                        # 认证授权模块
│   ├── user/                    # 用户端认证
│   │   └── wechat/              # 微信网页授权
│   └── admin/                   # 管理端认证
│
├── user/                        # 用户模块
├── admin/                       # 管理员模块
│
└── payment/                     # 支付模块
    └── wechat-pay/              # 微信支付
```

---

## 🗄️ 数据库设计

### 当前数据库表（基于 Prisma Schema）

#### User - 用户表（微信用户）
```prisma
model User {
  openid String @id                    // 微信 openid（主键）

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 关联关系
  unitelOrders UnitelOrder[]

  @@map("users")
}
```

**说明**:
- 当前设计极简，仅用于订单关联
- 使用 `openid` 作为主键
- 未来可扩展：昵称、头像、黑名单等功能

#### Admin - 管理员表
```prisma
model Admin {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String                        // BCrypt 加密
  email     String?
  role      String   @default("admin")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("admins")
}
```

#### ExchangeRate - 汇率表
```prisma
model ExchangeRate {
  id        String   @id @default("MNT_CNY")  // 固定ID
  rate      Decimal  @db.Decimal(10, 4)       // 汇率值 (440)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("exchange_rates")
}
```

**功能状态**: ✅ 已实现并提供 API 接口

#### UnitelOrder - Unitel 订单表
```prisma
model UnitelOrder {
  // 订单基本信息
  orderNo String @id                     // 订单号（主键）

  // 用户信息
  openid String
  user   User   @relation(fields: [openid], references: [openid])
  msisdn String                          // 手机号码
  orderType String                       // 订单类型: balance | data | invoice_payment

  // 金额信息（双币种）
  amountMnt    Decimal  @db.Decimal(10, 2)    // 蒙古国货币金额(MNT)
  amountCny    Decimal  @db.Decimal(10, 2)    // 人民币金额(CNY)
  exchangeRate Decimal? @db.Decimal(10, 4)    // 汇率快照

  // 产品信息
  packageCode    String                       // 套餐代码
  packageName    String                       // 套餐名称（蒙古语）
  packageEngName String                       // 套餐英文名称
  packageUnit    Int?                         // 话费单位
  packageData    String?                      // 流量大小（如"3GB"）
  packageDays    Int?                         // 有效期天数

  // 状态管理
  paymentStatus  String                       // 支付状态: unpaid | paid | refunded
  rechargeStatus String                       // 充值状态: pending | processing | success | failed

  // Unitel API 特有字段
  svId   String?                              // Unitel服务ID
  seq    String?                              // Unitel序列号
  method String?                              // 支付方式

  // VAT 发票信息 (JSON存储)
  vatFlag       String?                       // VAT标志 1=开发票, 0=不开
  vatRegisterNo String?                       // VAT注册号
  vatInfo       Json?                         // 完整的VAT发票信息

  // API 响应信息
  apiResult String?                           // API返回的result字段
  apiCode   String?                           // API返回的code字段
  apiMsg    String?                           // API返回的msg字段
  apiRaw    Json?                             // 完整的API响应(用于调试)

  // 错误信息
  errorMessage String?                        // 错误消息
  errorCode    String?                        // 错误代码

  // 时间戳
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  paidAt      DateTime?                       // 支付时间
  completedAt DateTime?                       // 完成时间

  @@index([openid])
  @@index([msisdn])
  @@index([paymentStatus])
  @@index([rechargeStatus])
  @@index([orderType])
  @@index([createdAt])
  @@map("unitel_orders")
}
```

**索引设计**:
- `openid` - 查询用户订单
- `msisdn` - 手机号查询
- `paymentStatus` - 支付状态筛选
- `rechargeStatus` - 充值状态筛选
- `orderType` - 订单类型筛选
- `createdAt` - 时间范围查询

---

## 💱 汇率换算机制

### 当前汇率
- **固定汇率**: 440（蒙古国货币图格里克 MNT 兑人民币 CNY）
- **存储位置**: PostgreSQL 数据库 `exchange_rates` 表
- **更新方式**: 管理员手动更新（API 待开发）
- **查询接口**: `GET /api/exchange-rate` ✅ 已实现

### 换算公式
```javascript
// 蒙古国货币转人民币
amountCNY = amountMNT / 440

// 示例
// Unitel API 返回套餐价格: 5000 MNT
// 显示给用户: 5000 / 440 ≈ 11.36 CNY
```

### 数据存储
订单表同时保存两种货币金额：
- `amountMnt` - 蒙古国货币原始金额（用于调用 Unitel API）
- `amountCny` - 人民币金额（用于微信支付）
- `exchangeRate` - 汇率快照（记录下单时的汇率）

---

## 🔌 Unitel API 集成（计划中）

### 认证机制

**OAuth 2.0 Bearer Token**

```
1. 获取 Token: POST /auth
   Headers: Authorization: Basic base64(username:password)
   Response: { access_token, token_type: "Bearer" }

2. 业务 API 调用
   Headers: Authorization: Bearer {access_token}
```

**Token 管理计划**:
- Redis 缓存（TTL: 3600秒）
- 自动刷新机制
- 401 错误自动重试

### 主要 API 端点（待实现）

| 端点 | 方法 | 功能 |
|------|------|------|
| `/auth` | POST | 获取 Token |
| `/service/servicetype` | POST | 获取资费列表 |
| `/service/unitel` | POST | 获取后付费账单 |
| `/service/recharge` | POST | 充值话费 |
| `/service/datapackage` | POST | 充值流量 |
| `/service/payment` | POST | 支付账单 |

---

## 🚀 已实现的 API 路由

### 健康检查
```
GET    /api/health                # 健康检查
```

### 汇率查询
```
GET    /api/exchange-rate         # 获取当前汇率信息
```

### Swagger 文档（开发环境）
```
GET    /api/docs                  # Swagger API 文档
```

---

## 🔐 安全措施

### 限流保护
- **全局限流**: 60秒内最多10次请求
- **配置**: `THROTTLE_TTL=60`, `THROTTLE_LIMIT=10`
- **实现**: `@nestjs/throttler` + ThrottlerBehindProxyGuard
- **代理支持**: 支持负载均衡器后的真实IP识别

### 安全中间件
- **Helmet**: HTTP 头部安全
- **CORS**: 跨域请求控制
- **Validation Pipe**: 自动数据验证和类型转换

### API 版本控制
- **方式**: Header-based（`X-API-Version`）
- **默认版本**: `1`
- **实现**: NestJS Versioning

---

## 📈 性能优化

### Redis 缓存
- Unitel API Token（计划中）
- 资费列表缓存（计划中）
- 用户 Session（计划中）

### 数据库优化
- 合理的索引设计（已实现）
- Prisma Client 连接池
- 查询优化

---

## 🌍 环境配置

### 环境变量

参见 `.env.example`:

```env
# 应用
NODE_ENV=development
PORT=3000

# 限流
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# 数据库
DATABASE_URL=postgresql://user:pass@host:5432/elife_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Unitel API（待使用）
UNITEL_USERNAME=your_username
UNITEL_PASSWORD=your_password
UNITEL_BASE_URL=https://api.unitel.mn/api/v1
```

---

## 🚀 部署指南

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 启动数据库（Docker）
docker-compose up -d

# 4. 生成 Prisma Client
npx prisma generate

# 5. 数据库迁移
npx prisma migrate dev

# 6. 启动开发服务器
npm run start:dev
```

### 生产部署

```bash
# 1. 安装依赖
npm install

# 2. 生成 Prisma Client
npx prisma generate

# 3. 数据库迁移
npx prisma migrate deploy

# 4. 构建
npm run build

# 5. 启动
npm run start:prod
```

---

## 📝 开发状态

### ✅ 已完成功能

**基础设施**:
- [x] NestJS 项目框架搭建
- [x] Prisma ORM 集成
- [x] PostgreSQL 数据库配置
- [x] Redis 缓存集成
- [x] 环境变量验证
- [x] 全局异常过滤器
- [x] 请求限流（防滥用）
- [x] API 版本控制
- [x] Swagger 文档
- [x] 安全中间件（Helmet, CORS）

**业务功能**:
- [x] 健康检查端点
- [x] 汇率管理模块
  - [x] 汇率查询 API
  - [x] 数据库存储

**数据库设计**:
- [x] User 表（基础版本）
- [x] Admin 表
- [x] ExchangeRate 表
- [x] UnitelOrder 表（Schema定义完成）

### 🚧 开发中功能

**Unitel 运营商集成**:
- [ ] Unitel API 认证服务
- [ ] 资费列表查询
- [ ] 订单创建与管理
- [ ] 充值业务逻辑

### 📋 待开发功能

**Phase 1 - 核心业务（优先级高）**:
- [ ] 微信网页授权登录
- [ ] Unitel 完整业务流程
  - [ ] 资费列表查询
  - [ ] 订单创建
  - [ ] 充值接口对接
- [ ] 微信支付集成
- [ ] 订单查询与管理

**Phase 2 - 管理功能**:
- [ ] 管理员认证与授权
- [ ] 订单管理后台
- [ ] 汇率管理界面
- [ ] 用户管理

**Phase 3 - 增强功能**:
- [ ] 订单退款功能
- [ ] 用户黑名单管理
- [ ] 汇率动态配置
- [ ] 数据统计与报表

**Phase 4 - 扩展（长期规划）**:
- [ ] Mobicom 运营商集成
- [ ] Ondo 运营商集成
- [ ] 多运营商对比选择
- [ ] 积分系统
- [ ] 优惠券功能

---

## 🏛️ 架构设计原则

### 运营商隔离设计

**核心原则**: 每个运营商完全独立，零耦合

- ✅ 独立的数据表（UnitelOrder, MobicomOrder, OndoOrder）
- ✅ 独立的 Service 层（unitel.service.ts, mobicom.service.ts）
- ✅ 独立的 Module（unitel.module.ts, mobicom.module.ts）
- ✅ 独立的配置（unitel.config.ts, mobicom.config.ts）

**优势**:
- 故障隔离：某个运营商故障不影响其他运营商
- 易于扩展：添加新运营商无需修改现有代码
- 独立部署：未来可拆分为微服务

**扩展方法**:
1. 在 `src/modules/operators/` 下创建新运营商目录
2. 定义该运营商的 Prisma Schema
3. 实现独立的业务逻辑
4. 在 `app.module.ts` 中注册
5. 无需修改其他运营商代码

---

## 👥 项目信息

### 项目状态
- **当前阶段**: 基础设施搭建完成，核心业务开发中
- **开发版本**: 0.0.1
- **技术债务**:
  - User 表需要扩展（昵称、头像、黑名单等字段）
  - 数据库主键策略需要统一（UUID vs 业务主键）

### 技术支持
- NestJS 官方文档: https://docs.nestjs.com
- Prisma 官方文档: https://www.prisma.io/docs

### 相关文档
- [最佳实践](./BEST_PRACTICES.md) - NestJS 开发最佳实践
- [API 版本管理](./API_VERSIONING.md) - API 版本控制指南
- [限流配置](./RATE_LIMITING.md) - 请求速率限制说明

---

## 📄 许可证

Proprietary - All Rights Reserved

---

**最后更新**: 2025-10-22
**文档版本**: 2.0.0
**项目版本**: 0.0.1
