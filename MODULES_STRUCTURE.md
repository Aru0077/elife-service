# Modules 目录结构

## 完整目录树

```
src/modules/
│
├── auth/                                    # 认证授权模块(共享)
│   ├── user/                               # 用户端认证
│   │   ├── wechat/                        # 微信网页授权
│   │   │   ├── wechat-auth.controller.ts
│   │   │   ├── wechat-auth.service.ts
│   │   │   ├── wechat.strategy.ts
│   │   │   ├── dto/
│   │   │   │   ├── wechat-login.dto.ts
│   │   │   │   └── wechat-callback.dto.ts
│   │   │   └── guards/
│   │   │       └── wechat-auth.guard.ts
│   │   └── guards/
│   │       └── user-jwt.guard.ts
│   │
│   ├── admin/                              # 管理员认证
│   │   ├── admin-auth.controller.ts
│   │   ├── admin-auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   ├── local.strategy.ts
│   │   └── dto/
│   │       ├── admin-login.dto.ts
│   │       └── admin-register.dto.ts
│   │
│   └── auth.module.ts
│
├── user/                                    # 用户模块(共享)
│   ├── user.controller.ts
│   ├── user.service.ts
│   ├── entities/
│   │   └── user.entity.ts
│   └── user.module.ts
│
├── admin/                                   # 管理员模块(共享)
│   ├── admin.controller.ts
│   ├── admin.service.ts
│   ├── entities/
│   │   └── admin.entity.ts
│   └── admin.module.ts
│
├── payment/                                 # 支付模块(共享)
│   ├── wechat-pay/                         # 微信支付
│   │   ├── wechat-pay.controller.ts
│   │   ├── wechat-pay.service.ts
│   │   ├── dto/
│   │   │   ├── create-payment.dto.ts
│   │   │   ├── payment-notify.dto.ts
│   │   │   └── query-payment.dto.ts
│   │   └── config/
│   │       └── wechat-pay.config.ts
│   │
│   └── payment.module.ts
│
└── operators/                               # 运营商模块(完全隔离)
    │
    ├── unitel/                             # Unitel运营商
    │   ├── controllers/
    │   │   ├── unitel-order.controller.ts      # 用户端: POST /api/unitel/orders
    │   │   ├── unitel-admin.controller.ts      # 管理端: GET /api/admin/unitel/orders
    │   │   └── unitel-webhook.controller.ts    # 回调: POST /api/unitel/webhook
    │   │
    │   ├── services/
    │   │   ├── unitel-order.service.ts         # 订单业务逻辑
    │   │   ├── unitel-api.service.ts           # Unitel API对接
    │   │   └── unitel-webhook.service.ts       # 回调处理
    │   │
    │   ├── entities/
    │   │   └── unitel-order.entity.ts          # Prisma: model UnitelOrder
    │   │
    │   ├── dto/
    │   │   ├── create-unitel-order.dto.ts      # 创建订单请求
    │   │   ├── unitel-order-response.dto.ts    # 订单响应
    │   │   ├── unitel-api-request.dto.ts       # Unitel API请求
    │   │   └── unitel-api-response.dto.ts      # Unitel API响应
    │   │
    │   ├── enums/
    │   │   ├── unitel-order-status.enum.ts     # 订单状态枚举
    │   │   └── unitel-product-type.enum.ts     # 产品类型枚举
    │   │
    │   ├── config/
    │   │   └── unitel.config.ts                # Unitel API配置
    │   │
    │   └── unitel.module.ts                    # Unitel模块定义
    │
    ├── mobicom/                            # Mobicom运营商
    │   ├── controllers/
    │   │   ├── mobicom-order.controller.ts     # 用户端: POST /api/mobicom/orders
    │   │   ├── mobicom-admin.controller.ts     # 管理端: GET /api/admin/mobicom/orders
    │   │   └── mobicom-webhook.controller.ts   # 回调: POST /api/mobicom/webhook
    │   │
    │   ├── services/
    │   │   ├── mobicom-order.service.ts
    │   │   ├── mobicom-api.service.ts
    │   │   └── mobicom-webhook.service.ts
    │   │
    │   ├── entities/
    │   │   └── mobicom-order.entity.ts         # Prisma: model MobicomOrder
    │   │
    │   ├── dto/
    │   ├── enums/
    │   ├── config/
    │   │   └── mobicom.config.ts
    │   │
    │   └── mobicom.module.ts
    │
    ├── ondo/                               # Ondo运营商
    │   ├── controllers/
    │   │   ├── ondo-order.controller.ts        # 用户端: POST /api/ondo/orders
    │   │   ├── ondo-admin.controller.ts        # 管理端: GET /api/admin/ondo/orders
    │   │   └── ondo-webhook.controller.ts      # 回调: POST /api/ondo/webhook
    │   │
    │   ├── services/
    │   │   ├── ondo-order.service.ts
    │   │   ├── ondo-api.service.ts
    │   │   └── ondo-webhook.service.ts
    │   │
    │   ├── entities/
    │   │   └── ondo-order.entity.ts            # Prisma: model OndoOrder
    │   │
    │   ├── dto/
    │   ├── enums/
    │   ├── config/
    │   │   └── ondo.config.ts
    │   │
    │   └── ondo.module.ts
    │
    └── operators.module.ts                 # 统一导出(可选)
```

