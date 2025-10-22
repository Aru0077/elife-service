# Unitel API 模块设计文档

## 📋 概述

本文档记录 Unitel 运营商 API 封装模块的设计思路、实现细节和当前进度。

---

## 🎯 设计目标

1. **精简高效**：不过度设计，专注于 API 封装
2. **职责单一**：只负责与 Unitel 第三方 API 通信，不处理业务逻辑
3. **可复用性**：作为服务层，可被其他业务模块调用
4. **被动刷新**：Token 采用被动刷新策略，只在 401 时更新

---

## 🏗️ 目录结构

```
src/modules/operators/unitel/
├── config/
│   └── unitel.config.ts                    # ✅ Unitel API 配置
│
├── interfaces/                              # ✅ TypeScript 接口定义
│   ├── index.ts                            # 统一导出
│   ├── token.interface.ts                  # Token 响应接口
│   ├── service-type.interface.ts           # 资费列表响应接口
│   ├── invoice.interface.ts                # 账单响应接口
│   ├── recharge.interface.ts               # 充值响应接口
│   └── common.interface.ts                 # 公共接口（参数、错误）
│
├── services/                                # ✅ 服务层
│   ├── index.ts                            # 统一导出
│   └── unitel-api.service.ts               # 核心 API 封装服务
│
└── unitel.module.ts                        # ✅ Unitel 模块定义
```

