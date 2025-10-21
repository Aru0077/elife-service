# Unitel API 服务模块

## 概述

Unitel 运营商 API 集成模块，提供完整的话费充值、流量充值、账单查询等功能。

## 目录结构

```
unitel/
├── config/
│   └── unitel.config.ts            # Unitel 配置（凭证、端点、Redis）
├── dto/
│   ├── auth.dto.ts                 # 认证相关 DTO
│   ├── service.dto.ts              # 资费列表 DTO
│   ├── recharge.dto.ts             # 充值相关 DTO（话费、流量、VAT）
│   ├── invoice.dto.ts              # 后付费账单 DTO
│   ├── payment.dto.ts              # 支付账单 DTO
│   └── index.ts
├── enums/
│   └── unitel.enum.ts              # 响应码枚举
├── services/
│   ├── unitel-token.service.ts     # Token 管理（Redis）
│   ├── unitel-api.service.ts       # API 服务
│   └── index.ts
├── unitel.module.ts
└── README.md
```

## 核心功能

### UnitelApiService - API 服务

提供 5 个核心 API 方法：

#### 1. 获取资费列表

```typescript
async getServiceType(dto: GetServiceTypeRequestDto): Promise<ServiceTypeResponseDto>
```

**说明：**
- 返回完整的套餐列表（话费 + 流量）
- `service.cards` - 话费套餐
  - `cards.day` - 可续租期话费
  - `cards.noday` - 纯话费
  - `cards.special` - 特殊套餐
- `service.data` - 流量套餐
  - `data.data` - 流量包
  - `data.days` - 按天流量包
  - `data.entertainment` - 专用流量（游戏、音乐等）

#### 2. 获取后付费账单

```typescript
async getInvoice(dto: GetInvoiceRequestDto): Promise<InvoiceResponseDto>
```

**说明：**
- 查询后付费账单信息
- 所有号码都可以调用（预付费/后付费）
- 预付费号码的某些字段可能为空

#### 3. 充值话费

```typescript
async rechargeBalance(dto: RechargeBalanceRequestDto): Promise<RechargeBalanceResponseDto>
```

**说明：**
- 使用 `card` 字段指定充值套餐代码
- 返回包含完整 VAT 发票信息
- VAT 信息应完整保存到数据库

#### 4. 充值流量

```typescript
async rechargeData(dto: RechargeDataRequestDto): Promise<RechargeDataResponseDto>
```

**说明：**
- 使用 `package` 字段指定流量包代码
- 返回包含完整 VAT 发票信息
- VAT 信息应完整保存到数据库

#### 5. 支付后付费账单

```typescript
async payInvoice(dto: PayInvoiceRequestDto): Promise<PayInvoiceResponseDto>
```

**说明：**
- 支付后付费账单
- 响应格式待补充

### UnitelTokenService - Token 管理

基于 Redis 的 Token 管理服务：

- **Redis 缓存**: Token 存储在 Redis 中，支持多实例部署
- **自动获取**: Token 不存在时自动调用 API 获取
- **401 处理**: 收到 401 错误时清除 Redis 中的 Token
- **被动刷新**: 不自动刷新，仅在 401 时重新获取

## 配置说明

### 环境变量配置

在 `.env` 文件中配置：

```bash
# Unitel API
UNITEL_USERNAME=your_username
UNITEL_PASSWORD=your_password
UNITEL_BASE_URL=https://api.unitel.mn/api/v1

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 配置结构

配置使用 NestJS 的 `registerAs` 方式：

```typescript
// unitel.config.ts
export default registerAs('unitel', () => ({
  username: process.env.UNITEL_USERNAME,
  password: process.env.UNITEL_PASSWORD,
  baseUrl: process.env.UNITEL_BASE_URL,
  timeout: 30000,
  retryAttempts: 3,
  tokenKey: 'unitel:access_token',
  tokenTTL: 3600,
}));
```

## 使用示例

### 在其他模块中使用

1. **导入 UnitelModule**：

```typescript
import { Module } from '@nestjs/common';
import { UnitelModule } from './modules/operators/unitel/unitel.module';

@Module({
  imports: [UnitelModule],
  // ...
})
export class YourModule {}
```

2. **注入服务**：

```typescript
import { Injectable } from '@nestjs/common';
import { UnitelApiService } from './modules/operators/unitel/services';
import { GetServiceTypeRequestDto } from './modules/operators/unitel/dto';

@Injectable()
export class YourService {
  constructor(private readonly unitelApi: UnitelApiService) {}

