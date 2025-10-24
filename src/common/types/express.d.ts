import { User } from '@prisma/client';

/**
 * Express Request 接口扩展
 * 使用 TypeScript Declaration Merging 为 Request 添加 user 属性
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * 当前认证用户信息
       * 由 JWT 认证守卫在请求处理过程中注入
       */
      user: User;
    }
  }
}
