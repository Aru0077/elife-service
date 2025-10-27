# 阿里云 SAE 部署指南

## 项目部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                     阿里云 SAE 部署架构                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │   Git    │ ───> │   ACR    │ ───> │   SAE    │         │
│  │ 仓库推送  │      │ 自动构建  │      │ 应用部署  │         │
│  └──────────┘      └──────────┘      └──────────┘         │
│                                            │                │
│                    ┌───────────────────────┴───────────┐   │
│                    │                                   │   │
│              ┌─────▼──────┐                    ┌──────▼───┐│
│              │初始化容器    │                    │应用容器   ││
│              │数据库迁移    │                    │Node.js   ││
│              └─────┬──────┘                    └──────┬───┘│
│                    │                                  │    │
│       ┌────────────┴────────┐           ┌────────────┘    │
│       │                     │           │                 │
│  ┌────▼─────┐        ┌─────▼────┐  ┌───▼────┐           │
│  │   RDS    │        │  Tair    │  │  SLS   │           │
│  │PostgreSQL│        │标准版主备 │  │日志服务 │           │
│  └──────────┘        └──────────┘  └────────┘           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 📋 前置准备清单

### 1. 阿里云资源准备

#### ✅ RDS PostgreSQL
- **规格**：根据业务需求选择（推荐从小规格开始）
- **版本**：PostgreSQL 14 或更高
- **网络**：VPC 内网访问
- **白名单**：添加 SAE 应用所在的安全组
- **记录信息**：
  - 内网连接地址：`pgm-xxxxx.pg.rds.aliyuncs.com`
  - 端口：`5432`
  - 数据库名：`elife_db`
  - 用户名和密码

#### ✅ Tair 标准版（主备架构）
- **产品**：Redis 开源版
- **系列**：倚天版（最经济）或标准版
- **版本**：Redis 7.0
- **架构**：标准版（主备架构，不启用集群）
- **规格**：1GB 起步
- **⚠️ 重要**：
  - ❌ 不要使用 Tair Serverless KV（不支持 BullMQ）
  - ✅ 必须使用标准版主备架构
  - ✅ 必须设置实例密码
- **记录信息**：
  - 内网连接地址：`r-xxxxx.redis.rds.aliyuncs.com`
  - 端口：`6379`
  - 密码：强密码

#### ✅ ACR 容器镜像服务
- **命名空间**：创建项目专用命名空间
- **仓库**：创建 elife-service 仓库
- **构建规则**：配置 Git 仓库自动构建
  - 代码源：GitHub/GitLab/码云
  - 分支/标签：main/master
  - Dockerfile 路径：`./Dockerfile`

#### ✅ SAE 应用
- **部署方式**：容器镜像部署
- **规格**：推荐从 1核2G 开始
- **实例数**：1-2 个实例
- **VPC**：与 RDS、Tair 相同的 VPC

---

## 🔐 环境变量配置

### SAE 控制台配置环境变量

在 SAE 应用详情页 → **配置管理** → **环境变量** 中添加以下配置：

```bash
# ==========================================
# 应用配置
# ==========================================
NODE_ENV=production
PORT=3000

# ==========================================
# 数据库配置（阿里云 RDS）
# ==========================================
DATABASE_URL=postgresql://用户名:密码@pgm-xxxxx.pg.rds.aliyuncs.com:5432/elife_db?schema=public

# ==========================================
# Redis 配置（阿里云 Tair 标准版）
# ==========================================
REDIS_HOST=r-xxxxx.redis.rds.aliyuncs.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# ==========================================
# 限流配置
# ==========================================
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# ==========================================
# Unitel API 配置
# ==========================================
UNITEL_USERNAME=your_unitel_username
UNITEL_PASSWORD=your_unitel_password
UNITEL_BASE_URL=https://api.unitel.mn/api/v1

# ==========================================
# 微信公众号配置
# ==========================================
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret

# ==========================================
# 微信支付配置
# ==========================================
WECHAT_PAY_MCHID=your_mchid
WECHAT_PAY_SERIAL_NO=your_cert_serial_no
WECHAT_PAY_PRIVATE_KEY=your_base64_encoded_private_key
WECHAT_PAY_APIV3_KEY=your_32_character_apiv3_key
WECHAT_PAY_PLATFORM_CERT=your_base64_encoded_platform_cert
WECHAT_PAY_NOTIFY_URL=https://your-domain.com/api/payment/wechat/notify
WECHAT_PAY_REFUND_NOTIFY_URL=https://your-domain.com/api/payment/wechat/refund-notify

# ==========================================
# JWT 配置
# ==========================================
JWT_SECRET=your-production-jwt-secret-min-32-characters
JWT_EXPIRES_IN=7d

# ==========================================
# 日志配置
# ==========================================
LOG_LEVEL=warn
LOG_PRETTY=false
```

