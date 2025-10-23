# 蒙古国话费充值系统架构设计文档

## 项目概述

### 系统组成
- **后端服务**: elife-service (NestJS)
- **前端网页**: elife-site

### 业务流程
1. 用户在微信内打开 elife-site，进行微信授权静默登录
2. 输入蒙古国手机号码，获取资费列表（自动换算为人民币价格）
3. 选择资费套餐后跳转到确认订单页
4. 提交订单后进入支付页
5. 微信支付成功后，异步调用运营商 API 进行充值
6. 查看订单状态或返回首页

---

## 多运营商架构设计

### 运营商列表
- **Unitel** (已实施)
- **Mobicom** (规划中)
- **Ondo** (规划中)

### 设计原则
每个运营商拥有独立的订单模块，添加新运营商时不影响已运营的运营商。

---

## 目录结构设计

```
src/modules/
├── payment/                    # 共享支付模块（微信支付）
│   ├── payment.module.ts
│   ├── payment.controller.ts
│   ├── payment.service.ts
│   ├── dto/
│   │   ├── create-payment.dto.ts
│   │   └── payment-notify.dto.ts
│   ├── interfaces/
│   │   └── wechat-payment.interface.ts
│   └── guards/
│       └── wechat-signature.guard.ts
│
├── queue/                      # 共享消息队列模块
│   ├── queue.module.ts
│   ├── producers/
│   │   └── recharge.producer.ts    # 充值任务生产者
│   └── config/
│       └── queue.config.ts
│
└── operators/                  # 运营商模块（按运营商划分）
    │
    ├── unitel/                 # Unitel 运营商
    │   ├── unitel.module.ts
    │   ├── config/
    │   │   └── unitel.config.ts
    │   ├── controllers/
    │   │   ├── unitel-order.controller.ts      # 订单 API
    │   │   └── unitel-service.controller.ts    # 运营商专属 API（资费、账单）
    │   ├── services/
    │   │   ├── unitel-api.service.ts          # 第三方 API 封装
    │   │   ├── unitel-order.service.ts        # 订单业务逻辑
    │   │   └── unitel-recharge.consumer.ts    # 充值队列消费者
    │   ├── dto/
    │   │   ├── create-order.dto.ts
    │   │   ├── query-order.dto.ts
    │   │   └── get-service-type.dto.ts
    │   ├── enums/
    │   │   ├── payment-status.enum.ts
    │   │   ├── recharge-status.enum.ts
    │   │   └── order-type.enum.ts
    │   └── interfaces/
    │       └── order.interface.ts
    │
    ├── mobicom/                # Mobicom 运营商（未来）
    │   ├── mobicom.module.ts
    │   ├── controllers/
    │   │   ├── mobicom-order.controller.ts
    │   │   └── mobicom-service.controller.ts
    │   ├── services/
    │   │   ├── mobicom-api.service.ts
    │   │   ├── mobicom-order.service.ts
    │   │   └── mobicom-recharge.consumer.ts
    │   └── ...
    │
    └── ondo/                   # Ondo 运营商（未来）
        └── ...
```

---

## API 路由设计

### Unitel 订单相关
```
POST   /api/operators/unitel/orders              创建订单
GET    /api/operators/unitel/orders              获取订单列表
GET    /api/operators/unitel/orders/:orderNo     获取订单详情
```

### Unitel 专属服务
```
POST   /api/operators/unitel/service-types       获取资费列表
POST   /api/operators/unitel/invoices            获取后付费账单
```

### 共享支付接口
```
POST   /api/payment/create                       统一下单（传入 operator）
POST   /api/payment/notify                       微信支付回调
```

---

## 充值时机方案：异步队列

### 选择原因
1. **第三方 API 不稳定**
   - 已发送的充值请求在超时的情况下，我方不知道第三方有没有收到请求
   - 不知道有没有进行充值
   - 第三方也没有提供查询订单结果的 API

2. **微信支付回调必须立即返回**
   - 不管其他业务如何进行，必须在 5 秒内返回响应给微信
   - 避免微信重复回调

