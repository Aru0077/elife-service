# eLife-Service 设计决策文档

## 📋 文档目的

本文档记录 elife-service 项目中的重要设计决策和技术选型,帮助团队理解为什么采用当前的架构方案。

**更新日期**: 2025-10-24

---

## 🎯 核心设计决策

### 决策1: 订单模型设计 - 每个运营商独立订单表

#### ❓ 问题背景

项目需要支持多个蒙古国运营商(Unitel, Ondo, Mobicom 等),面临两种订单设计方案:

**方案A: 独立订单模型**
```prisma
model UnitelOrder { ... }
model OndoOrder { ... }
model MobicomOrder { ... }
```

**方案B: 统一订单模型**
```prisma
model Order {
  operator String  // "unitel" | "ondo" | "mobicom"
  // 通用字段...
  // 运营商特有字段(JSON 或多个可选字段)
}
```

#### ✅ 最终选择: 方案A - 独立订单模型

#### 📊 决策依据

**业务优先级分析:**
- ✅ **故障隔离** (最高优先级) - 一个运营商挂不影响其他
- ✅ **快速扩展** (高优先级) - 添加新运营商无需改动现有代码
- 🔶 **统一查询** (中优先级) - 跨运营商统计不频繁
- 🔶 **代码复用** (中优先级) - 可接受一定重复

**技术因素:**
1. **运营商字段差异未知** - 目前只熟悉 Unitel API,其他运营商差异不明确
2. **扩展时间充足** - 半年以上才添加第二个运营商,有时间优化
3. **数据库隔离天然故障隔离** - 一个表的问题不影响其他表

#### 🏆 方案优势

##### ✅ 独立订单模型的优势

1. **完全故障隔离**
   ```
   Unitel API 挂掉 → UnitelOrder 表无法写入
   Ondo API 正常 → OndoOrder 表正常运行 ✅
   用户仍可使用 Ondo 充值
   ```

2. **零耦合扩展**
   ```bash
   # 添加新运营商的步骤
   1. 复制 unitel/ 目录 → mobicom/
   2. 创建 MobicomOrder 表
   3. 修改业务逻辑(独立)
   4. 注册到 AppModule

   # 无需修改:
   - UnitelOrder 相关代码 ✅
   - OndoOrder 相关代码 ✅
   - 共享模块(Payment, Queue) ✅
   ```

3. **独立部署可能**
   ```
   未来可拆分为微服务:
   - unitel-service (UnitelOrder + UnitelAPI)
   - ondo-service (OndoOrder + OndoAPI)
   - payment-service (共享)
   ```

4. **数据库性能**
   ```sql
   -- 独立表: 查询快(无需 operator 过滤)
   SELECT * FROM unitel_orders WHERE openid = 'xxx';

   -- 统一表: 需要额外过滤
   SELECT * FROM orders WHERE openid = 'xxx' AND operator = 'unitel';
   ```

5. **灵活的字段设计**
   ```prisma
   // Unitel 特有字段(无负担)
   model UnitelOrder {
     svId String?   // Unitel 服务ID
     seq String?    // Unitel 序列号
   }

   // Ondo 特有字段(不影响 Unitel)
   model OndoOrder {
     ondoTransactionId String?
     ondoStatus String?
   }
   ```

##### ⚠️ 统一订单模型的劣势

1. **字段冗余**
   ```prisma
   model Order {
     operator String
     // Unitel 特有(Ondo 订单为 NULL)
     svId String?
     seq String?
     // Ondo 特有(Unitel 订单为 NULL)
     ondoTransactionId String?
     ondoStatus String?
     // 或者使用 JSON(失去类型安全)
     operatorData Json?
   }
   ```

2. **耦合度高**
   ```typescript
   // 添加新运营商需要修改共享代码
   updateOrderStatus(orderId: string, operator: 'unitel' | 'ondo' | 'mobicom') {
     if (operator === 'unitel') {
       // Unitel 逻辑
     } else if (operator === 'ondo') {
       // Ondo 逻辑
     } else if (operator === 'mobicom') { // ⬅️ 新增需修改
       // Mobicom 逻辑
     }
   }
   ```

3. **故障传播风险**
   ```
   统一表结构变更(添加索引/字段)
   → 影响所有运营商
   → 需要回归测试所有运营商
   → 高风险
   ```

