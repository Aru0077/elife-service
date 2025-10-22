# 模块目录结构设计指南

## 📋 文档目的

本文档记录 eLife-service 项目的模块目录结构设计思路和最佳实践，为团队开发提供统一的规范。

---

## 🎯 设计原则

### 1. 精简高效
- ❌ **避免过度设计**：不创建暂时用不到的目录和文件
- ✅ **按需创建**：只在真正需要时才添加新结构
- ✅ **最小化原则**：保持目录层级简单，减少复杂度

### 2. 职责清晰
- **单一职责**：每个模块、文件都有明确的职责
- **边界清晰**：模块之间低耦合，职责不重叠
- **易于理解**：通过目录结构即可理解模块功能

### 3. 易于扩展
- **模块独立**：新增功能不影响现有模块
- **可插拔**：模块可以独立开发、测试、部署
- **预留空间**：为未来扩展预留合理的结构

### 4. 类型安全
- **使用 Prisma**：数据模型在 `schema.prisma` 中定义
- **TypeScript 接口**：API 响应、请求参数使用 interface
- **不重复定义**：避免 entity 与 Prisma 模型重复

---

## 📁 标准模块目录结构

### 基础模块（如 ExchangeRate）

```
src/modules/exchange-rate/
├── dto/                              # 数据传输对象（可选）
│   ├── index.ts
│   └── exchange-rate.dto.ts
│
├── services/                         # 业务逻辑层
│   ├── index.ts
│   └── exchange-rate.service.ts
│
├── exchange-rate.controller.ts      # 控制器（API 端点）
└── exchange-rate.module.ts          # 模块定义
```

