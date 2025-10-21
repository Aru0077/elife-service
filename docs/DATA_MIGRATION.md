# 数据迁移指南

本文档说明如何将老版本 eLife 系统的数据迁移到新版本数据库。

---

## 📊 数据迁移概览

### 迁移范围
- ✅ **User 表**: 从 `old_users` 迁移到 `users`
- ✅ **UnitelOrder 表**: 从 `old_unitel_orders` 迁移到 `unitel_orders`

### 迁移策略
1. 创建新表结构（Prisma Migration）
2. 数据转换与迁移（SQL 脚本）
3. 数据验证
4. 切换应用到新表
5. 备份老表

---

## 🔄 字段映射关系

### User 表映射

| 老字段 | 新字段 | 类型变更 | 说明 |
|--------|--------|----------|------|
| `openid` (PK) | `openid` (Unique) | String → String | 不再作为主键，改为唯一索引 |
| - | `id` | - → UUID | **新增**: UUID 主键 |
| `created_at` | `created_at` | DateTime → DateTime | 保持不变 |
| `updated_at` | `updated_at` | DateTime → DateTime | 保持不变 |
| - | `nickname` | - → String? | **新增**: 微信昵称 |
| - | `avatar` | - → String? | **新增**: 微信头像 |
| - | `phone` | - → String? | **新增**: 手机号 |
| - | `is_blacklisted` | - → Boolean | **新增**: 黑名单标记 |
| - | `blacklisted_at` | - → DateTime? | **新增**: 拉黑时间 |
| - | `blacklist_reason` | - → String? | **新增**: 拉黑原因 |

### UnitelOrder 表映射

| 老字段 | 新字段 | 类型变更 | 说明 |
|--------|--------|----------|------|
| `order_number` (PK) | `order_no` (Unique) | String → String | 不再作为主键，改为唯一索引 |
| - | `id` | - → UUID | **新增**: UUID 主键 |
| `openid` | `user_id` | String → UUID | **关联变更**: 通过 openid 查找 user.id |
| `phone_number` | `msisdn` | String → String | **字段重命名** |
| `product_recharge_type` | `order_type` | String → String | **字段重命名**: balance/data/invoice_payment |
| `product_code` | `package_code` | String → String | **字段重命名** |
| `product_price_tg` | `amount_mnt` | Decimal → Decimal | **字段重命名**: 蒙古国货币 |
| `product_price_rmb` | `amount_cny` | Decimal → Decimal | **字段重命名**: 人民币 |
| - | `exchange_rate` | - → Decimal? | **新增**: 汇率快照（迁移时使用 440） |
| `product_name` | `product_name` | String → String | 保持不变 |
| - | `product_eng_name` | - → String | **新增**: 套餐英文名称（老数据为空） |
| `product_unit` | `product_unit` | Int? → Int? | 保持不变 |
| `product_data` | `product_data` | String? → String? | 保持不变 |
| `product_days` | `product_days` | Int? → Int? | 保持不变 |
| `payment_status` | `payment_status` | String → String | 保持不变 |
| `recharge_status` | `recharge_status` | String → String | **新增**: 充值状态（老表已有） |
| `created_at` | `created_at` | DateTime → DateTime | 保持不变 |
| `paid_at` | `paid_at` | DateTime? → DateTime? | 保持不变 |
| - | `updated_at` | - → DateTime | **新增**: 自动更新时间 |
| - | `completed_at` | - → DateTime? | **新增**: 完成时间 |
| - | `sv_id` | - → String? | **新增**: Unitel 服务ID |
| - | `seq` | - → String? | **新增**: Unitel 序列号 |
| - | `method` | - → String? | **新增**: 支付方式 |
| - | `vat_flag` | - → String? | **新增**: VAT 标志 |
| - | `vat_register_no` | - → String? | **新增**: VAT 注册号 |
| - | `vat_info` | - → Json? | **新增**: VAT 发票信息 |
| - | `api_result` | - → String? | **新增**: API 响应结果 |
| - | `api_code` | - → String? | **新增**: API 响应码 |
| - | `api_msg` | - → String? | **新增**: API 响应消息 |
| - | `api_raw` | - → Json? | **新增**: API 完整响应 |
| - | `error_message` | - → String? | **新增**: 错误消息 |
| - | `error_code` | - → String? | **新增**: 错误代码 |

