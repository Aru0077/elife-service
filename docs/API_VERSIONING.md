# API 版本控制使用指南

## 概述

本项目使用**请求头(Header-based)**方式进行 API 版本控制。

## 配置

- **版本请求头**: `X-API-Version`
- **默认版本**: `1`
- **支持版本**: `1`, `2`, ...

## 使用方法

### 1. 客户端请求

#### 不带版本头 (使用默认版本 1)
```bash
curl http://localhost:3000/api/health
```

#### 指定版本 1
```bash
curl -H "X-API-Version: 1" http://localhost:3000/api/health
```

#### 指定版本 2
```bash
curl -H "X-API-Version: 2" http://localhost:3000/api/health
```

### 2. 服务端实现

#### 在控制器方法上指定版本

```typescript
import { Controller, Get, Version } from '@nestjs/common';

@Controller('users')
export class UsersController {
  // 版本 1 的实现
  @Get()
  @Version('1')
  findAllV1() {
    return { users: [], version: '1' };
  }

  // 版本 2 的实现 - 增强功能
  @Get()
  @Version('2')
  findAllV2() {
    return {
      users: [],
      version: '2',
      meta: { total: 0 }
    };
  }
}
```

#### 在控制器级别指定版本

```typescript
@Controller({
  path: 'products',
  version: '1',
})
export class ProductsV1Controller {
  // 所有方法默认都是版本 1
}

@Controller({
  path: 'products',
  version: '2',
})
export class ProductsV2Controller {
  // 所有方法默认都是版本 2
}
```

## 版本迁移策略

### 1. 向后兼容的更改
对于不破坏现有API的更改,直接修改当前版本即可:
- 添加可选字段
- 添加新的端点
- 性能优化

### 2. 破坏性更改
对于会破坏现有API的更改,创建新版本:
- 删除字段
- 修改字段类型
- 修改响应结构
- 修改业务逻辑

### 3. 版本废弃流程

```typescript
@Get()
@Version('1')
@ApiDeprecated() // Swagger 中标记为废弃
findAllV1() {
  // 返回警告信息
  return {
    deprecated: true,
    message: 'This version will be removed in 2025-12-31',
    data: []
  };
}
```

## 最佳实践

### ✅ 推荐做法

1. **保持向后兼容性**: 尽可能避免创建新版本
2. **版本命名**: 使用简单的数字版本号 (`1`, `2`, `3`)
3. **文档化**: 在 Swagger 中清楚标注版本差异
4. **废弃通知**: 提前至少 3 个月通知版本废弃

### ❌ 避免做法

1. **过度版本化**: 不要为小改动创建新版本
2. **复杂版本号**: 避免使用 `v1.2.3` 这样的版本号
3. **突然废弃**: 不要在没有通知的情况下移除版本
4. **版本混乱**: 确保版本之间的差异清晰可辨

## 示例

### 健康检查端点

```bash
# 版本 1 - 基础信息
curl -H "X-API-Version: 1" http://localhost:3000/api/health

{
  "status": "ok",
  "version": "1",
  "timestamp": "2025-10-20T..."
}

# 版本 2 - 增强信息
curl -H "X-API-Version: 2" http://localhost:3000/api/health

{
  "status": "ok",
  "version": "2",
  "timestamp": "2025-10-20T...",
  "uptime": 12345.678,
  "environment": "development"
}
```

## 常见问题

### Q: 为什么使用请求头而不是 URL?
A:
- ✅ 不污染 URL 结构
- ✅ 更容易管理和切换
- ✅ 对 SEO 更友好
- ✅ 符合 REST 最佳实践

### Q: 如何测试不同版本?
A: 使用 Swagger UI 或 Postman 设置 `X-API-Version` 请求头

### Q: 是否支持多个版本同时存在?
A: 是的,不同版本可以并存,便于平滑迁移
