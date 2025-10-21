# eLife 项目总览

## 📱 项目简介

**eLife** 是一个蒙古话费充值微信公众号网页应用，为微信用户提供便捷的蒙古国 Unitel 运营商话费和流量充值服务。

- **前端**: 微信公众号网页（H5）
- **后端**: elife-service（本项目）- 基于 NestJS 的 API 服务
- **目标用户**: 微信用户
- **主要功能**: Unitel 话费/流量充值、订单管理、微信支付集成

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

### 第三方集成
- **Unitel API** - 蒙古国运营商 API
- **微信支付** - 微信公众号支付
- **微信网页授权** - 用户身份认证

---

## 🔄 业务流程

### 完整用户流程（7步）

```
1. 微信授权登录
   ├─ 前端: 微信网页授权
   └─ 后端: 处理授权回调，返回 JWT Token

2. 获取资费列表
   ├─ 前端: 输入手机号
   ├─ 后端: 调用 Unitel API /service/servicetype
   └─ 响应: 返回话费/流量套餐列表

3. 汇率换算展示
   ├─ 前端: 从数据库获取当前汇率（440）
   ├─ 公式: 蒙古国货币(MNT) / 440 = 人民币(CNY)
   └─ 展示: 仅显示人民币价格

4. 创建订单
   ├─ 前端: 用户选择套餐，确认订单
   ├─ 后端: 创建订单记录（状态: unpaid）
   └─ 响应: 返回订单号

5. 发起支付
   ├─ 前端: 跳转微信支付页面
   ├─ 后端: 调用微信支付 API
   └─ 微信: JSAPI 支付

6. 支付回调
   ├─ 微信: 异步通知后端支付结果
   ├─ 后端: 更新订单状态（paid）
   └─ 后端: 调用 Unitel API 进行充值

7. 订单列表
   ├─ 前端: 展示订单历史
   └─ 后端: 查询用户订单（支持分页）

注意: 当前不支持未支付订单的重新支付功能
```

---

## 💱 汇率换算机制

### 当前汇率
- **固定汇率**: 440（蒙古国货币图格里克 MNT 兑人民币 CNY）
- **存储位置**: 数据库配置表（未来开发）
- **更新方式**: 管理员手动更新

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

## 🏗️ 架构设计

### 模块化架构

```
elife-service/
├── src/
│   ├── main.ts                  # 应用入口
│   ├── app.module.ts            # 根模块
│   │
│   ├── config/                  # 全局配置
│   │   └── env.validation.ts
│   │
│   ├── common/                  # 共享组件
│   │   ├── guards/              # 守卫
│   │   ├── interceptors/        # 拦截器
│   │   └── filters/             # 异常过滤器
│   │
│   ├── prisma/                  # Prisma 模块
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   │
│   ├── redis/                   # Redis 模块
│   │   ├── redis.service.ts
│   │   └── redis.module.ts
│   │
│   └── modules/                 # 业务模块
│       │
│       ├── auth/                # 认证模块（共享）
│       │   ├── user/            # 用户端认证
│       │   │   └── wechat/      # 微信网页授权
│       │   └── admin/           # 管理端认证
│       │
│       ├── user/                # 用户模块（共享）
│       ├── admin/               # 管理员模块（共享）
│       │
│       ├── payment/             # 支付模块（共享）
│       │   └── wechat-pay/      # 微信支付
│       │
│       └── operators/           # 运营商模块（隔离）
│           │
│           ├── unitel/          # Unitel 运营商
│           │   ├── config/      # Unitel 配置
│           │   ├── dto/         # 数据传输对象
│           │   ├── enums/       # 枚举定义
│           │   ├── services/    # 业务逻辑
│           │   │   ├── unitel.service.ts        # API 对接
│           │   │   └── unitel-order.service.ts  # 订单业务
│           │   ├── controllers/ # 控制器（未来开发）
│           │   └── unitel.module.ts
│           │
│           ├── mobicom/         # Mobicom 运营商（预留）
│           └── ondo/            # Ondo 运营商（预留）
│
├── prisma/
│   └── schema.prisma            # 数据库模型定义
│
└── docs/                        # 项目文档
    ├── PROJECT_OVERVIEW.md      # 本文档
    ├── DATA_MIGRATION.md        # 数据迁移指南
    ├── BEST_PRACTICES.md        # 最佳实践
    ├── API_VERSIONING.md        # API 版本管理
    └── RATE_LIMITING.md         # 限流配置
```

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