---

## 🚀 SAE 初始化容器配置

### 方式一：通过 SAE 控制台配置（推荐）

1. 进入 **SAE 控制台** → 选择应用 → **配置管理** → **生命周期管理**

2. 找到 **初始化容器（Init Container）** 配置项

3. 添加初始化容器：

```yaml
# 初始化容器配置
名称: db-migration
镜像: registry.cn-hangzhou.aliyuncs.com/your-namespace/elife-service:latest
命令: npx
参数:
  - prisma
  - migrate
  - deploy

# 环境变量（复用应用容器的环境变量）
引用应用配置: 是
```

**配置说明**：
- **名称**：db-migration（数据库迁移）
- **镜像**：使用与应用容器相同的镜像
- **命令**：`npx prisma migrate deploy`
- **环境变量**：自动继承应用容器的环境变量（包含 DATABASE_URL）

### 方式二：通过 YAML 配置文件

如果使用 SAE Toolkit 或 API 部署，可以使用以下配置：

```yaml
# sae-config.yaml
apiVersion: v1
kind: Application
metadata:
  name: elife-service
spec:
  # 应用容器配置
  containers:
    - name: elife-service
      image: registry.cn-hangzhou.aliyuncs.com/your-namespace/elife-service:latest
      ports:
        - containerPort: 3000
      env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          value: "postgresql://..."
        # ... 其他环境变量

  # 初始化容器配置
  initContainers:
    - name: db-migration
      image: registry.cn-hangzhou.aliyuncs.com/your-namespace/elife-service:latest
      command: ["npx", "prisma", "migrate", "deploy"]
      env:
        - name: DATABASE_URL
          value: "postgresql://..."  # 使用相同的数据库连接
```

---

## 📝 部署流程

### 步骤 1: 配置 ACR 自动构建

1. **登录 ACR 控制台** → 选择仓库 → **构建**

2. **添加构建规则**：
   ```
   代码源: GitHub/GitLab
   仓库地址: https://github.com/your-org/elife-service
   触发分支: main
   Dockerfile 路径: ./Dockerfile
   镜像版本: latest, {source_branch}-{commit_id}
   ```

3. **测试构建**：
   - 手动触发一次构建
   - 确认镜像构建成功
   - 查看镜像标签

### 步骤 2: 创建 SAE 应用

1. **登录 SAE 控制台** → **创建应用**

2. **基本信息**：
   ```
   应用名称: elife-service
   部署方式: 镜像
   地域: 选择与 RDS/Tair 相同的地域
   命名空间: 选择或创建
   VPC: 与 RDS/Tair 相同的 VPC
   ```

3. **应用配置**：
   ```
   镜像地址: registry.cn-hangzhou.aliyuncs.com/your-namespace/elife-service:latest
   应用实例: 1 个（可后续扩容）
   规格: 1核2GB（推荐）
   公网访问: 按需开启
   ```

4. **高级设置**：
   - 配置环境变量（参考上方配置清单）
   - 配置健康检查：HTTP 检查，路径 `/health`
   - 配置初始化容器（参考上方配置）

### 步骤 3: 部署应用

1. **推送代码到 Git**：
   ```bash
   git add .
   git commit -m "feat: 添加 SAE 部署支持"
   git push origin main
   ```