### 处理策略
- ✅ 支付成功后，发送充值任务到消息队列
- ✅ 异步消费者处理充值任务
- ❌ **暂不做失败订单重新充值**（Bull 队列配置 attempts: 1）
- ❌ **暂不做失败订单退款功能**
- ⚠️ **完全由人工处理失败或超时订单**
- 📊 后续通过日志查询确定失败原因后再做优化

### 工作流程
```
用户支付成功
    ↓
微信支付回调 → PaymentService.handleNotify()
    ↓
1. 验证签名
2. 更新订单支付状态（paymentStatus = 'paid'）
3. 发送充值任务到队列 → RechargeProducer.addJob({ orderNo, operator: 'unitel' })
4. 立即返回成功给微信（< 5 秒）
    ↓
Redis 队列 ('unitel-recharge')
    ↓
UnitelRechargeConsumer.process()
    ↓
1. 查询订单
2. 更新充值状态为 'processing'
3. 调用 UnitelApiService 进行充值
    ├─ 成功 → 更新为 'success'，保存 API 响应
    └─ 失败 → 更新为 'failed'，记录错误信息，不重试
```

---

## 模块依赖关系

```
┌─────────────────────────────────────────────────────┐
│                   AppModule                         │
└─────────────────────────────────────────────────────┘
           │
           ├─ PaymentModule (共享)
           │    │
           │    ├─ QueueModule.forRoot()  ← 导出 RechargeProducer
           │    └─ 依赖 UnitelOrderService (动态注入)
           │
           ├─ QueueModule (共享)
           │    └─ 提供 Bull 配置和 Producer
           │
           └─ Operators/
                │
                ├─ UnitelModule
                │    ├─ 导入 QueueModule.registerQueue('unitel-recharge')
                │    ├─ 导出 UnitelOrderService (供 PaymentModule 使用)
                │    └─ 注册 UnitelRechargeConsumer
                │
                ├─ MobicomModule (未来)
                └─ OndoModule (未来)
```

---

## 数据库设计

### UnitelOrder 表（已存在）

```prisma
model UnitelOrder {
  // 订单基本信息
  orderNo   String @id @map("order_no")         /// 订单号

  // 用户信息
  openid    String
  user      User   @relation(fields: [openid], references: [openid])
  msisdn    String                              /// 手机号码
  orderType String @map("order_type")           /// 订单类型: balance | data | invoice_payment

  // 金额信息（双币种）
  amountMnt    Decimal  @map("amount_mnt") @db.Decimal(10, 2)   /// 蒙古国货币金额(MNT)
  amountCny    Decimal  @map("amount_cny") @db.Decimal(10, 2)   /// 人民币金额(CNY)
  exchangeRate Decimal? @map("exchange_rate") @db.Decimal(10, 4) /// 汇率快照

  // 产品信息（资费列表字段）
  packageCode    String  @map("package_code")    /// 套餐代码
  packageName    String  @map("package_name")    /// 套餐名称（蒙古语）
  packageEngName String  @map("package_eng_name") /// 套餐英文名称
  packageUnit    Int?    @map("package_unit")    /// 话费单位
  packageData    String? @map("package_data")    /// 流量大小（如"3GB"）
  packageDays    Int?    @map("package_days")    /// 有效期天数

  // 状态管理
  paymentStatus  String @map("payment_status")   /// 支付状态: unpaid | paid | refunded
  rechargeStatus String @map("recharge_status")  /// 充值状态: pending | processing | success | failed

  // Unitel API 特有字段
  svId   String? @map("sv_id")                   /// Unitel服务ID
  seq    String?                                 /// Unitel序列号
  method String?                                 /// 支付方式

  // VAT 发票信息
  vatFlag       String? @map("vat_flag")
  vatRegisterNo String? @map("vat_register_no")
  vatInfo       Json?   @map("vat_info")

  // API 响应信息
  apiResult String? @map("api_result")
  apiCode   String? @map("api_code")
  apiMsg    String? @map("api_msg")
  apiRaw    Json?   @map("api_raw")

  // 错误信息
  errorMessage String? @map("error_message")
  errorCode    String? @map("error_code")

  // 时间戳
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  paidAt      DateTime? @map("paid_at")
  completedAt DateTime? @map("completed_at")

  @@index([openid])
  @@index([msisdn])
  @@index([paymentStatus])
  @@index([rechargeStatus])
  @@index([orderType])
  @@index([createdAt])
  @@map("unitel_orders")
}
```