#### 📋 实施状态

✅ **已完成:**
- UnitelOrder 表设计(含索引优化)
- Unitel 模块完整实现(Controller/Service/DTO/Enums)
- Ondo 目录结构已创建(待实现)

🔄 **下一步:**
- 观察 Unitel 运营 3-6 个月
- 收集实际问题和优化点
- 在添加第二个运营商前重新评估设计

#### 🔄 未来优化可能

**如果未来需要统一查询:**

```typescript
// 解决方案: 聚合服务(不改变数据库设计)
@Injectable()
export class OrderAggregationService {
  async getAllUserOrders(openid: string) {
    const [unitelOrders, ondoOrders] = await Promise.all([
      this.unitelOrderService.findUserOrders(openid),
      this.ondoOrderService.findUserOrders(openid),
    ]);

    // 合并 + 排序
    return [...unitelOrders, ...ondoOrders]
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}
```

**优势:**
- 不改变数据库隔离设计 ✅
- 提供统一查询接口 ✅
- 性能可接受(两个独立查询并行) ✅

---

### 决策2: 资费缓存与价格防篡改机制

#### ❓ 问题背景

用户通过前端获取资费列表,选择套餐后创建订单。如何防止前端篡改价格?

**风险场景:**
```javascript
// 前端恶意修改请求
fetch('/api/orders', {
  body: JSON.stringify({
    packageCode: 'SD5000',  // 价格应为 5000 MNT
    amountMnt: 1,           // ⚠️ 篡改为 1 MNT
    amountCny: 0.01         // ⚠️ 篡改为 0.01 CNY
  })
});
```

#### ✅ 最终方案: Redis 缓存 + 后端价格验证

#### 🔒 核心设计

**原则: 前端只传业务标识,价格由后端验证**

```typescript
// DTO 不接收价格字段
export class CreateOrderDto {
  @IsString()
  msisdn: string;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsString()
  packageCode: string;  // ✅ 只传套餐代码

  // ❌ 不接收 amountMnt, amountCny
}

// Service 从缓存验证价格
async createOrder(openid: string, dto: CreateOrderDto) {
  // 后端查找真实价格
  const packageDetail = await this.unitelApiService.findPackageByCode({
    packageCode: dto.packageCode,
    msisdn: dto.msisdn,
    openid,
    orderType: dto.orderType,
  });

  // 使用后端验证的价格
  const order = await this.prisma.unitelOrder.create({
    data: {
      amountMnt: packageDetail.price,  // ⬅️ 后端价格
      amountCny: packageDetail.price / exchangeRate,
      // ...
    },
  });
}
```

#### 🔄 完整流程

```
1. 用户获取资费列表
   POST /api/operators/unitel/service-types
   → 后端调用 Unitel API
   → 缓存到 Redis: unitel:service_types:{openid}:{msisdn}
   → TTL: 5分钟
   → 返回资费列表

2. 用户选择套餐,创建订单
   POST /api/operators/unitel/orders
   Body: { msisdn, orderType, packageCode }  // ⬅️ 只传 code
   → 后端从相同 Redis 缓存查找 packageCode
   → 验证套餐存在 + 获取真实价格
   → 创建订单(使用后端验证的价格)
```

#### ✅ 方案优势

1. **防止价格篡改**
   - 前端无法传入价格字段(DTO 验证)
   - 价格来自可信源(Redis 缓存或第三方 API)

2. **减少 API 调用**
   - 5 分钟内重复查询使用缓存
   - 创建订单时命中缓存(相同缓存键)

3. **缓存键一致性**
   ```typescript
   // 获取资费 (unitel-service.controller.ts)
   getCachedServiceTypes(msisdn, openid)
   → 缓存键: unitel:service_types:{openid}:{msisdn}

   // 创建订单 (unitel-order.service.ts → findPackageByCode)
   getCachedServiceTypes(msisdn, openid)
   → 缓存键: unitel:service_types:{openid}:{msisdn}

   ✅ 相同缓存键 → 确保价格一致
   ```

4. **合理的 TTL**
   - 5 分钟 = 300 秒
   - 覆盖用户从浏览到下单的时间
   - 不会太长(避免价格过时)

#### ⚠️ 已修复的问题

**问题: 缓存键不一致(已修复)**