2. **ACR 自动构建**：
   - ACR 检测到代码推送
   - 自动开始构建镜像
   - 构建完成后打上 `latest` 标签

3. **SAE 部署**：
   - 在 SAE 控制台点击 **部署应用**
   - 选择镜像版本：`latest`
   - 点击 **确认**

4. **查看部署日志**：
   - **初始化容器日志**：查看数据库迁移执行情况
   - **应用容器日志**：查看应用启动日志

### 步骤 4: 验证部署

1. **检查初始化容器日志**：
   ```
   SAE 控制台 → 应用详情 → 日志 → 初始化容器日志

   预期输出：
   ✔ Prisma Migrate applied 2 migrations:
     └─ 20251021120124_rate
     └─ 20251025074747_recharge_log
   ```

2. **检查应用日志**：
   ```
   SAE 控制台 → 应用详情 → 日志 → 应用日志

   预期输出：
   {"level":30,"msg":"Application is running on: http://localhost:3000/api"}
   {"level":30,"msg":"Redis 连接成功"}
   {"level":30,"msg":"Database connection established"}
   ```

3. **健康检查**：
   ```bash
   curl https://your-sae-app-domain.com/health
   # 预期返回: {"status":"ok"}
   ```

4. **测试 API**：
   ```bash
   # 测试健康检查
   curl https://your-sae-app-domain.com/health

   # 测试汇率 API
   curl https://your-sae-app-domain.com/api/exchange-rates

   # 测试微信登录（需要有效的 code）
   curl -X POST https://your-sae-app-domain.com/api/auth/user/wechat \
     -H "Content-Type: application/json" \
     -d '{"code":"test_code"}'
   ```

---

## 🔧 更新部署

### 自动部署流程

1. **修改代码并推送**：
   ```bash
   git add .
   git commit -m "feat: 新功能"
   git push origin main
   ```

2. **ACR 自动构建新镜像**

3. **SAE 手动触发部署**：
   - 进入 SAE 控制台
   - 点击 **部署应用**
   - 选择新的镜像版本
   - 确认部署

### 数据库迁移说明

- ✅ **自动执行**：初始化容器会在每次部署时自动运行 `prisma migrate deploy`
- ✅ **幂等性**：Prisma 会检查已执行的迁移，不会重复执行
- ✅ **失败处理**：如果迁移失败，应用容器不会启动
- ⚠️ **新迁移**：如果有新的迁移文件，确保推送到 Git 仓库的 `prisma/migrations/` 目录

---

## 📊 监控和日志

### 查看日志

1. **SAE 控制台日志**：
   ```
   SAE 控制台 → 应用详情 → 日志
   - 实时日志：查看应用实时输出
   - 历史日志：查看历史日志
   - 初始化容器日志：查看数据库迁移日志
   ```

2. **SLS 日志服务**（SAE 自动采集）：
   ```
   SLS 控制台 → 日志库 → sae-{namespace}-{app-name}
   - 查询语法：支持 SQL 查询
   - 示例查询：
     * level: error                    # 查询错误日志
     * traceId: "xxx"                  # 根据 traceId 查询
     * msg: "Redis 连接失败"            # 关键字查询
   ```

### 监控指标

在 SAE 控制台 → **监控** 中查看：
- CPU 使用率
- 内存使用率
- 网络流量
- 请求 QPS
- 响应时间

### 告警配置

建议配置的告警：
- CPU 使用率 > 80%
- 内存使用率 > 80%
- 应用健康检查失败
- 错误日志数量激增

---

## 🐛 故障排查

### 问题 1: 初始化容器失败

**症状**：应用一直处于 "启动中" 状态

**排查步骤**：
1. 查看初始化容器日志
2. 检查 DATABASE_URL 是否正确
3. 检查 RDS 白名单是否包含 SAE 安全组
4. 检查网络连通性

**常见错误**：
```
Error: P1001: Can't reach database server
```
**解决**：检查 RDS 白名单和网络配置