## API 路由映射

### 用户端订单 API
| 运营商 | 路由 | Controller | 说明 |
|--------|------|------------|------|
| Unitel | `POST /api/unitel/orders` | `unitel-order.controller.ts` | 创建Unitel充值订单 |
| Unitel | `GET /api/unitel/orders/:id` | `unitel-order.controller.ts` | 查询Unitel订单详情 |
| Mobicom | `POST /api/mobicom/orders` | `mobicom-order.controller.ts` | 创建Mobicom充值订单 |
| Mobicom | `GET /api/mobicom/orders/:id` | `mobicom-order.controller.ts` | 查询Mobicom订单详情 |
| Ondo | `POST /api/ondo/orders` | `ondo-order.controller.ts` | 创建Ondo充值订单 |
| Ondo | `GET /api/ondo/orders/:id` | `ondo-order.controller.ts` | 查询Ondo订单详情 |

### 管理端订单 API
| 运营商 | 路由 | Controller | 说明 |
|--------|------|------------|------|
| Unitel | `GET /api/admin/unitel/orders` | `unitel-admin.controller.ts` | 查询所有Unitel订单 |
| Unitel | `GET /api/admin/unitel/orders/:id` | `unitel-admin.controller.ts` | 查询Unitel订单详情 |
| Mobicom | `GET /api/admin/mobicom/orders` | `mobicom-admin.controller.ts` | 查询所有Mobicom订单 |
| Ondo | `GET /api/admin/ondo/orders` | `ondo-admin.controller.ts` | 查询所有Ondo订单 |

### 运营商回调 API
| 运营商 | 路由 | Controller | 说明 |
|--------|------|------------|------|
| Unitel | `POST /api/unitel/webhook` | `unitel-webhook.controller.ts` | Unitel充值状态回调 |
| Mobicom | `POST /api/mobicom/webhook` | `mobicom-webhook.controller.ts` | Mobicom充值状态回调 |
| Ondo | `POST /api/ondo/webhook` | `ondo-webhook.controller.ts` | Ondo充值状态回调 |

### 认证 API
| 路由 | Controller | 说明 |
|------|------------|------|
| `POST /api/auth/wechat/login` | `wechat-auth.controller.ts` | 微信授权登录 |
| `GET /api/auth/wechat/callback` | `wechat-auth.controller.ts` | 微信授权回调 |
| `POST /api/auth/admin/login` | `admin-auth.controller.ts` | 管理员登录 |
| `POST /api/auth/admin/register` | `admin-auth.controller.ts` | 管理员注册 |

### 支付 API
| 路由 | Controller | 说明 |
|------|------------|------|
| `POST /api/payment/wechat/create` | `wechat-pay.controller.ts` | 创建微信支付订单 |
| `POST /api/payment/wechat/notify` | `wechat-pay.controller.ts` | 微信支付回调通知 |
| `GET /api/payment/wechat/query/:id` | `wechat-pay.controller.ts` | 查询支付状态 |

## Prisma Schema 示例