```typescript
// ❌ 修复前: unitel-service.controller.ts
async getServiceTypes(@Body() dto: GetServiceTypeDto) {
  return this.unitelApiService.getServiceType(dto.msisdn);
  // 缓存键: unitel:service_types:undefined:{msisdn}
  // ⬆️ openid 为 undefined!
}

// ✅ 修复后: unitel-service.controller.ts
async getServiceTypes(
  @CurrentUser('openid') openid: string,  // ⬅️ 添加装饰器
  @Body() dto: GetServiceTypeDto,
) {
  return this.unitelApiService.getCachedServiceTypes(dto.msisdn, openid);
  // 缓存键: unitel:service_types:{openid}:{msisdn} ✅
}
```

**修复措施:**
1. ✅ 创建 `@CurrentUser` 装饰器
2. ✅ 修改 Controller 使用 `@CurrentUser('openid')` 提取 openid
3. ✅ 调用 `getCachedServiceTypes` 而不是 `getServiceType`
4. ✅ 确保缓存键格式一致

#### 📋 实施状态

✅ **已完成:**
- `@CurrentUser` 装饰器实现
- `unitel-service.controller.ts` 缓存键修复
- 缓存逻辑一致性验证
- 详细文档(`PRICE_CACHE_SECURITY.md`)

#### 🔍 验证方法

```bash
# 测试1: 检查 Redis 缓存键
redis-cli KEYS unitel:service_types:*
# 期望: unitel:service_types:{openid}:{msisdn}

# 测试2: 验证创建订单命中缓存
# 查看日志应显示: "使用缓存的资费列表: unitel:service_types:xxx"

# 测试3: 验证价格防篡改
# 前端传入错误价格 → 后端忽略 → 使用后端验证价格
```

#### 📚 备选方案(未采用)

**方案B: 每次创建订单都实时查询**

```typescript
// 不使用缓存,总是调用第三方 API
const packageDetail = await this.unitelApiService.getServiceType(msisdn);
```

**劣势:**
- ❌ 每次创建订单都调用第三方 API(可能有限流/收费)
- ❌ 响应速度慢
- ✅ 价格永远最新(优势)

**结论:** 不采用,因为:
- 运营商资费变动频率低(按天/周调整)
- 5 分钟缓存足够覆盖用户操作
- 缓存过期后会自动刷新

---

## 📊 设计决策矩阵

| 决策 | 方案 | 核心理由 | 权衡 |
|------|------|---------|------|
| 订单模型 | 独立表 | 故障隔离 + 快速扩展 | 跨运营商查询需聚合服务 |
| 缓存方案 | Redis 5分钟 | 防篡改 + 减少 API 调用 | 缓存过期需重新查询 |
| 价格验证 | 后端验证 | 前端不可信 | 前端不传价格字段 |
| 扩展策略 | 模板复制 | 零耦合,快速扩展 | 一定代码重复 |

---

## 🔄 未来重新评估时机

### 订单模型设计
- ⏰ **时机:** 添加第二个运营商(Ondo/Mobicom)前
- 📋 **评估点:**
  - 两个运营商字段差异程度
  - 跨运营商查询需求频率
  - Unitel 运营 6 个月的实际问题

### 缓存机制
- ⏰ **时机:** 上线后 1-2 个月
- 📋 **评估点:**
  - 缓存命中率(监控指标)
  - 第三方 API 调用频率
  - 是否有价格变动导致的问题

---

## 📚 相关文档

- [资费缓存与价格防篡改](./PRICE_CACHE_SECURITY.md) - 详细技术实现
- [Unitel 订单模块总结](./unitel-order-module-summary.md) - 订单模块实现
- [架构设计文档](./architecture-plan.md) - 整体架构
- [模块结构设计](./MODULE_STRUCTURE_DESIGN.md) - 目录结构规范

---

## 🎯 决策原则总结

1. **业务优先** - 优先满足核心业务需求(故障隔离)
2. **保持简单** - 避免过度设计,按需扩展
3. **安全第一** - 价格验证等安全机制不妥协
4. **可观察性** - 设计支持监控和调试
5. **渐进式优化** - 先运行,再根据实际情况优化

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-24
**维护者**: 开发团队
**审核状态**: ✅ 已通过技术评审
