# Unitel API 服务模块

## 概述

Unitel 运营商 API 集成模块，提供完整的话费充值、流量充值、账单查询等功能。

## 目录结构

```
unitel/
├── config/                          # 配置文件
│   └── unitel.config.ts            # API 基础配置
├── controllers/                     # 控制器（待实现）
├── dto/                            # 数据传输对象
│   ├── auth-response.dto.ts        # Token 响应
│   ├── service-type-*.dto.ts       # 资费列表
│   ├── invoice-*.dto.ts            # 后付费账单
│   ├── recharge-*.dto.ts           # 充值话费
│   ├── data-package-*.dto.ts       # 充值流量
│   ├── payment-*.dto.ts            # 支付账单
│   ├── vat-info.dto.ts             # VAT 发票信息
│   └── index.ts                    # 统一导出
├── enums/                          # 枚举定义
│   └── unitel-service-type.enum.ts # 服务类型枚举
├── services/                       # 服务层
│   ├── unitel-auth.service.ts      # Token 管理服务
│   └── unitel-api.service.ts       # 核心 API 服务
└── unitel.module.ts                # 模块定义
```

## 核心服务

### UnitelApiService

提供 5 个核心 API 方法：

#### 1. 获取资费列表

```typescript
async getServiceType(
  dto: ServiceTypeRequestDto,
  username: string,
  password: string
): Promise<ServiceTypeResponseDto>
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
- 所有号码都可以调用，返回格式一致

#### 2. 获取后付费账单

```typescript
async getInvoice(
  dto: InvoiceRequestDto,
  username: string,
  password: string
): Promise<InvoiceResponseDto>
```

**说明：**
- 查询后付费账单信息
- 所有号码都可以调用（预付费/后付费）
- 预付费号码的某些字段可能为空

#### 3. 充值话费

```typescript
async rechargeBalance(
  dto: RechargeRequestDto,
  username: string,
  password: string
): Promise<RechargeResponseDto>
```

**说明：**
- 使用 `card` 字段指定充值套餐代码
- 返回包含完整 VAT 发票信息
- VAT 信息应完整保存到数据库

#### 4. 充值流量

```typescript
async rechargeDataPackage(
  dto: DataPackageRequestDto,
  username: string,
  password: string
): Promise<DataPackageResponseDto>
```

**说明：**
- 使用 `package` 字段指定流量包代码
- 返回包含完整 VAT 发票信息
- VAT 信息应完整保存到数据库

#### 5. 支付后付费账单

```typescript
async payInvoice(
  dto: PaymentRequestDto,
  username: string,
  password: string
): Promise<PaymentResponseDto>
```

**说明：**
- 支付后付费账单
- 响应格式待确认（文档中标注为"暂时未知"）

## Token 管理

### UnitelAuthService

自动管理 API Token 的获取、缓存和刷新：

- **Token 缓存**: 自动缓存有效 token（默认 1 小时）
- **自动刷新**: Token 过期前 5 分钟自动刷新
- **401 重试**: 遇到 401 错误自动清除缓存并重试
- **线程安全**: 支持并发请求

## 使用示例

### 在其他模块中使用

1. 导入 UnitelModule：

```typescript
import { Module } from '@nestjs/common';
import { UnitelModule } from './modules/operators/unitel/unitel.module';

@Module({
  imports: [UnitelModule],
  // ...
})
export class YourModule {}
```

2. 注入服务：

```typescript
import { Injectable } from '@nestjs/common';
import { UnitelApiService } from './modules/operators/unitel/services/unitel-api.service';
import { ServiceTypeRequestDto } from './modules/operators/unitel/dto';

@Injectable()
export class YourService {
  constructor(private readonly unitelApi: UnitelApiService) {}

  async getPackages(msisdn: string) {
    const username = 'your-username';
    const password = 'your-password';

    const result = await this.unitelApi.getServiceType(
      { msisdn, info: '1' },
      username,
      password
    );

    return {
      cards: result.service.cards,  // 话费套餐
      data: result.service.data,    // 流量套餐
    };
  }
}
```

### 充值话费示例

```typescript
import { RechargeRequestDto } from './modules/operators/unitel/dto';

async recharge(msisdn: string, cardCode: string, amount: string) {
  const dto: RechargeRequestDto = {
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

  const result = await this.unitelApi.rechargeBalance(
    dto,
    username,
    password
  );

  // 保存 VAT 信息到数据库
  await this.saveVatInfo(result.vat);

  return result;
}
```

### 充值流量示例

```typescript
import { DataPackageRequestDto } from './modules/operators/unitel/dto';

async rechargeData(msisdn: string, packageCode: string, amount: string) {
  const dto: DataPackageRequestDto = {
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

  const result = await this.unitelApi.rechargeDataPackage(
    dto,
    username,
    password
  );

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

## 错误处理

服务会自动处理以下错误：

- **401 Unauthorized**: 自动清除 token 缓存并重试（最多 3 次）
- **Timeout**: 30 秒超时，抛出 REQUEST_TIMEOUT 异常
- **5xx Server Error**: 抛出 SERVICE_UNAVAILABLE 异常
- **其他错误**: 抛出 BAD_REQUEST 异常

## 配置

在 `config/unitel.config.ts` 中修改配置：

```typescript
export const UNITEL_CONFIG = {
  baseUrl: 'https://api.unitel.mn/api/v1',
  timeout: 30000,        // 请求超时时间（毫秒）
  retryAttempts: 3,      // 401 错误重试次数
  retryDelay: 1000,      // 重试延迟（毫秒）
};
```

## 注意事项

1. **凭证管理**: username 和 password 应该从配置服务或环境变量中获取，不要硬编码
2. **VAT 信息**: 充值操作返回的 VAT 信息应完整保存到数据库
3. **套餐代码**: 使用 `getServiceType` 获取最新的套餐代码列表
4. **错误处理**: 所有 API 调用都应该有适当的错误处理
5. **日志记录**: 服务会自动记录关键操作和错误日志

## API 文档参考

详细的 API 文档请参考 Unitel 官方文档。