---

## 开发计划

### ✅ 已完成
1. **基础设施层**
   - 全局异常处理、速率限制、配置验证
   - 健康检查、阿里云 SLS 日志
   - Prisma ORM + Redis

2. **业务模块**
   - 汇率模块（完整）
   - Unitel API 封装（完整：Token 管理、资费列表、充值接口）
   - 微信授权登录 + JWT 认证
   - 数据库表设计（User、UnitelOrder 已就绪）

### 🚧 开发中

#### 阶段一：Unitel 订单模块（2-3天）
**目标**：实现 Unitel 订单的 CRUD 和状态管理

1. **创建订单模块结构**
   - 在 `src/modules/operators/unitel/` 下创建：
     - `controllers/unitel-order.controller.ts`
     - `services/unitel-order.service.ts`
     - `dto/`, `enums/`, `interfaces/` 等目录

2. **实现订单业务逻辑**
   - UnitelOrderService 核心方法：
     - `createOrder()` - 创建订单（生成订单号、保存套餐信息、汇率快照）
     - `findUserOrders()` - 查询用户订单列表（分页、状态筛选）
     - `findByOrderNo()` - 查询单个订单
     - `updatePaymentStatus()` - 更新支付状态
     - `updateRechargeStatus()` - 更新充值状态

3. **实现订单 API**
   - `POST /operators/unitel/orders` - 创建订单
   - `GET /operators/unitel/orders` - 获取订单列表
   - `GET /operators/unitel/orders/:orderNo` - 获取订单详情

4. **实现 Unitel 专属服务 API**
   - 创建 `controllers/unitel-service.controller.ts`
   - `POST /operators/unitel/service-types` - 获取资费列表（调用已有 UnitelApiService）
   - `POST /operators/unitel/invoices` - 获取后付费账单

### 📋 待开发

#### 阶段二：消息队列模块（1-2天）
**目标**：搭建 Bull 消息队列基础设施

1. **安装依赖**
   ```bash
   npm install @nestjs/bull bull
   npm install -D @types/bull
   ```

2. **创建队列模块**
   - `src/modules/queue/queue.module.ts`
   - 配置 Bull 连接 Redis
   - 创建 `producers/recharge.producer.ts`（充值任务生产者）

3. **实现 Unitel 充值消费者**
   - `src/modules/operators/unitel/services/unitel-recharge.consumer.ts`
   - 监听 `unitel-recharge` 队列
   - 处理充值逻辑（调用 UnitelApiService）
   - 更新订单充值状态（成功/失败，不重试）

4. **在 UnitelModule 中注册**
   - 导入 `BullModule.registerQueue({ name: 'unitel-recharge' })`
   - 注册 UnitelRechargeConsumer 为 Provider

#### 阶段三：微信支付模块（2-3天）
**目标**：集成微信支付，对接订单和队列

1. **安装微信支付 SDK**
   ```bash
   npm install wechatpay-node-v3
   ```

2. **创建支付模块**
   - `src/modules/payment/payment.module.ts`
   - `payment.service.ts` - 封装微信支付 API
   - `payment.controller.ts` - 支付 API 端点

3. **实现支付功能**
   - `POST /payment/create` - 统一下单
     - 接收 `{ orderNo, operator: 'unitel' }`
     - 查询订单金额
     - 调用微信 JSAPI 统一下单
     - 返回前端支付参数

   - `POST /payment/notify` - 微信支付回调
     - 验证签名
     - 更新订单支付状态（调用 UnitelOrderService）
     - 发送充值任务到队列（调用 RechargeProducer）
     - **立即返回成功响应给微信**