### 问题 2: Redis 连接失败

**症状**：应用启动后报 Redis 连接错误

**排查步骤**：
1. 检查 REDIS_HOST、REDIS_PORT、REDIS_PASSWORD 环境变量
2. 检查 Tair 实例是否为标准版（不是 Serverless KV）
3. 检查网络连通性

**常见错误**：
```
Redis 连接错误: NOAUTH Authentication required
```
**解决**：设置正确的 REDIS_PASSWORD

### 问题 3: BullMQ 队列无法工作

**症状**：充值任务不执行

**排查步骤**：
1. 确认使用的是 **Tair 标准版主备架构**
2. 检查 Redis 配置是否正确
3. 查看应用日志中是否有队列相关错误

**⚠️ 重要**：
- ❌ Tair Serverless KV 不支持 BullMQ
- ✅ 必须使用 Tair 标准版（主备架构）

### 问题 4: 应用启动慢

**症状**：应用启动需要很长时间

**可能原因**：
1. 初始化容器执行数据库迁移耗时
2. 首次部署需要下载镜像

**优化建议**：
- 数据库迁移是必需的，耗时正常
- 后续部署会使用缓存的镜像，速度会快很多

---

## 📚 相关文档

### 阿里云官方文档
- [SAE 应用管理](https://help.aliyun.com/zh/sae/)
- [Tair 标准版](https://help.aliyun.com/zh/redis/product-overview/standard-master-replica-instances)
- [RDS PostgreSQL](https://help.aliyun.com/zh/rds/apsaradb-rds-for-postgresql/)
- [ACR 容器镜像服务](https://help.aliyun.com/zh/acr/)
- [SLS 日志服务](https://help.aliyun.com/zh/sls/)

### 项目文档
- [CODE_REVIEW_FIXES.md](./CODE_REVIEW_FIXES.md) - 代码审查修复报告
- [.env.example](./.env.example) - 环境变量配置示例
- [Dockerfile](./Dockerfile) - Docker 镜像构建配置

---

## 🎯 快速检查清单

部署前请确认：

### 阿里云资源
- [ ] RDS PostgreSQL 已创建并配置白名单
- [ ] Tair 标准版（主备架构）已创建并设置密码
- [ ] ACR 仓库已创建并配置自动构建
- [ ] SAE 应用已创建并配置环境变量
- [ ] 所有资源在同一 VPC

### 配置检查
- [ ] 环境变量已正确配置（DATABASE_URL, REDIS_*）
- [ ] 微信公众号和支付配置已填写
- [ ] Unitel API 配置已填写
- [ ] JWT_SECRET 使用强密码（≥32字符）
- [ ] LOG_PRETTY=false（生产环境）

### SAE 配置
- [ ] 初始化容器已配置（db-migration）
- [ ] 健康检查已配置（/health）
- [ ] 应用规格合适（推荐 1核2GB 起步）

### 测试验证
- [ ] 初始化容器日志显示迁移成功
- [ ] 应用日志显示启动成功
- [ ] 健康检查接口返回正常
- [ ] Redis 连接成功
- [ ] 数据库连接成功

---

## 💡 最佳实践

1. **环境隔离**：
   - 开发环境：使用独立的 RDS、Tair 实例
   - 生产环境：使用独立的资源和更高规格

2. **密码管理**：
   - 使用强密码
   - 定期轮换密码
   - 不要在代码中硬编码密码

3. **监控告警**：
   - 配置关键指标告警
   - 定期查看日志
   - 关注错误日志

4. **备份策略**：
   - 启用 RDS 自动备份
   - 定期测试恢复流程

5. **灰度发布**：
   - 使用 SAE 的灰度发布功能
   - 先更新少量实例验证
   - 确认无问题后全量更新

---

## 🆘 获取帮助

如遇到问题：
1. 查看 SAE 控制台日志
2. 查看 SLS 日志服务
3. 参考故障排查章节
4. 联系阿里云技术支持

---

**最后更新**: 2025-10-27
**维护者**: 项目团队
**版本**: 1.0.0
