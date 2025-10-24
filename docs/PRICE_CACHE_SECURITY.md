# 资费缓存与价格防篡改机制

## 📋 文档目的

本文档详细说明 elife-service 项目中资费缓存的设计思路,以及如何通过缓存机制防止前端篡改价格。

---

## 🎯 核心问题

### 问题1: 为什么需要缓存?
1. **减少第三方 API 调用** - Unitel API 可能有限流或收费
2. **提升响应速度** - 资费数据相对稳定,无需每次实时查询
3. **防止价格篡改** - 后端缓存作为价格验证的可信源

### 问题2: 为什么不直接相信前端传来的价格?
前端传来的任何数据都可能被篡改(例如通过浏览器开发者工具修改请求)。如果直接使用前端价格:
- ❌ 用户可能将 5000 MNT 的套餐改成 1 MNT
- ❌ 微信支付金额与实际套餐价格不符
- ❌ 造成资金损失

---

## 🔒 防篡改机制设计

### 核心思路: 后端验证价格

```
前端获取资费列表
    ↓
后端调用第三方 API + 缓存到 Redis (5分钟)
    ↓
前端展示资费给用户
    ↓
用户选择套餐,提交订单(只传 packageCode)
    ↓
后端从缓存中查找 packageCode 对应的真实价格
    ↓
创建订单时使用后端查找到的价格(不使用前端传来的价格)
```

**关键点:** 前端只传 `packageCode`,价格由后端从缓存查找,确保价格不被篡改。

---

## 📐 技术实现

### 1. 缓存键设计

```typescript
// Redis 缓存键格式
const cacheKey = `unitel:service_types:{openid}:{msisdn}`;

// 示例
"unitel:service_types:oABC123:99887766"
```

**为什么包含 openid?**
- 不同用户的资费可能不同(例如 VIP 用户、地区差异)
- 隔离不同用户的缓存,避免混淆

**为什么包含 msisdn?**
- 不同手机号的资费可能不同(预付费 vs 后付费)

### 2. 缓存时机

#### 场景1: 前端获取资费列表

```typescript
// unitel-service.controller.ts
@Post('service-types')
async getServiceTypes(
  @CurrentUser('openid') openid: string, // ⬅️ 从 JWT 自动提取
  @Body() dto: GetServiceTypeDto,        // { msisdn: "99887766" }
) {
  // 调用带缓存的方法
  return this.unitelApiService.getCachedServiceTypes(dto.msisdn, openid);
}
```

**执行流程:**
1. 检查 Redis 键: `unitel:service_types:{openid}:{msisdn}`
2. 如果存在 → 直接返回缓存(⚡ 快速)
3. 如果不存在 → 调用 Unitel API,缓存 5 分钟

#### 场景2: 创建订单时验证价格

```typescript
// unitel-order.service.ts
async createOrder(openid: string, dto: CreateOrderDto) {
  // 1. 根据 packageCode 查找套餐详情(从缓存或 API)
  const packageDetail = await this.unitelApiService.findPackageByCode({
    packageCode: dto.packageCode,  // 前端只传 code,不传 price
    msisdn: dto.msisdn,
    openid,
    orderType: dto.orderType,
  });

  // 2. 使用后端查找到的价格创建订单
  const order = await this.prisma.unitelOrder.create({
    data: {
      // ...
      amountMnt: packageDetail.price, // ⬅️ 使用后端验证的价格
      packageCode: packageDetail.code,
      packageName: packageDetail.name,
      // ...
    },
  });
}
```

**执行流程:**
1. 调用 `findPackageByCode` 查找套餐
2. 内部调用 `getCachedServiceTypes(msisdn, openid)` (相同缓存键!)
3. 从资费列表中查找 `packageCode` 对应的套餐
4. 返回真实价格 `packageDetail.price`
5. 创建订单时使用这个价格

### 3. 缓存键一致性验证

**关键点:** 两个场景使用**相同的缓存键**

| 场景 | 调用路径 | 缓存键 |
|------|---------|--------|
| 获取资费 | Controller → `getCachedServiceTypes(msisdn, openid)` | `unitel:service_types:{openid}:{msisdn}` |
| 创建订单 | Service → `findPackageByCode` → `getCachedServiceTypes(msisdn, openid)` | `unitel:service_types:{openid}:{msisdn}` |

✅ **缓存键相同 → 确保价格来自同一份数据源 → 防止篡改**

---

## 🔄 完整流程示例

### 用户操作流程

