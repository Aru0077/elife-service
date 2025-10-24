import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';
import { Request } from 'express';

/**
 * 当前用户装饰器
 * 用于从请求中提取当前已认证的用户信息
 *
 * 使用方法:
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 *
 * 或者只获取 openid:
 * @Post('orders')
 * @UseGuards(JwtAuthGuard)
 * createOrder(@CurrentUser('openid') openid: string) {
 *   return openid;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    // 如果指定了字段名,返回该字段的值
    if (data) {
      return user?.[data];
    }

    // 否则返回整个用户对象
    return user;
  },
);