**设计说明**：
- ❌ **不使用 entities/**：因为项目使用 Prisma，数据模型在 `schema.prisma` 中定义
- ❌ **不使用 dto/**：暂时不做业务层，只封装 API
- ❌ **不使用 enums/**：暂时不需要
- ❌ **不使用 controllers/**：暂时不做业务层

---

## 🔌 Unitel API 端点

基于 `/root/unitel_api.md` 文档，封装以下 5 个 API 端点：

| 端点 | 方法 | 功能 | Service 方法 |
|------|------|------|-------------|
| `/auth` | POST | 获取 Token | `fetchNewToken()` (私有) |
| `/service/servicetype` | POST | 获取资费列表 | `getServiceType()` |
| `/service/unitel` | POST | 获取后付费账单 | `getInvoice()` |
| `/service/recharge` | POST | 充值话费 | `rechargeBalance()` |
| `/service/datapackage` | POST | 充值流量 | `rechargeData()` |
| `/service/payment` | POST | 支付后付费账单 | `payInvoice()` |

---

## 🔑 Token 管理策略（被动刷新）

### 核心思想
- **不依赖固定 TTL**：Unitel Token 有效期不固定
- **被动刷新**：只在 API 返回 401 时才获取新 Token
- **Redis 缓存**：存储 Token，无 TTL 或长 TTL

### 工作流程

```
业务调用（如 getServiceType）
    ↓
从 Redis 获取缓存的 Token
    ↓
├─ 有缓存？
│   ↓
│   使用 Token 发起请求
│   ↓
│   ├─ 成功 (200) → 返回结果 ✅
│   │
│   └─ 失败 (401) → Token 已过期
│       ↓
│       1. 清除 Redis 缓存
│       2. 调用 /auth 获取新 Token
│       3. 保存到 Redis
│       4. 重试原始请求（仅重试 1 次）
│       ↓
│       返回结果 ✅
│
└─ 无缓存？
    ↓
    1. 调用 /auth 获取新 Token
    2. 保存到 Redis
    3. 发起原始请求
    ↓
    返回结果 ✅
```

### 关键代码逻辑

```typescript
// Token 管理
private async getAccessToken(): Promise<string> {
  // 1. 优先从 Redis 获取
  const cachedToken = await this.redisService.get('unitel:access_token');
  if (cachedToken) return cachedToken;

  // 2. 无缓存，调用 /auth
  const token = await this.fetchNewToken();

  // 3. 保存到 Redis（无 TTL）
  await this.redisService.set('unitel:access_token', token);

  return token;
}

// 统一请求方法（带 401 重试）
private async request<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  data?: any,
  retryOn401 = true,
): Promise<T> {
  try {
    const token = await this.getAccessToken();

    // 发起请求...
    return response.data;

  } catch (error) {
    // 401 错误处理
    if (error.response?.status === 401 && retryOn401) {
      await this.clearTokenCache(); // 清除缓存
      return this.request<T>(method, endpoint, data, false); // 重试 1 次
    }

    throw error;
  }
}
```

---

## 📦 接口定义（interfaces/）

### 1. TokenResponse（token.interface.ts）
```typescript
export interface TokenResponse {
  access_token: string;
  token_type: string;      // "Bearer"
  expires_in: string;
  scope: string;
}
```

### 2. ServiceTypeResponse（service-type.interface.ts）
```typescript
export interface CardItem {
  code: string;            // 套餐代码 "SD5000"
  name: string;            // 套餐名称（蒙古语）
  eng_name: string;        // 英文名称
  price: number;           // 价格（MNT）
  unit?: number;           // 话费单位
  data?: string;           // 流量大小 "3GB"
  days?: number;           // 有效期天数
  short_name: string;      // 简称
}

export interface ServiceTypeResponse {
  // ... 元数据
  service: {
    cards: {
      day: CardItem[];      // 可续租期话费
      noday: CardItem[];    // 纯话费
      special: CardItem[];  // 特殊套餐
    };
    data: {
      data: CardItem[];          // 流量包
      days: CardItem[];          // 按天流量包
      entertainment: CardItem[]; // 专用流量
    };
  };
}
```

### 3. InvoiceResponse（invoice.interface.ts）
```typescript
export interface InvoiceResponse {
  invoice_amount: number;
  remain_amount: number;
  invoice_date: string;    // "2025.09.01-2025.09.30"
  total_unpaid: number;
  invoice_unpaid: number;
  invoice_status: string;  // "unpaid"
  // ...
}
```

### 4. RechargeResponse（recharge.interface.ts）
```typescript
export interface RechargeResponse {
  result: string;          // "success"
  code: string;            // "000"
  msg: string;
  sv_id: string | null;    // Unitel服务ID
  seq: string;             // 序列号
  method: string;          // "cash"
  vat: VatInfo;            // VAT发票信息
}

export interface VatInfo {
  billId: string;
  amount: string;
  vat: string;
  lottery: string;         // 彩票号
  stocks: VatStock[];      // 库存项
  // ...
}
```

### 5. 请求参数（common.interface.ts）
```typescript
export interface RechargeBalanceParams {
  msisdn: string;
  card: string;            // 套餐代码
  vatflag: string;         // "0" | "1"
  vat_register_no: string;
  transactions: Transaction[];
}

export interface RechargeDataParams {
  msisdn: string;
  package: string;         // 套餐代码
  vatflag: string;
  vat_register_no: string;
  transactions: Transaction[];
}

export interface PayInvoiceParams {
  msisdn: string;
  amount: string;
  remark: string;
  vatflag: string;
  vat_register_no: string;
  transactions: Transaction[];
}
```

---

## 🔧 UnitelApiService 核心方法

### 公共方法（业务 API）

```typescript
export class UnitelApiService {
  /**
   * 获取资费列表
   */
  async getServiceType(msisdn: string): Promise<ServiceTypeResponse>

  /**
   * 获取后付费账单
   */
  async getInvoice(msisdn: string): Promise<InvoiceResponse>

  /**
   * 充值话费
   */
  async rechargeBalance(params: RechargeBalanceParams): Promise<RechargeResponse>

  /**
   * 充值流量
   */
  async rechargeData(params: RechargeDataParams): Promise<RechargeResponse>

  /**
   * 支付后付费账单
   */
  async payInvoice(params: PayInvoiceParams): Promise<PaymentResponse>
}
```

### 私有方法（内部使用）

```typescript
// Token 管理
private async getAccessToken(): Promise<string>
private async fetchNewToken(): Promise<string>
private async clearTokenCache(): Promise<void>