---

## 🛠️ 迁移步骤

### 步骤 1: 创建新表结构

```bash
# 生成迁移文件
cd /root/elife-service
npx prisma migrate dev --name init_with_legacy_migration

# 生成 Prisma Client
npx prisma generate
```

### 步骤 2: 备份老数据

```bash
# 备份老数据库
pg_dump -U username -d old_elife_db > old_elife_backup_$(date +%Y%m%d).sql

# 或者只备份相关表
pg_dump -U username -d old_elife_db -t old_users -t old_unitel_orders > old_tables_backup.sql
```

### 步骤 3: 迁移 User 表

```sql
-- 3.1 迁移用户数据
INSERT INTO users (
  id,
  openid,
  created_at,
  updated_at,
  nickname,
  avatar,
  phone,
  is_blacklisted,
  blacklisted_at,
  blacklist_reason
)
SELECT
  gen_random_uuid(),           -- 生成新的 UUID 主键
  openid,
  created_at,
  updated_at,
  NULL,                        -- nickname (老数据无此字段)
  NULL,                        -- avatar (老数据无此字段)
  NULL,                        -- phone (老数据无此字段)
  false,                       -- is_blacklisted (默认未拉黑)
  NULL,                        -- blacklisted_at
  NULL                         -- blacklist_reason
FROM old_users
ON CONFLICT (openid) DO NOTHING;  -- 如果 openid 已存在则跳过

-- 3.2 验证迁移结果
SELECT
  COUNT(*) as total_users,
  COUNT(DISTINCT openid) as unique_openids
FROM users;

-- 3.3 检查是否有重复
SELECT openid, COUNT(*)
FROM users
GROUP BY openid
HAVING COUNT(*) > 1;
```

### 步骤 4: 迁移 UnitelOrder 表

```sql
-- 4.1 迁移订单数据
INSERT INTO unitel_orders (
  id,
  user_id,
  order_no,
  msisdn,
  order_type,
  amount_mnt,
  amount_cny,
  exchange_rate,
  package_code,
  product_name,
  product_eng_name,
  product_unit,
  product_data,
  product_days,
  payment_status,
  recharge_status,
  created_at,
  updated_at,
  paid_at,
  completed_at,
  -- 新增字段保留为 NULL
  sv_id,
  seq,
  method,
  vat_flag,
  vat_register_no,
  vat_info,
  api_result,
  api_code,
  api_msg,
  api_raw,
  error_message,
  error_code
)
SELECT
  gen_random_uuid(),                    -- 生成新的 UUID 主键
  u.id,                                 -- user_id: 通过 openid 关联到新 users 表
  o.order_number,                       -- order_no
  o.phone_number,                       -- msisdn
  o.product_recharge_type,              -- order_type
  o.product_price_tg::DECIMAL(10,2),    -- amount_mnt
  o.product_price_rmb::DECIMAL(10,2),   -- amount_cny
  440::DECIMAL(10,4),                   -- exchange_rate: 历史汇率快照
  o.product_code,                       -- package_code
  o.product_name,                       -- product_name
  '',                                   -- product_eng_name: 老数据无此字段
  o.product_unit,                       -- product_unit
  o.product_data,                       -- product_data
  o.product_days,                       -- product_days
  o.payment_status,                     -- payment_status
  o.recharge_status,                    -- recharge_status
  o.created_at,                         -- created_at
  o.created_at,                         -- updated_at: 使用 created_at
  o.paid_at,                            -- paid_at
  CASE
    WHEN o.recharge_status = 'success'
    THEN o.paid_at
    ELSE NULL
  END,                                  -- completed_at: 如果充值成功则使用 paid_at
  -- 新增字段全部为 NULL
  NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL
FROM old_unitel_orders o
INNER JOIN users u ON u.openid = o.openid  -- 通过 openid 关联
ON CONFLICT (order_no) DO NOTHING;          -- 如果订单号已存在则跳过

-- 4.2 验证迁移结果
SELECT
  COUNT(*) as total_orders,
  COUNT(DISTINCT order_no) as unique_orders,
  COUNT(DISTINCT user_id) as users_with_orders
FROM unitel_orders;

-- 4.3 检查订单状态分布
SELECT
  payment_status,
  recharge_status,
  COUNT(*) as count
FROM unitel_orders
GROUP BY payment_status, recharge_status
ORDER BY count DESC;

-- 4.4 检查金额数据完整性
SELECT
  COUNT(*) as orders_with_amount,
  MIN(amount_mnt) as min_mnt,
  MAX(amount_mnt) as max_mnt,
  AVG(amount_mnt) as avg_mnt,
  MIN(amount_cny) as min_cny,
  MAX(amount_cny) as max_cny,
  AVG(amount_cny) as avg_cny
FROM unitel_orders
WHERE amount_mnt IS NOT NULL AND amount_cny IS NOT NULL;

-- 4.5 检查是否有孤儿订单（user_id 不存在）
SELECT COUNT(*) as orphan_orders
FROM unitel_orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE u.id IS NULL;
```