---

## 🗄️ 数据库设计

### 共享表

#### User - 用户表
```prisma
model User {
  id            String   @id @default(uuid())
  openid        String   @unique              // 微信 openid
  nickname      String?                       // 微信昵称
  avatar        String?                       // 微信头像
  phone         String?                       // 手机号

  // 黑名单功能
  isBlacklisted   Boolean  @default(false)    // 是否拉黑
  blacklistedAt   DateTime?                   // 拉黑时间
  blacklistReason String?                     // 拉黑原因

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  unitelOrders  UnitelOrder[]                // 订单关联

  @@map("users")
}
```

#### Admin - 管理员表
```prisma
model Admin {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String                           // BCrypt 加密
  email     String?
  role      String   @default("admin")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("admins")
}
```

### Unitel 运营商表

#### UnitelOrder - Unitel 订单表

详细字段说明参见 `docs/DATA_MIGRATION.md`

**核心字段组**:
1. **用户信息**: userId（关联 User）
2. **订单信息**: orderNo, msisdn, orderType
3. **金额信息**: amountMnt, amountCny, exchangeRate
4. **产品信息**: packageCode, productName, productEngName, productUnit, productData, productDays
5. **状态管理**: paymentStatus, rechargeStatus
6. **Unitel API**: svId, seq, method
7. **发票信息**: vatFlag, vatRegisterNo, vatInfo
8. **API 响应**: apiResult, apiCode, apiMsg, apiRaw
9. **时间戳**: createdAt, updatedAt, paidAt, completedAt

**索引优化**:
- `userId` - 查询用户订单
- `orderNo` - 订单号查询
- `msisdn` - 手机号查询
- `paymentStatus` - 支付状态筛选
- `rechargeStatus` - 充值状态筛选
- `orderType` - 订单类型筛选
- `createdAt` - 时间范围查询

---

## 🔌 Unitel API 集成

### 认证机制

**OAuth 2.0 Bearer Token**

```
1. 获取 Token: POST /auth
   Headers: Authorization: Basic base64(username:password)
   Response: { access_token, token_type: "Bearer" }

2. 业务 API 调用
   Headers: Authorization: Bearer {access_token}
```

**Token 管理**:
- Redis 缓存（TTL: 3600秒）
- 自动刷新机制
- 401 错误自动重试

### 主要 API 端点

| 端点 | 方法 | 功能 | DTO |
|------|------|------|-----|
| `/auth` | POST | 获取 Token | UnitelTokenDto |
| `/service/servicetype` | POST | 获取资费列表 | GetServiceTypeRequestDto |
| `/service/unitel` | POST | 获取后付费账单 | GetInvoiceRequestDto |
| `/service/recharge` | POST | 充值话费 | RechargeBalanceRequestDto |
| `/service/datapackage` | POST | 充值流量 | RechargeDataRequestDto |
| `/service/payment` | POST | 支付账单 | PayInvoiceRequestDto |

### 资费列表结构

```typescript
// 套餐项字段
interface CardItem {
  code: string;           // 套餐代码（如 "SD5000"）
  name: string;           // 套餐名称（蒙古语）
  eng_name: string;       // 英文名称
  price: number;          // 价格（MNT）
  unit?: number;          // 话费单位
  data?: string;          // 流量大小（如 "3GB"）
  days?: number;          // 有效期天数
  short_name: string;     // 简称
}

// 资费分类
interface Service {
  cards: {
    day: CardItem[];      // 可续租期话费
    noday: CardItem[];    // 纯话费
    special: CardItem[];  // 特殊套餐
  };
  data: {
    data: CardItem[];          // 流量包
    days: CardItem[];          // 按天流量包
    entertainment: CardItem[]; // 专用流量（游戏、音乐等）
  };
}
```

---

## 📊 数据迁移

### 老系统数据结构

**old_users 表**:
- `openid` (主键)
- `created_at`
- `updated_at`

**old_unitel_orders 表** (使用 order_number 作为主键):
- `order_number` → 新表 `orderNo`
- `openid` → 通过关联转为 `userId`
- `phone_number` → `msisdn`
- `product_recharge_type` → `orderType`
- `product_code` → `packageCode`
- `product_price_tg` → `amountMnt`
- `product_price_rmb` → `amountCny`
- `product_name` → `packageName`
- `product_unit` → `packageUnit`
- `product_data` → `packageData`
- `product_days` → `packageDays`
- `payment_status` → `paymentStatus`
- `recharge_status` → `rechargeStatus`