// HTTP 请求封装
private async request<T>(
  method: 'GET' | 'POST',
  endpoint: string,
  data?: any,
  retryOn401?: boolean,
): Promise<T>
```

---

## 🚀 模块注册

### UnitelModule
```typescript
@Module({
  imports: [
    ConfigModule.forFeature(unitelConfig),  // Unitel 配置
    HttpModule,                             // HTTP 客户端
    RedisModule,                            // Redis 缓存
  ],
  providers: [UnitelApiService],
  exports: [UnitelApiService],              // 导出供其他模块使用
})
export class UnitelModule {}
```

### AppModule（已注册）
```typescript
@Module({
  imports: [
    // ... 其他模块
    UnitelModule,  // ✅ 已添加
  ],
})
export class AppModule {}
```

---

## 📊 当前进度

### ✅ 已完成

1. **目录结构搭建**
   - [x] 创建 `interfaces/` 目录
   - [x] 创建 `services/` 目录

2. **接口定义**
   - [x] `token.interface.ts` - Token 响应
   - [x] `service-type.interface.ts` - 资费列表
   - [x] `invoice.interface.ts` - 账单
   - [x] `recharge.interface.ts` - 充值响应
   - [x] `common.interface.ts` - 公共接口和参数
   - [x] `index.ts` - 统一导出

3. **服务实现**
   - [x] `unitel-api.service.ts` - 核心 API 封装
     - [x] Token 管理（被动刷新）
     - [x] 401 自动重试
     - [x] 5 个业务 API 方法
   - [x] `index.ts` - 统一导出

4. **模块配置**
   - [x] `unitel.module.ts` - 模块定义
   - [x] 在 `app.module.ts` 中注册

### ❌ 待开发（未来阶段）

1. **业务层**
   - [ ] DTO（请求/响应）
   - [ ] Enum（订单状态等）
   - [ ] Controller（业务端点）
   - [ ] OrderService（订单业务逻辑）

2. **测试**
   - [ ] 单元测试（需要 Mock）
   - [ ] 集成测试（需要数据库和 Redis）

---

## 🔐 配置说明

### 环境变量（.env）

```env
# Unitel API
UNITEL_USERNAME=your_username
UNITEL_PASSWORD=your_password
UNITEL_BASE_URL=https://api.unitel.mn/api/v1
```

### 配置文件（unitel.config.ts）

```typescript
export default registerAs('unitel', () => ({
  username: process.env.UNITEL_USERNAME,
  password: process.env.UNITEL_PASSWORD,
  baseUrl: process.env.UNITEL_BASE_URL || 'https://api.unitel.mn/api/v1',
  timeout: 30000,          // 30秒超时
  retryAttempts: 3,        // 最大重试次数（未使用）
  tokenKey: 'unitel:access_token',
  tokenTTL: 3600,          // 参考值（实际不使用固定TTL）
}));
```

---

## 🎯 设计优势

### 1. 精简高效
- 只包含必要的文件和代码
- 无过度设计
- 代码量少，易于理解

### 2. 被动刷新策略
- 不依赖固定 TTL
- 只在真正过期（401）时才刷新 Token
- 节省不必要的 API 调用

### 3. 职责单一
- 只负责 API 封装，不处理业务逻辑
- 可被其他服务复用（如订单服务、管理后台）

### 4. 自动重试机制
- 401 自动清除缓存并重试
- 防止无限循环（retryOn401 标志）

### 5. 类型安全
- 完整的 TypeScript 接口定义
- 编译时类型检查
- IDE 智能提示

---

## 📝 使用示例（未来业务层）

```typescript
// 在订单服务中使用
@Injectable()
export class UnitelOrderService {
  constructor(
    private readonly unitelApiService: UnitelApiService,
  ) {}

  async getServiceTypes(msisdn: string) {
    // 调用 API 服务
    const response = await this.unitelApiService.getServiceType(msisdn);

    // 处理业务逻辑...
    return response;
  }
}
```

---

## ⚠️ 注意事项

### 1. 环境要求
- 需要配置正确的 Unitel API 凭证
- 需要 Redis 服务运行（用于 Token 缓存）
- 需要网络访问 Unitel API

### 2. 错误处理
- 401 错误：自动重试 1 次
- 其他错误：抛出异常，由调用方处理
- 建议在业务层添加更详细的错误处理

### 3. 日志记录
- 使用 NestJS Logger
- 记录关键操作（Token 获取、API 调用、错误）
- 生产环境建议调整日志级别

### 4. 测试建议
- 单元测试：Mock HttpService 和 RedisService
- 集成测试：使用真实 API（测试环境凭证）
- E2E 测试：完整业务流程

---

## 🔗 相关文档

- [项目总览](./PROJECT_OVERVIEW.md)
- [最佳实践](./BEST_PRACTICES.md)
- [Unitel API 文档](/root/unitel_api.md)
- [Prisma Schema](../prisma/schema.prisma)

---

## 📅 更新日志

- **2025-10-22**：完成 Unitel API 模块封装
  - 创建接口定义
  - 实现 UnitelApiService
  - 被动刷新 Token 策略
  - 模块注册完成

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-22
**状态**: ✅ API 层完成，业务层待开发