```
步骤1: 用户输入手机号 99887766,点击"获取资费"
    ↓
前端: POST /api/operators/unitel/service-types
Body: { "msisdn": "99887766" }
Header: Authorization: Bearer {jwt_token}
    ↓
后端: unitel-service.controller.ts
  - 从 JWT 提取 openid = "oABC123"
  - 调用 getCachedServiceTypes("99887766", "oABC123")
  - Redis 键: "unitel:service_types:oABC123:99887766"
  - 首次请求 → 调用 Unitel API → 缓存 5 分钟
  - 返回资费列表:
    {
      service: {
        cards: {
          day: [
            { code: "SD5000", name: "5000₮", price: 5000, ... },
            { code: "SD10000", name: "10000₮", price: 10000, ... }
          ]
        }
      }
    }
    ↓
前端: 展示资费列表(自动换算为人民币)
  - SD5000: ¥11.36 (5000 / 440)
  - SD10000: ¥22.73 (10000 / 440)
    ↓
步骤2: 用户选择 SD5000,点击"创建订单"
    ↓
前端: POST /api/operators/unitel/orders
Body: {
  "msisdn": "99887766",
  "orderType": "balance",
  "packageCode": "SD5000"  // ⬅️ 只传 code,不传 price
}
    ↓
后端: unitel-order.controller.ts → unitel-order.service.ts
  - createOrder(openid="oABC123", dto)
  - 调用 findPackageByCode({
      packageCode: "SD5000",
      msisdn: "99887766",
      openid: "oABC123",
      orderType: "balance"
    })
  - 内部调用 getCachedServiceTypes("99887766", "oABC123")
  - 使用相同 Redis 键: "unitel:service_types:oABC123:99887766"
  - 命中缓存! 直接从 Redis 返回资费列表
  - 在列表中查找 code="SD5000" 的套餐
  - 找到: { code: "SD5000", price: 5000, ... }
  - 验证通过! 使用 price=5000 创建订单
    ↓
后端: 返回订单信息
{
  "orderNo": "UNI1729700000ABC12345",
  "packageCode": "SD5000",
  "amountMnt": 5000,  // ⬅️ 后端验证的价格
  "amountCny": 11.36,
  "paymentStatus": "unpaid",
  ...
}
```

### 🚨 攻击场景分析

**场景: 恶意用户尝试篡改价格**

```
步骤1: 黑客获取资费列表(正常流程)
    ↓
步骤2: 黑客修改请求,尝试传入低价
前端(修改后): POST /api/operators/unitel/orders
Body: {
  "msisdn": "99887766",
  "orderType": "balance",
  "packageCode": "SD5000",
  "amountMnt": 1,           // ⬅️ 篡改价格(无效!)
  "amountCny": 0.01          // ⬅️ 篡改价格(无效!)
}
    ↓
后端: unitel-order.service.ts
  - CreateOrderDto 中根本没有 amountMnt/amountCny 字段 ✅
  - 后端从缓存查找 SD5000 的真实价格 = 5000
  - 创建订单时使用 price=5000(忽略前端传来的价格)
    ↓
结果: 攻击失败! 订单价格为 5000 MNT
```

**关键防御措施:**
1. DTO 不接收价格字段 - `CreateOrderDto` 只有 `msisdn, orderType, packageCode`
2. 价格由后端查找 - 从可信缓存源获取
3. 缓存验证 - 确保价格来自 5 分钟内的第三方 API 数据

---

## ⏱️ 缓存 TTL 设计

### 为什么是 5 分钟?

```typescript
private readonly CACHE_TTL = 300; // 5分钟(秒)
```

**考虑因素:**
- ✅ **资费变动频率低** - 运营商资费通常按天/周调整,不是实时变化
- ✅ **用户决策时间** - 用户从查看资费到创建订单通常在几分钟内
- ✅ **减少 API 调用** - 5 分钟内多次请求只调用一次第三方 API
- ⚠️ **价格时效性** - 如果超过 5 分钟,会重新获取最新价格

**极端情况处理:**
- 如果用户在第 4 分 59 秒获取资费,在第 5 分 01 秒创建订单
- 缓存过期 → 创建订单时会重新调用 API 获取最新价格
- **这是可接受的行为** - 确保价格准确性优先

---

## 🔍 验证方法

### 测试缓存是否生效

#### 测试1: 验证缓存键

```bash
# 1. 前端获取资费
curl -X POST http://localhost:3000/api/operators/unitel/service-types \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"msisdn": "99887766"}'

# 2. 检查 Redis 缓存
redis-cli
> KEYS unitel:service_types:*
"unitel:service_types:oABC123:99887766"  # ✅ 缓存已创建

> TTL unitel:service_types:oABC123:99887766
(integer) 298  # ✅ TTL 约为 300 秒(5分钟)

> GET unitel:service_types:oABC123:99887766
"{\"service\":{...}}"  # ✅ 完整的资费数据
```

