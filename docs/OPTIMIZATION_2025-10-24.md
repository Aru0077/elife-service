# 优化记录 - 2025-10-24

## 📋 优化摘要

本次优化修复了资费缓存机制的关键问题,并创建了详细的设计决策文档。

---

## 🐛 修复的问题

### 问题: 资费缓存键不一致导致价格验证失效

**症状:**
- 前端获取资费时缓存键为 `unitel:service_types:undefined:{msisdn}`
- 创建订单时缓存键为 `unitel:service_types:{openid}:{msisdn}`
- 缓存键不同 → 创建订单时缓存 miss → 重新调用第三方 API
- **价格防篡改机制失效**

**根本原因:**
`unitel-service.controller.ts` 没有从 JWT 提取 `openid`,导致 `openid` 为 `undefined`

---

## ✅ 修复措施

### 1. 创建 @CurrentUser 装饰器

**文件:** `src/modules/auth/user/decorators/current-user.decorator.ts`

```typescript
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    if (data) {
      return user?.[data]; // 返回指定字段
    }
    return user; // 返回整个用户对象
  },
);
```

**用法:**
```typescript
// 获取整个用户对象
@Get('profile')
getProfile(@CurrentUser() user: User) { ... }

// 只获取 openid
@Post('orders')
createOrder(@CurrentUser('openid') openid: string) { ... }
```

### 2. 修复 unitel-service.controller.ts

**变更前:**
```typescript
@Post('service-types')
async getServiceTypes(@Body() dto: GetServiceTypeDto) {
  return this.unitelApiService.getServiceType(dto.msisdn);
  // ❌ 没有 openid,缓存键: unitel:service_types:undefined:{msisdn}
}
```

**变更后:**
```typescript
@Post('service-types')
async getServiceTypes(
  @CurrentUser('openid') openid: string,  // ✅ 提取 openid
  @Body() dto: GetServiceTypeDto,
) {
  return this.unitelApiService.getCachedServiceTypes(dto.msisdn, openid);
  // ✅ 缓存键: unitel:service_types:{openid}:{msisdn}
}
```

**同样修复了 `getInvoice` 方法**

### 3. 验证缓存一致性

确认两个场景使用相同缓存键:

| 场景 | 方法调用 | 缓存键 |
|------|---------|--------|
| 前端获取资费 | `getCachedServiceTypes(msisdn, openid)` | ✅ `unitel:service_types:{openid}:{msisdn}` |
| 创建订单 | `findPackageByCode` → `getCachedServiceTypes(msisdn, openid)` | ✅ `unitel:service_types:{openid}:{msisdn}` |

---

## 📄 新增文档

### 1. PRICE_CACHE_SECURITY.md

**内容:**
- 资费缓存机制详细说明
- 价格防篡改原理
- 完整流程图和代码示例
- 测试验证方法

**关键点:**
- 前端只传 `packageCode`,不传 `price`
- 后端从 Redis 缓存验证价格
- 5 分钟 TTL 平衡性能和准确性

### 2. DESIGN_DECISIONS.md

**内容:**
- 回答两个核心设计问题:
  1. **订单模型:** 为什么选择独立订单表而不是统一表
  2. **缓存方案:** 为什么使用 Redis 缓存 + 后端验证

**决策矩阵:**
- 独立订单模型: 故障隔离 + 快速扩展
- Redis 缓存: 防篡改 + 减少 API 调用

### 3. OPTIMIZATION_2025-10-24.md

本文档,记录本次优化的所有改动。

---

## 🔍 验证方法

### 步骤1: 检查 Redis 缓存键

```bash
# 启动项目
npm run start:dev

# 前端获取资费
curl -X POST http://localhost:3000/api/operators/unitel/service-types \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"msisdn": "99887766"}'

# 检查 Redis
redis-cli
> KEYS unitel:service_types:*
"unitel:service_types:oABC123:99887766"  # ✅ 包含正确的 openid

> TTL unitel:service_types:oABC123:99887766
(integer) 298  # ✅ 5分钟 TTL
```

### 步骤2: 验证创建订单使用缓存

```bash
# 在 5 分钟内创建订单
curl -X POST http://localhost:3000/api/operators/unitel/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "msisdn": "99887766",
    "orderType": "balance",
    "packageCode": "SD5000"
  }'

# 检查日志(应显示)
# ✅ "使用缓存的资费列表: unitel:service_types:oABC123:99887766"
# ❌ 不应该看到 "缓存miss,正在从第三方获取资费列表"
```