**新增字段** (老数据无此字段):
- `packageEngName` - 套餐英文名称
- `exchangeRate` - 汇率快照（迁移时使用 440）
- `isBlacklisted` - 黑名单标记（默认 false）

详细迁移脚本参见 `docs/DATA_MIGRATION.md`

---

## 🚀 API 路由设计

### 用户端 API

```
# 认证
POST   /api/auth/wechat/login         # 微信授权登录

# Unitel 服务
POST   /api/unitel/services           # 获取资费列表
POST   /api/unitel/orders              # 创建订单
GET    /api/unitel/orders              # 查询订单列表
GET    /api/unitel/orders/:id          # 查询订单详情

# 支付
POST   /api/payment/wechat/create      # 创建支付订单
POST   /api/payment/wechat/notify      # 微信支付回调
GET    /api/payment/wechat/query/:id   # 查询支付状态
```

### 管理端 API

```
# 认证
POST   /api/admin/login                # 管理员登录

# 订单管理
GET    /api/admin/unitel/orders        # 订单列表（支持筛选、分页）
GET    /api/admin/unitel/orders/:id    # 订单详情
PATCH  /api/admin/unitel/orders/:id    # 更新订单状态
POST   /api/admin/unitel/orders/:id/refund  # 退款

# 用户管理
GET    /api/admin/users                # 用户列表
GET    /api/admin/users/:id            # 用户详情
PATCH  /api/admin/users/:id/blacklist  # 拉黑用户
```

---

## 🔐 安全措施

### 限流保护
- **全局限流**: 60秒内最多10次请求
- **配置**: `THROTTLE_TTL=60`, `THROTTLE_LIMIT=10`
- **实现**: `@nestjs/throttler` + 自定义 Guard

### 安全中间件
- **Helmet**: HTTP 头部安全
- **CORS**: 跨域请求控制
- **Validation Pipe**: 自动数据验证

### 认证授权
- **用户端**: 微信网页授权 + JWT Token
- **管理端**: 账号密码 + JWT Token
- **API 保护**: JWT Guard + Role Guard

---

## 📈 性能优化

### Redis 缓存
- Unitel API Token（TTL: 1小时）
- 资费列表缓存（可选）
- 用户 Session

### 数据库优化
- 合理的索引设计
- Prisma 查询优化
- 连接池管理

### API 优化
- 请求重试机制（Unitel API）
- 超时控制（30秒）
- 错误处理与降级

---

## 🧪 测试策略

### 单元测试
- Service 层业务逻辑
- Utility 函数

### 集成测试
- API 端点测试
- 数据库操作测试

### E2E 测试
- 完整业务流程测试

---

## 🚀 部署指南

### 环境变量

参见 `.env.example`:

```env
# 应用
NODE_ENV=production
PORT=3000

# 数据库
DATABASE_URL=postgresql://user:pass@host:5432/elife_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Unitel API
UNITEL_USERNAME=xxx
UNITEL_PASSWORD=xxx
UNITEL_BASE_URL=https://api.unitel.mn/api/v1
```

### 部署步骤

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

## 📝 待开发功能

### 短期（Version 2.0）
- [ ] 微信网页授权登录
- [ ] 微信支付集成
- [ ] 订单管理 API
- [ ] 管理后台基础功能

### 中期（Version 2.1）
- [ ] 未支付订单重新支付
- [ ] 订单退款功能
- [ ] 用户黑名单管理
- [ ] 汇率管理（动态配置）

### 长期（Version 3.0）
- [ ] Mobicom 运营商集成
- [ ] Ondo 运营商集成
- [ ] 多运营商对比选择
- [ ] 积分系统
- [ ] 优惠券功能

---

## 👥 团队与维护

### 项目状态
- **当前版本**: 2.0（升级版开发中）
- **老版本**: 1.0（已上线运行，有老数据需迁移）

### 技术支持
- NestJS 官方文档: https://docs.nestjs.com
- Prisma 官方文档: https://www.prisma.io/docs

---

## 📄 许可证

Proprietary - All Rights Reserved

---

**最后更新**: 2025-10-21
**文档版本**: 1.0.0