#### 测试2: 验证创建订单使用缓存

```bash
# 1. 创建订单(在 5 分钟内)
curl -X POST http://localhost:3000/api/operators/unitel/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "msisdn": "99887766",
    "orderType": "balance",
    "packageCode": "SD5000"
  }'

# 2. 检查日志
# ✅ 应该看到: "使用缓存的资费列表: unitel:service_types:oABC123:99887766"
# ❌ 不应该看到: "缓存miss,正在从第三方获取资费列表"
```

#### 测试3: 验证价格防篡改

```bash
# 1. 尝试传入错误的价格字段(DTO 会忽略)
curl -X POST http://localhost:3000/api/operators/unitel/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "msisdn": "99887766",
    "orderType": "balance",
    "packageCode": "SD5000",
    "amountMnt": 1,
    "amountCny": 0.01
  }'

# 2. 检查返回的订单
{
  "orderNo": "UNI...",
  "amountMnt": 5000,  # ✅ 后端验证的价格,不是 1
  "amountCny": 11.36  # ✅ 后端验证的价格,不是 0.01
}
```

---

## 📊 代码文件关系图

```
前端请求获取资费
    ↓
┌─────────────────────────────────────────────┐
│ unitel-service.controller.ts                │
│ - getServiceTypes(@CurrentUser openid, dto) │
│ - 提取 openid + msisdn                      │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ unitel-api.service.ts                       │
│ - getCachedServiceTypes(msisdn, openid)     │
│ - 缓存键: unitel:service_types:{openid}:{msisdn} │
│ - TTL: 5分钟                                │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Redis                                       │
│ Key: unitel:service_types:oABC123:99887766  │
│ Value: { service: { cards: [...], data: [...] } } │
│ TTL: 300 秒                                 │
└─────────────────────────────────────────────┘

前端创建订单
    ↓
┌─────────────────────────────────────────────┐
│ unitel-order.controller.ts                  │
│ - createOrder(@CurrentUser openid, dto)     │
│ - dto 只包含: msisdn, orderType, packageCode│
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ unitel-order.service.ts                     │
│ - createOrder(openid, dto)                  │
│ - 调用 findPackageByCode(...)              │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ unitel-api.service.ts                       │
│ - findPackageByCode(packageCode, msisdn, openid) │
│ - 调用 getCachedServiceTypes(msisdn, openid)│
│ - 使用相同缓存键!                           │
│ - 从缓存中查找 packageCode 对应的价格       │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ Redis (命中缓存!)                           │
│ Key: unitel:service_types:oABC123:99887766  │
│ 返回套餐详情: { code: "SD5000", price: 5000 }│
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ unitel-order.service.ts                     │
│ - 使用 price=5000 创建订单                  │
│ - 保存到数据库                              │
└─────────────────────────────────────────────┘
```

---

## ⚠️ 注意事项

### 1. 缓存过期后的行为
- 如果用户在缓存过期后创建订单
- 系统会重新调用 Unitel API 获取最新资费
- **可能出现价格变动** - 这是正确的行为(保证价格准确)

### 2. 不同用户之间的缓存隔离
- 每个用户的缓存是独立的(包含 openid)
- 用户 A 的缓存不会影响用户 B

### 3. 缓存失效场景
- Redis 重启 → 缓存全部清空 → 重新调用 API
- 手动删除缓存 → 重新调用 API
- TTL 过期 → 重新调用 API

### 4. CreateOrderDto 不接收价格字段
```typescript
// ✅ 正确的 DTO 设计
export class CreateOrderDto {
  @IsString()
  msisdn: string;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsString()
  packageCode: string;

  // ❌ 不包含 amountMnt, amountCny
}
```

---

## 🎯 最佳实践总结

### ✅ DO (推荐做法)

1. **前端只传业务标识** - 传 `packageCode`,不传 `price`
2. **后端验证所有价格** - 从可信源(缓存或 API)获取
3. **使用一致的缓存键** - 确保前端和创建订单使用相同缓存
4. **合理设置 TTL** - 平衡性能和准确性(当前 5 分钟)
5. **记录详细日志** - 便于排查缓存命中情况

### ❌ DON'T (避免做法)

1. ❌ 不要在 DTO 中接收价格字段
2. ❌ 不要直接使用前端传来的价格
3. ❌ 不要在不同场景使用不同的缓存键
4. ❌ 不要设置过长的 TTL(可能导致价格过时)
5. ❌ 不要忽略缓存失效的处理

---

## 📚 相关文档

- [Unitel API 模块设计](./UNITEL_API_MODULE.md)
- [订单模块总结](./unitel-order-module-summary.md)
- [架构设计文档](./architecture-plan.md)

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-24
**维护者**: 开发团队