  async getPackages(msisdn: string) {
    // 不需要传递用户名密码，从配置自动获取
    const result = await this.unitelApi.getServiceType({
      msisdn,
      info: '1',
    });

    return {
      cards: result.service.cards,  // 话费套餐
      data: result.service.data,    // 流量套餐
    };
  }
}
```

### 充值话费示例

```typescript
import { RechargeBalanceRequestDto } from './modules/operators/unitel/dto';

async recharge(msisdn: string, cardCode: string, amount: string) {
  const dto: RechargeBalanceRequestDto = {
    msisdn,
    card: cardCode,  // 例如: 'SD3000'
    vatflag: '1',
    vat_register_no: '',
    transactions: [
      {
        journal_id: 'unique-order-id',
        amount,
        description: 'Wechat payment',
        account: 'wechat-account',
      },
    ],
  };

  const result = await this.unitelApi.rechargeBalance(dto);

  // 保存 VAT 信息到数据库
  await this.saveVatInfo(result.vat);

  return result;
}
```

### 充值流量示例

```typescript
import { RechargeDataRequestDto } from './modules/operators/unitel/dto';

async rechargeData(msisdn: string, packageCode: string, amount: string) {
  const dto: RechargeDataRequestDto = {
    msisdn,
    package: packageCode,  // 例如: 'data3gb2d'
    vatflag: '1',
    vat_register_no: '',
    transactions: [
      {
        journal_id: 'unique-order-id',
        amount,
        description: 'Wechat payment',
        account: 'wechat-account',
      },
    ],
  };

  const result = await this.unitelApi.rechargeData(dto);

  // 保存 VAT 信息到数据库
  await this.saveVatInfo(result.vat);

  return result;
}
```

## VAT 发票信息

所有充值操作都会返回完整的 VAT 发票信息，包括：

- `billId` - 发票 ID
- `lottery` - 抽奖号码
- `qrData` - 二维码数据
- `amount`, `vat` - 金额和税额
- `stocks[]` - 商品明细
- 等其他字段

**重要**: 应将完整的 VAT 对象保存到数据库中。

## Redis Token 共享机制

```
[实例1] ──┐
[实例2] ──┼──> [Redis: unitel:access_token] ←─ 共享存储
[实例3] ──┘

- 任一实例获取 token → 存入 Redis
- 所有实例从 Redis 读取
- Token 过期后，任一实例重新获取并更新
```

**优势：**
- ✅ 支持多实例部署
- ✅ 减少 API 调用次数
- ✅ Token 集中管理

## 错误处理

服务会自动处理以下错误：

- **401 Unauthorized**: 自动清除 Redis Token 并重试（最多 3 次）
- **Timeout**: 30 秒超时，抛出 REQUEST_TIMEOUT 异常
- **5xx Server Error**: 抛出 SERVICE_UNAVAILABLE 异常
- **其他错误**: 抛出 BAD_REQUEST 异常

## API 端点配置

所有 API 端点在 `config/unitel.config.ts` 中统一配置：

```typescript
export const UNITEL_ENDPOINTS = {
  AUTH: '/auth',
  SERVICE_TYPE: '/service/servicetype',
  INVOICE: '/service/unitel',
  RECHARGE: '/service/recharge',
  DATA_PACKAGE: '/service/datapackage',
  PAYMENT: '/service/payment',
} as const;
```

## 注意事项

1. **凭证管理**: username 和 password 从环境变量读取，已在配置中处理
2. **VAT 信息**: 充值操作返回的 VAT 信息应完整保存到数据库
3. **套餐代码**: 使用 `getServiceType` 获取最新的套餐代码列表
4. **错误处理**: 所有 API 调用都有完善的错误处理机制
5. **日志记录**: 服务会自动记录关键操作和错误日志
6. **Redis 连接**: 确保 Redis 服务正常运行

## 技术栈

- **NestJS** - 框架
- **ioredis** - Redis 客户端
- **@nestjs/axios** - HTTP 客户端
- **class-validator** - DTO 验证
- **class-transformer** - DTO 转换

## 更新日志

### v2.0.0 (优化版)
- ✅ 基于 Redis 的 Token 管理（支持多实例）
- ✅ 配置从环境变量读取
- ✅ API 端点统一配置
- ✅ DTO 按业务重组（5个文件）
- ✅ 简化枚举（仅保留响应码）
- ✅ API 方法无需传递凭证
- ✅ 所有注释改为中文