### 步骤 5: 数据验证

```sql
-- 5.1 验证用户数量一致性
SELECT
  (SELECT COUNT(*) FROM old_users) as old_users_count,
  (SELECT COUNT(*) FROM users) as new_users_count,
  (SELECT COUNT(*) FROM users) - (SELECT COUNT(*) FROM old_users) as difference;

-- 5.2 验证订单数量一致性
SELECT
  (SELECT COUNT(*) FROM old_unitel_orders) as old_orders_count,
  (SELECT COUNT(*) FROM unitel_orders) as new_orders_count,
  (SELECT COUNT(*) FROM unitel_orders) - (SELECT COUNT(*) FROM old_unitel_orders) as difference;

-- 5.3 验证订单金额总和
SELECT
  (SELECT SUM(product_price_tg) FROM old_unitel_orders) as old_total_mnt,
  (SELECT SUM(amount_mnt) FROM unitel_orders) as new_total_mnt,
  (SELECT SUM(product_price_rmb) FROM old_unitel_orders) as old_total_cny,
  (SELECT SUM(amount_cny) FROM unitel_orders) as new_total_cny;

-- 5.4 抽样对比数据
SELECT
  o_old.order_number,
  o_old.openid as old_openid,
  u.openid as new_openid,
  o_old.product_price_tg as old_mnt,
  o_new.amount_mnt as new_mnt,
  o_old.product_price_rmb as old_cny,
  o_new.amount_cny as new_cny
FROM old_unitel_orders o_old
INNER JOIN unitel_orders o_new ON o_new.order_no = o_old.order_number
INNER JOIN users u ON u.id = o_new.user_id
LIMIT 10;
```

### 步骤 6: 创建迁移报告