**说明**：
- ❌ **不需要 entities/**：使用 Prisma 模型
- ✅ **DTO 可选**：简单模块可直接使用 Prisma 类型
- ✅ **扁平结构**：避免过深的目录嵌套

### API 封装模块（如 UnitelApi）

```
src/modules/operators/unitel/
├── config/                           # 配置文件
│   └── unitel.config.ts
│
├── interfaces/                       # TypeScript 接口
│   ├── index.ts
│   ├── token.interface.ts
│   ├── service-type.interface.ts
│   ├── invoice.interface.ts
│   ├── recharge.interface.ts
│   └── common.interface.ts
│
├── services/                         # 服务层
│   ├── index.ts
│   └── unitel-api.service.ts
│
└── unitel.module.ts                  # 模块定义
```

**说明**：
- ✅ **interfaces/**：定义第三方 API 原始响应类型
- ✅ **config/**：独立配置，使用 `@nestjs/config`
- ❌ **不需要 dto/**：暂时不做业务层
- ❌ **不需要 controllers/**：纯 API 封装，不提供端点

### 完整业务模块（未来参考）

```
src/modules/operators/unitel/
├── config/                           # 配置
│   └── unitel.config.ts
│
├── interfaces/                       # 第三方 API 接口
│   └── ...
│
├── dto/                              # 业务 DTO
│   ├── request/
│   │   ├── create-order.dto.ts
│   │   └── query-orders.dto.ts
│   └── response/
│       ├── order.dto.ts
│       └── order-list.dto.ts
│
├── enums/                            # 枚举
│   ├── order-type.enum.ts
│   ├── payment-status.enum.ts
│   └── recharge-status.enum.ts
│
├── services/                         # 服务层
│   ├── unitel-api.service.ts        # API 封装
│   └── unitel-order.service.ts      # 业务逻辑
│
├── controllers/                      # 控制器
│   └── unitel.controller.ts
│
└── unitel.module.ts                  # 模块定义
```

---

## 🏗️ Unitel 模块设计详解

### 当前实现（API 封装层）

#### 目录结构
```
src/modules/operators/unitel/
├── config/
│   └── unitel.config.ts              # ✅ API 配置
│
├── interfaces/                        # ✅ 类型定义
│   ├── index.ts                      # 统一导出
│   ├── token.interface.ts            # Token 响应
│   ├── service-type.interface.ts     # 资费列表响应
│   ├── invoice.interface.ts          # 账单响应
│   ├── recharge.interface.ts         # 充值响应
│   └── common.interface.ts           # 请求参数、公共类型
│
├── services/                          # ✅ 服务层
│   ├── index.ts                      # 统一导出
│   └── unitel-api.service.ts         # 核心 API 封装
│
└── unitel.module.ts                   # ✅ 模块定义
```

#### 设计思路

**1. 为什么不使用 entities/**
```typescript
// ❌ 不推荐：重复定义
// src/modules/operators/unitel/entities/unitel-order.entity.ts
export class UnitelOrder {
  orderNo: string;
  msisdn: string;
  // ... 与 Prisma Schema 重复
}

// ✅ 推荐：直接使用 Prisma 类型
import { UnitelOrder } from '@prisma/client';

// 或者在需要时扩展
import { UnitelOrder as PrismaUnitelOrder } from '@prisma/client';
type UnitelOrderWithRelations = PrismaUnitelOrder & {
  user: User;
};
```

**2. interfaces/ vs dto/**

| 用途 | 使用 interfaces/ | 使用 dto/ |
|------|-----------------|-----------|
| 第三方 API 响应 | ✅ 使用 interface | ❌ 不需要 |
| 第三方 API 请求 | ✅ 使用 interface | ❌ 不需要 |
| 业务层请求参数 | ❌ 不适用 | ✅ 使用 class + decorators |
| 业务层响应数据 | ❌ 不适用 | ✅ 使用 class |

```typescript
// interfaces/ - 第三方 API 类型定义
export interface ServiceTypeResponse {
  servicetype: string;
  service: {
    cards: { ... };
    data: { ... };
  };
}

// dto/ - 业务层数据传输对象（未来）
export class CreateOrderDto {
  @IsString()
  msisdn: string;

  @IsString()
  packageCode: string;
}
```

**3. config/ 独立配置**

```typescript
// config/unitel.config.ts
export default registerAs('unitel', () => ({
  username: process.env.UNITEL_USERNAME,
  password: process.env.UNITEL_PASSWORD,
  baseUrl: process.env.UNITEL_BASE_URL,
  timeout: 30000,
  tokenKey: 'unitel:access_token',
}));
```

**优势**：
- 配置集中管理
- 类型安全（ConfigType）
- 易于测试和 Mock

**4. services/ 分层**

当前：
```
services/
└── unitel-api.service.ts    # API 封装层
```

未来扩展：
```
services/
├── unitel-api.service.ts    # API 封装层（不变）
└── unitel-order.service.ts  # 业务逻辑层（新增）
```

**职责划分**：
- `unitel-api.service.ts`：纯 API 调用，无业务逻辑
- `unitel-order.service.ts`：业务流程编排，调用 API 服务

---

## 📋 模块创建检查清单

### 创建新模块前的思考

#### 1. 是否需要 entities/?
- [ ] 项目使用 Prisma？ → ❌ 不需要
- [ ] 项目使用 TypeORM？ → ✅ 需要
- [ ] 需要扩展 Prisma 类型？ → ✅ 使用 `type` 扩展

#### 2. 是否需要 dto/?
- [ ] 模块提供 HTTP 端点？ → ✅ 需要（用于验证）
- [ ] 仅提供内部服务？ → ❌ 不需要
- [ ] 需要数据验证？ → ✅ 需要

#### 3. 是否需要 interfaces/?
- [ ] 调用第三方 API？ → ✅ 需要（定义响应类型）
- [ ] 纯业务逻辑？ → ❌ 不需要
- [ ] 需要类型定义？ → ✅ 考虑使用

#### 4. 是否需要 enums/?
- [ ] 有固定的状态值？ → ✅ 需要
- [ ] 状态值可能变化？ → ❌ 考虑配置
- [ ] 需要类型约束？ → ✅ 需要

#### 5. 是否需要 config/?
- [ ] 有环境相关配置？ → ✅ 需要
- [ ] 配置较多？ → ✅ 需要
- [ ] 配置简单？ → ❌ 可在 module 中直接使用

---

## 🎯 实际案例

### 案例 1：Unitel API 模块

**需求**：封装 Unitel 第三方 API

**分析**：
- ✅ 调用第三方 API → 需要 `interfaces/`
- ✅ 有环境配置 → 需要 `config/`
- ✅ 纯 API 封装 → 需要 `services/`
- ❌ 不提供端点 → 不需要 `controllers/`
- ❌ 不做业务逻辑 → 不需要 `dto/`
- ❌ 使用 Prisma → 不需要 `entities/`

**最终结构**：
```
unitel/
├── config/
├── interfaces/
├── services/
└── unitel.module.ts
```

### 案例 2：ExchangeRate 模块

**需求**：提供汇率查询 API

**分析**：
- ✅ 提供 HTTP 端点 → 需要 `controller`
- ✅ 业务逻辑 → 需要 `services/`
- ✅ 响应格式化 → 需要 `dto/`
- ❌ 使用 Prisma → 不需要 `entities/`
- ❌ 无第三方 API → 不需要 `interfaces/`

**最终结构**：
```
exchange-rate/
├── dto/
├── services/
├── exchange-rate.controller.ts
└── exchange-rate.module.ts
```

### 案例 3：UnitelOrder 模块（未来）

**需求**：处理 Unitel 订单业务

**分析**：
- ✅ 提供 HTTP 端点 → 需要 `controllers/`
- ✅ 复杂业务逻辑 → 需要 `services/`
- ✅ 请求验证 → 需要 `dto/request/`
- ✅ 响应格式化 → 需要 `dto/response/`
- ✅ 订单状态 → 需要 `enums/`
- ❌ 使用 Prisma → 不需要 `entities/`
- ✅ 调用 API 服务 → 复用 `unitel-api.service.ts`

**最终结构**：
```
unitel/
├── config/
├── interfaces/           # 已存在（API 响应）
├── dto/                  # 新增（业务层）
│   ├── request/
│   └── response/
├── enums/                # 新增
├── services/
│   ├── unitel-api.service.ts      # 已存在
│   └── unitel-order.service.ts    # 新增
├── controllers/          # 新增
│   └── unitel.controller.ts
└── unitel.module.ts
```

---

## 🔄 目录演进策略

### 阶段 1：API 封装（当前）
```
unitel/
├── config/
├── interfaces/
├── services/
│   └── unitel-api.service.ts
└── unitel.module.ts
```

**特点**：最小化，只有必要文件

### 阶段 2：业务逻辑
```
unitel/
├── config/
├── interfaces/
├── dto/                  # 新增
├── enums/                # 新增
├── services/
│   ├── unitel-api.service.ts
│   └── unitel-order.service.ts  # 新增
└── unitel.module.ts
```

**变化**：增加业务层支持

### 阶段 3：完整模块
```
unitel/
├── config/
├── interfaces/
├── dto/
├── enums/
├── services/
├── controllers/          # 新增
├── guards/               # 按需
├── interceptors/         # 按需
└── unitel.module.ts
```

**变化**：完整的 HTTP 端点支持

---

## ✅ 最佳实践总结

### DO（推荐）
1. ✅ **按需创建**：只创建当前需要的目录
2. ✅ **使用 Prisma**：不重复定义 entity
3. ✅ **类型安全**：使用 TypeScript 接口
4. ✅ **统一导出**：使用 `index.ts`
5. ✅ **配置分离**：使用 `config/` 目录
6. ✅ **职责单一**：每个文件/模块职责明确

### DON'T（不推荐）
1. ❌ **过度设计**：不创建"可能用到"的目录
2. ❌ **重复定义**：entity 与 Prisma Schema 重复
3. ❌ **深层嵌套**：避免过深的目录结构
4. ❌ **职责混乱**：一个文件做多件事
5. ❌ **忽略类型**：使用 `any` 类型
6. ❌ **配置硬编码**：配置应该环境化

---

## 📚 参考资料

- [NestJS 官方文档 - Module Structure](https://docs.nestjs.com/)
- [项目总览](./PROJECT_OVERVIEW.md)
- [Unitel API 模块](./UNITEL_API_MODULE.md)
- [最佳实践](./BEST_PRACTICES.md)

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-22
**适用项目**: eLife-service

---

## 🔄 更新日志

- **2025-10-22**: 创建文档，记录 Unitel 模块设计思路