```prisma
// ==================== 共享表 ====================

// 用户表(微信用户)
model User {
  id            String   @id @default(uuid())
  openId        String   @unique
  unionId       String?  @unique
  nickname      String?
  avatar        String?
  phone         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // 关联各运营商订单
  unitelOrders  UnitelOrder[]
  mobicomOrders MobicomOrder[]
  ondoOrders    OndoOrder[]
}

// 管理员表
model Admin {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  email     String?
  role      String   @default("admin")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ==================== Unitel 订单表 ====================

model UnitelOrder {
  id          String   @id @default(uuid())
  orderNo     String   @unique              // 系统订单号
  
  // 用户信息
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  // 订单基本信息
  phoneNumber String                        // 充值手机号
  amount      Decimal  @db.Decimal(10, 2)   // 充值金额
  status      String                        // pending/processing/completed/failed
  
  // Unitel 特有字段
  unitelTransactionId String?  @unique      // Unitel交易ID
  unitelProductCode   String                // Unitel产品代码
  unitelApiResponse   Json?                 // Unitel API响应
  unitelCallbackData  Json?                 // Unitel回调数据
  
  // 支付信息
  paymentId   String?                       // 关联支付订单
  paymentTime DateTime?                     // 支付时间
  
  // 时间戳
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?                     // 完成时间
  
  @@index([userId])
  @@index([status])
  @@index([phoneNumber])
  @@index([createdAt])
}

// ==================== Mobicom 订单表 ====================

model MobicomOrder {
  id          String   @id @default(uuid())
  orderNo     String   @unique
  
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  phoneNumber String
  amount      Decimal  @db.Decimal(10, 2)
  status      String
  
  // Mobicom 特有字段
  mobicomOrderId      String?  @unique      // Mobicom订单ID
  mobicomPackageId    String                // Mobicom套餐ID
  mobicomResponseData Json?                 // Mobicom响应数据
  mobicomSessionId    String?               // Mobicom会话ID
  
  paymentId   String?
  paymentTime DateTime?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?
  
  @@index([userId])
  @@index([status])
  @@index([phoneNumber])
}

// ==================== Ondo 订单表 ====================

model OndoOrder {
  id          String   @id @default(uuid())
  orderNo     String   @unique
  
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  phoneNumber String
  amount      Decimal  @db.Decimal(10, 2)
  status      String
  
  // Ondo 特有字段
  ondoReferenceNumber String?  @unique      // Ondo参考号
  ondoSessionId       String?               // Ondo会话ID
  ondoMetadata        Json?                 // Ondo元数据
  ondoPlanCode        String                // Ondo套餐代码
  
  paymentId   String?
  paymentTime DateTime?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?
  
  @@index([userId])
  @@index([status])
  @@index([phoneNumber])
}
```

## 业务流程示例

### 用户充值流程

```
1. 用户选择运营商(Unitel/Mobicom/Ondo)
   ↓
2. 前端调用对应运营商的订单API
   POST /api/unitel/orders
   ↓
3. UnitelOrderController 接收请求
   ↓
4. UnitelOrderService 创建订单
   - 生成订单号
   - 保存到 UnitelOrder 表
   - 创建微信支付订单
   ↓
5. 返回支付信息给前端
   ↓
6. 用户完成支付
   ↓
7. 微信支付回调 → WechatPayController
   ↓
8. 更新订单支付状态
   ↓
9. UnitelApiService 调用 Unitel API 充值
   ↓
10. Unitel 回调 → UnitelWebhookController
    ↓
11. 更新订单状态为完成
```

## 扩展新运营商步骤

### 假设新增 "Skytel" 运营商

1. **创建目录结构**
```bash
mkdir -p src/modules/operators/skytel/{controllers,services,entities,dto,enums,config}
```

2. **创建文件**
- `skytel.module.ts`
- `controllers/skytel-order.controller.ts`
- `controllers/skytel-admin.controller.ts`
- `controllers/skytel-webhook.controller.ts`
- `services/skytel-order.service.ts`
- `services/skytel-api.service.ts`
- `services/skytel-webhook.service.ts`
- `entities/skytel-order.entity.ts`
- `dto/...`
- `enums/...`
- `config/skytel.config.ts`

3. **添加 Prisma Schema**
```prisma
model SkytelOrder {
  id          String   @id @default(uuid())
  orderNo     String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  phoneNumber String
  amount      Decimal  @db.Decimal(10, 2)
  status      String
  
  // Skytel 特有字段
  skytelTransId  String?  @unique
  skytelPlanId   String
  // ...其他Skytel特定字段
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

4. **注册模块**
在 `app.module.ts` 中添加:
```typescript
import { SkytelModule } from './modules/operators/skytel/skytel.module';

@Module({
  imports: [
    // ...
    SkytelModule,
  ],
})
```

5. **完成** ✅
- 无需修改任何现有运营商代码
- 完全独立的业务逻辑
- 独立的数据表

## 设计优势总结

| 特性 | 说明 |
|------|------|
| 🔒 **完全隔离** | 每个运营商独立模块、独立表、互不影响 |
| 🚀 **零耦合扩展** | 新增运营商无需修改现有代码 |
| 🛡️ **安全可靠** | 运营商故障不会相互影响 |
| 📊 **灵活定制** | 每个运营商可有完全不同的字段和逻辑 |
| 🎯 **易于维护** | 职责清晰，问题定位快速 |
| 🌐 **微服务友好** | 未来可轻松拆分为独立服务 |
| 📈 **独立扩缩容** | 可根据运营商流量独立调整资源 |