```sql
-- 生成迁移报告
SELECT
  '迁移完成时间' as metric, NOW()::TEXT as value
UNION ALL
SELECT
  '老用户数', (SELECT COUNT(*)::TEXT FROM old_users)
UNION ALL
SELECT
  '新用户数', (SELECT COUNT(*)::TEXT FROM users)
UNION ALL
SELECT
  '老订单数', (SELECT COUNT(*)::TEXT FROM old_unitel_orders)
UNION ALL
SELECT
  '新订单数', (SELECT COUNT(*)::TEXT FROM unitel_orders)
UNION ALL
SELECT
  '订单金额总和(MNT)', (SELECT SUM(amount_mnt)::TEXT FROM unitel_orders)
UNION ALL
SELECT
  '订单金额总和(CNY)', (SELECT SUM(amount_cny)::TEXT FROM unitel_orders)
UNION ALL
SELECT
  '已支付订单数', (SELECT COUNT(*)::TEXT FROM unitel_orders WHERE payment_status = 'paid')
UNION ALL
SELECT
  '充值成功订单数', (SELECT COUNT(*)::TEXT FROM unitel_orders WHERE recharge_status = 'success');
```

---

## 🚨 回滚计划

如果迁移出现问题，可以快速回滚：

```sql
-- 1. 删除新表数据
TRUNCATE TABLE unitel_orders CASCADE;
TRUNCATE TABLE users CASCADE;

-- 2. 从备份恢复
psql -U username -d elife_db < old_elife_backup_YYYYMMDD.sql

-- 3. 或者保留老表，切换应用回老表
-- 修改 Prisma Schema 指向老表名
```

---

## ⚠️ 注意事项

### 1. 数据完整性

- ✅ **检查外键关联**: 确保所有订单都能关联到用户
- ✅ **处理 NULL 值**: 老数据中的 NULL 值在新表中也应保持一致
- ✅ **汇率快照**: 老订单使用固定汇率 440

### 2. 性能考虑

- ⚡ **分批迁移**: 如果数据量大（>10万条），建议分批执行
  ```sql
  -- 分批迁移示例
  INSERT INTO unitel_orders (...)
  SELECT ...
  FROM old_unitel_orders
  WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01'
  LIMIT 10000;
  ```

- ⚡ **索引优化**: 迁移完成后再创建索引
  ```sql
  -- 迁移前删除索引
  DROP INDEX IF EXISTS idx_unitel_orders_user_id;

  -- 迁移数据...

  -- 迁移后重建索引
  CREATE INDEX idx_unitel_orders_user_id ON unitel_orders(user_id);
  ```

### 3. 应用切换

- 🔄 **停机迁移**: 建议在低峰期进行迁移，临时停止服务
- 🔄 **灰度发布**: 先在测试环境完整测试迁移流程
- 🔄 **监控告警**: 迁移后密切监控应用日志和数据库性能

### 4. 老数据字段缺失

老数据中以下字段为空，需要在应用层处理：

- `product_eng_name` - 套餐英文名称（老数据无此字段）
- `sv_id` - Unitel 服务ID（老系统未保存）
- `seq` - Unitel 序列号（老系统未保存）
- `vat_info` - VAT 发票信息（老系统未保存）

---

## 📝 迁移清单

### 迁移前准备
- [ ] 备份老数据库
- [ ] 在测试环境完整测试迁移流程
- [ ] 准备回滚计划
- [ ] 通知用户维护窗口

### 迁移执行
- [ ] 停止应用服务
- [ ] 执行 Prisma Migration
- [ ] 迁移 User 表数据
- [ ] 迁移 UnitelOrder 表数据
- [ ] 数据验证（用户数、订单数、金额）
- [ ] 生成迁移报告

### 迁移后检查
- [ ] 抽样验证数据准确性
- [ ] 启动新版本应用
- [ ] 测试核心业务流程
- [ ] 监控应用日志
- [ ] 监控数据库性能
- [ ] 备份新数据库

### 善后工作
- [ ] 保留老表 1-3 个月（作为备份）
- [ ] 更新应用文档
- [ ] 更新运维文档
- [ ] 培训团队成员

---

## 🔗 相关文档

- [项目总览](./PROJECT_OVERVIEW.md)
- [Prisma Schema](../prisma/schema.prisma)
- [最佳实践](./BEST_PRACTICES.md)

---

**最后更新**: 2025-10-21
**文档版本**: 1.0.0