### 步骤3: 验证价格防篡改

```bash
# 尝试传入错误价格(DTO 会忽略)
curl -X POST http://localhost:3000/api/operators/unitel/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "msisdn": "99887766",
    "orderType": "balance",
    "packageCode": "SD5000",
    "amountMnt": 1,      // ⬅️ 尝试篡改
    "amountCny": 0.01    // ⬅️ 尝试篡改
  }'

# 返回的订单应该使用后端验证的价格
{
  "orderNo": "UNI...",
  "amountMnt": 5000,   // ✅ 后端验证的价格
  "amountCny": 11.36   // ✅ 后端计算的价格
}
```

---

## 📊 影响范围

### 变更的文件

```
新建:
✅ src/modules/auth/user/decorators/current-user.decorator.ts
✅ src/modules/auth/user/decorators/index.ts
✅ docs/PRICE_CACHE_SECURITY.md
✅ docs/DESIGN_DECISIONS.md
✅ docs/OPTIMIZATION_2025-10-24.md (本文件)

修改:
✅ src/modules/operators/unitel/controllers/unitel-service.controller.ts
```

### 依赖模块

- ✅ Auth 模块 - 新增装饰器,不影响现有功能
- ✅ Unitel 模块 - 修复缓存逻辑,向后兼容
- ✅ Redis 模块 - 无变更

### 数据库

- ✅ 无数据库结构变更
- ✅ 无需数据迁移

---

## ⚠️ 注意事项

### 1. 需要重启服务

```bash
# 停止旧服务
pm2 stop elife-service  # 或 Ctrl+C

# 重新启动
npm run start:dev  # 或 npm run build && npm run start:prod
```

### 2. 清空旧缓存(可选)

```bash
# 如果存在旧的错误缓存,可以清空
redis-cli
> KEYS unitel:service_types:undefined:*
> DEL unitel:service_types:undefined:99887766  # 删除错误的缓存

# 或者清空所有 Unitel 缓存
> KEYS unitel:service_types:*
> DEL unitel:service_types:oABC123:99887766
```

### 3. 监控缓存命中率

```bash
# 建议监控以下指标
- Redis 缓存命中率
- Unitel API 调用频率
- 订单创建成功率
```

---

## 🎯 后续建议

### 短期(1-2周)

1. **监控缓存效果**
   - 观察 Redis 缓存命中率
   - 检查是否有缓存 miss 导致的额外 API 调用

2. **日志分析**
   - 统计 "使用缓存的资费列表" vs "缓存miss" 的比例
   - 期望缓存命中率 > 80%

3. **性能测试**
   - 压测获取资费接口
   - 压测创建订单接口
   - 确认 Redis 缓存有效减少响应时间

### 中期(1-2月)

1. **评估 TTL 设置**
   - 5 分钟是否合适?
   - 是否有用户反馈价格变动问题?
   - 考虑根据实际情况调整(3-10 分钟)

2. **缓存预热**
   - 考虑在低峰期预热热门手机号的资费
   - 提升首次请求的响应速度

3. **监控告警**
   - Redis 连接失败告警
   - Unitel API 调用失败告警
   - 缓存命中率低于阈值告警

### 长期(3月以上)

1. **添加第二个运营商**
   - 复制 Unitel 的缓存机制
   - 验证独立订单模型的优势

2. **缓存策略优化**
   - 分层缓存(L1: 内存, L2: Redis)
   - 智能 TTL(根据资费变动频率动态调整)

---

## 📚 相关文档

- [资费缓存与价格防篡改](./PRICE_CACHE_SECURITY.md) - 缓存机制详解
- [设计决策文档](./DESIGN_DECISIONS.md) - 订单模型 + 缓存方案
- [Unitel API 模块](./UNITEL_API_MODULE.md) - API 封装设计
- [架构设计文档](./architecture-plan.md) - 整体架构

---

## 🙋 问题反馈

如有问题或建议,请联系开发团队或在项目 Issue 中提出。

---

**优化完成时间**: 2025-10-24
**优化人员**: AI Assistant
**审核状态**: ✅ 待代码评审
**部署状态**: ⏳ 待部署到测试环境
