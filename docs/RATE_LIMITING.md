# 请求速率限制使用指南

## 概述

本项目使用 `@nestjs/throttler` 进行全局请求速率限制,防止 API 滥用和 DDoS 攻击。

## 配置

### 环境变量

```env
# .env
THROTTLE_TTL=60        # 时间窗口(秒)
THROTTLE_LIMIT=10      # 时间窗口内的最大请求数
```

**默认配置**: 每 60 秒最多 10 个请求

## 工作原理

速率限制基于客户端 IP 地址:
- 每个 IP 在指定时间窗口内只能发送指定数量的请求
- 超过限制后返回 `429 Too Many Requests` 错误
- 支持代理环境(自动获取真实 IP)

## 使用方法

### 1. 全局配置(已启用)

所有接口默认都受速率限制保护。

### 2. 跳过特定路由

#### 跳过整个控制器
```typescript
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('public')
export class PublicController {
  // 此控制器下所有接口不受速率限制
}
```

#### 跳过特定方法
```typescript
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('api')
export class ApiController {
  @Get('health')
  @SkipThrottle()  // 健康检查不受限制
  checkHealth() {
    return { status: 'ok' };
  }

  @Get('data')
  getData() {
    // 此接口受全局限制
  }
}
```

### 3. 自定义特定路由的限制

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('uploads')
export class UploadsController {
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })  // 每分钟最多 3 次
  uploadFile() {
    // 文件上传接口更严格的限制
  }
}
```

### 4. 动态限制(按用户角色)

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // 已登录用户使用用户ID
    if (req.user) {
      return `user:${req.user.id}`;
    }
    // 未登录用户使用IP
    return req.ips.length ? req.ips[0] : req.ip;
  }

  protected async getThrottlerLimit(
    context: ExecutionContext,
  ): Promise<number> {
    const request = context.switchToHttp().getRequest();
    // VIP用户更高的限制
    if (request.user?.role === 'vip') {
      return 100;
    }
    return 10; // 默认限制
  }
}
```

## 响应

### 成功请求
正常返回数据,并包含速率限制响应头:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1634567890
```

### 超过限制
返回 429 状态码:

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "timestamp": "2025-10-20T...",
  "path": "/api/data"
}
```

## 生产环境建议

### 1. 不同环境不同配置

```env
# .env.development
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# .env.production
THROTTLE_TTL=60
THROTTLE_LIMIT=50
```

### 2. 使用 Redis 存储(多实例部署)

```typescript
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nestjs/throttler-storage-redis';

ThrottlerModule.forRoot({
  throttlers: [{ ttl: 60, limit: 10 }],
  storage: new ThrottlerStorageRedisService('redis://localhost:6379'),
});
```

### 3. 按接口类型分级限制

```typescript
// 读操作宽松
@Get()
@Throttle({ default: { limit: 100, ttl: 60000 } })
findAll() {}

// 写操作严格
@Post()
@Throttle({ default: { limit: 10, ttl: 60000 } })
create() {}

// 敏感操作极严格
@Post('reset-password')
@Throttle({ default: { limit: 3, ttl: 300000 } })
resetPassword() {}
```

## 最佳实践

### ✅ 推荐做法

1. **健康检查跳过限制**: 监控端点不应受限
2. **公共资源放宽限制**: 静态资源、文档等
3. **敏感操作严格限制**: 登录、注册、密码重置
4. **合理设置阈值**: 根据实际负载能力设置
5. **提供清晰的错误信息**: 告诉用户何时可以重试

### ❌ 避免做法

1. **过于严格**: 影响正常用户体验
2. **过于宽松**: 无法防止滥用
3. **忽略代理**: 多实例部署必须考虑
4. **硬编码限制**: 应该通过配置管理

## 监控建议

```typescript
// 记录被限制的请求
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    // 记录日志
    logger.warn({
      message: 'Rate limit exceeded',
      ip: request.ip,
      path: request.url,
      userAgent: request.headers['user-agent'],
    });

    // 返回响应
    ctx.getResponse().status(429).json({
      statusCode: 429,
      message: 'Too many requests, please try again later',
      retryAfter: 60, // 秒
    });
  }
}
```

## 测试

### 测试速率限制

```bash
# 快速发送多个请求
for i in {1..15}; do
  curl -w "\nStatus: %{http_code}\n" http://localhost:3000/api/health
  sleep 0.1
done
```

前10个请求成功,后5个返回429。

## 常见问题

### Q: 开发环境需要限制吗?
A: 建议设置宽松的限制,便于开发测试,但不要完全关闭

### Q: 如何处理负载均衡?
A: 使用 Redis 作为共享存储,确保跨实例的限制一致性

### Q: WebSocket 连接受影响吗?
A: 默认不受影响,可以通过 `@SkipThrottle()` 明确排除

### Q: 如何临时提高某个用户的限制?
A: 实现自定义 Guard,根据用户属性动态调整限制