4. **配置环境变量**
   - 添加商户号、API 密钥、证书路径等

#### 阶段四：联调测试（1-2天）
**目标**：端到端测试完整流程

1. **单元测试**
   - 测试订单 CRUD
   - 测试队列生产/消费
   - 测试支付签名验证

2. **集成测试**
   - 完整流程：创建订单 → 发起支付 → 支付回调 → 队列充值 → 查看订单状态
   - 使用微信支付沙箱环境测试

3. **异常场景测试**
   - Unitel API 超时
   - Unitel API 返回失败
   - 微信回调重复通知

---

## 环境变量配置

### 现有配置
```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/elife_db?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Unitel API
UNITEL_USERNAME=your_username
UNITEL_PASSWORD=your_password
UNITEL_BASE_URL=https://api.unitel.mn/api/v1

# WeChat Official Account
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret

# JWT Authentication
JWT_SECRET=your-super-secret-key-change-in-production-min-32-characters
JWT_EXPIRES_IN=7d

# Aliyun SLS
ALIYUN_SLS_ENABLED=false
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_SLS_ENDPOINT=cn-beijing.log.aliyuncs.com
ALIYUN_SLS_PROJECT=elife-service-logs
ALIYUN_SLS_LOGSTORE=app-logs
```

### 待添加配置（阶段三）
```env
# WeChat Pay
WECHAT_MCHID=your_merchant_id
WECHAT_API_V3_KEY=your_api_v3_key
WECHAT_CERT_SERIAL_NO=your_cert_serial
WECHAT_PRIVATE_KEY_PATH=./certs/apiclient_key.pem

# Recharge Queue Settings (可选)
RECHARGE_QUEUE_ATTEMPTS=1           # 充值失败不重试
RECHARGE_QUEUE_TIMEOUT=30000        # 30秒超时
```

---

## 技术栈

### 后端
- **框架**: NestJS
- **ORM**: Prisma
- **数据库**: PostgreSQL
- **缓存**: Redis
- **消息队列**: Bull (基于 Redis)
- **日志**: Pino + 阿里云 SLS
- **认证**: JWT + 微信授权
- **支付**: 微信支付 (wechatpay-node-v3)

### 前端
- **框架**: (待补充)
- **UI**: (待补充)

---

## 架构优势

1. **多运营商完全隔离**
   - 每个运营商独立的 Controller、Service、Consumer
   - 添加新运营商只需复制模板，不影响现有代码

2. **支付模块可复用**
   - 所有运营商共享微信支付逻辑
   - 通过 `operator` 参数动态路由到对应运营商

3. **充值异步处理**
   - 微信回调立即返回（避免超时）
   - Bull 队列保证任务不丢失
   - 失败订单不重试，人工处理（符合业务需求）

4. **清晰的职责划分**
   ```
   UnitelOrderService     → 订单 CRUD 和状态管理
   UnitelApiService       → 第三方 API 封装
   UnitelRechargeConsumer → 异步充值处理
   PaymentService         → 微信支付统一处理
   RechargeProducer       → 充值任务生产者
   ```

---

## 后续优化建议

### 短期（1-2周内）
- [ ] 添加订单超时自动取消（使用 Bull 延迟队列）
- [ ] 实现订单详情页的实时状态更新（WebSocket 或轮询）
- [ ] 添加管理后台订单查询和筛选

### 中期（1-2月内）
- [ ] 实现退款功能（需要微信支付退款 API）
- [ ] 充值失败重试机制（可配置重试次数和间隔）
- [ ] 添加订单统计和报表功能

### 长期（3月以上）
- [ ] 接入 Mobicom、Ondo 等其他运营商
- [ ] 实现用户钱包功能（余额充值、优惠券）
- [ ] 添加推荐奖励机制

---

## 联系与反馈

如有问题或建议，请在项目 Issue 中提出。

---

**文档版本**: v1.0
**最后更新**: 2025-10-23
**维护者**: 开发团队
