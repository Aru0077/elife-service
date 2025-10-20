# Modules 目录结构说明

## 概述

本项目采用**运营商完全隔离**的架构设计，每个运营商拥有独立的模块、数据表和业务逻辑实现。

## 目录结构

```
src/modules/
├── auth/                           # 认证授权模块(共享)
│   ├── user/                      # 用户端认证
│   │   ├── wechat/               # 微信网页授权
│   │   │   ├── dto/
│   │   │   └── guards/
│   │   └── guards/
│   └── admin/                     # 管理员认证(账号密码)
│       └── dto/
│
├── user/                          # 用户模块(共享)
│   └── entities/
│
├── admin/                         # 管理员模块(共享)
│   └── entities/
│
├── payment/                       # 支付模块(共享)
│   └── wechat-pay/               # 微信支付
│       ├── dto/
│       └── config/
│
└── operators/                     # 运营商模块(完全隔离)
    ├── unitel/                   # Unitel运营商
    │   ├── controllers/          # 控制器层
    │   ├── services/             # 业务逻辑层
    │   ├── entities/             # 数据实体(Prisma)
    │   ├── dto/                  # 数据传输对象
    │   ├── enums/                # 枚举定义
    │   └── config/               # 配置文件
    │
    ├── mobicom/                  # Mobicom运营商
    │   ├── controllers/
    │   ├── services/
    │   ├── entities/
    │   ├── dto/
    │   ├── enums/
    │   └── config/
    │
    └── ondo/                     # Ondo运营商
        ├── controllers/
        ├── services/
        ├── entities/
        ├── dto/
        ├── enums/
        └── config/
```

## API 路由设计

### 用户端 API
```
POST   /api/unitel/orders              # 创建Unitel订单
GET    /api/unitel/orders/:id          # 查询Unitel订单详情
GET    /api/unitel/orders              # 查询用户的Unitel订单列表

POST   /api/mobicom/orders             # 创建Mobicom订单
GET    /api/mobicom/orders/:id         # 查询Mobicom订单详情

POST   /api/ondo/orders                # 创建Ondo订单
GET    /api/ondo/orders/:id            # 查询Ondo订单详情
```

### 管理端 API
```
GET    /api/admin/unitel/orders        # 管理Unitel订单
GET    /api/admin/unitel/orders/:id    # 查看Unitel订单详情
PATCH  /api/admin/unitel/orders/:id    # 更新Unitel订单状态

GET    /api/admin/mobicom/orders       # 管理Mobicom订单
GET    /api/admin/ondo/orders          # 管理Ondo订单
```

### 运营商回调 API
```
POST   /api/unitel/webhook             # Unitel充值回调
POST   /api/mobicom/webhook            # Mobicom充值回调
POST   /api/ondo/webhook               # Ondo充值回调
```

### 认证 API
```
POST   /api/auth/wechat/login          # 微信授权登录(用户端)
POST   /api/auth/admin/login           # 管理员登录
POST   /api/auth/admin/register        # 管理员注册
```

### 支付 API
```
POST   /api/payment/wechat/create      # 创建微信支付订单
POST   /api/payment/wechat/notify      # 微信支付回调
GET    /api/payment/wechat/query/:id   # 查询支付状态
```

## 数据库设计

### 共享表
- `User` - 用户表(微信用户)
- `Admin` - 管理员表

### 运营商独立表
- `UnitelOrder` - Unitel订单表
- `MobicomOrder` - Mobicom订单表
- `OndoOrder` - Ondo订单表

每个运营商订单表包含该运营商特有的字段，完全独立。

## 模块职责划分

### 1. auth 模块(共享)
负责用户和管理员的认证授权：
- **auth/user/wechat**: 微信网页授权登录
- **auth/admin**: 管理员账号密码登录

### 2. user 模块(共享)
管理微信用户信息：
- 用户基本信息
- 用户订单关联

### 3. admin 模块(共享)
管理管理员信息：
- 管理员账号管理
- 权限控制

### 4. payment 模块(共享)
处理支付相关逻辑：
- **wechat-pay**: 微信支付集成

### 5. operators 模块(隔离)
每个运营商完全独立的业务实现：

#### controllers/ - 控制器层
- `{operator}-order.controller.ts` - 用户端订单API
- `{operator}-admin.controller.ts` - 管理端订单API
- `{operator}-webhook.controller.ts` - 运营商回调处理

#### services/ - 业务逻辑层
- `{operator}-order.service.ts` - 订单业务逻辑
- `{operator}-api.service.ts` - 运营商API对接
- `{operator}-webhook.service.ts` - 回调处理逻辑

#### entities/ - 数据实体
- `{operator}-order.entity.ts` - 订单数据模型(对应Prisma Schema)

#### dto/ - 数据传输对象
- 请求DTO
- 响应DTO
- API对接DTO

#### enums/ - 枚举
- 订单状态枚举
- 业务状态枚举

#### config/ - 配置
- 运营商API配置
- 业务配置

## 设计原则

### ✅ 完全隔离
- 每个运营商拥有独立的数据表、服务、控制器
- 运营商之间零耦合，互不影响

### ✅ 易于扩展
- 新增运营商：复制现有运营商目录结构，实现独立逻辑
- **无需修改任何现有运营商的代码**

### ✅ 独立部署
- 未来可轻松拆分为微服务
- 每个运营商可独立扩缩容

### ✅ 安全可靠
- 运营商数据完全隔离
- 某个运营商故障不影响其他运营商

## 如何添加新运营商

1. 复制现有运营商目录(如 `operators/unitel`)
2. 重命名为新运营商名称(如 `operators/newtel`)
3. 创建对应的Prisma Schema模型
4. 实现该运营商的业务逻辑
5. 在 `app.module.ts` 中注册新模块
6. **无需修改任何现有代码**

## 文件命名规范

### Controllers
- `{operator}-order.controller.ts` - 用户端订单控制器
- `{operator}-admin.controller.ts` - 管理端控制器
- `{operator}-webhook.controller.ts` - 回调控制器

### Services
- `{operator}-order.service.ts` - 订单服务
- `{operator}-api.service.ts` - API对接服务
- `{operator}-webhook.service.ts` - 回调服务

### Entities
- `{operator}-order.entity.ts` - 订单实体

### Module
- `{operator}.module.ts` - 运营商模块定义

例如 Unitel:
- `unitel-order.controller.ts`
- `unitel-order.service.ts`
- `unitel-api.service.ts`
- `unitel-order.entity.ts`
- `unitel.module.ts`
