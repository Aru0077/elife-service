import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import unitelConfig from './config/unitel.config';
import { RedisModule } from '@/redis/redis.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { ExchangeRateModule } from '@/modules/exchange-rate';
import { WechatPayModule } from '@/modules/wechat-pay';
import { UnitelApiService } from './services';
import { UnitelOrderService } from './services/unitel-order.service';
import { UnitelOrderController } from './controllers/unitel-order.controller';
import { UnitelServiceController } from './controllers/unitel-service.controller';
import { LoggerModule } from '@/logger/logger.module';

/**
 * Unitel 运营商模块
 * 提供 Unitel API 封装服务、订单业务逻辑和 API 端点
 */
@Module({
  imports: [
    // 注册 Unitel 配置
    ConfigModule.forFeature(unitelConfig),

    // HTTP 客户端（用于调用 Unitel API）
    HttpModule,

    // Redis 模块（用于 Token 缓存）
    RedisModule,

    // Prisma 模块（用于数据库操作）
    PrismaModule,

    // 汇率模块（用于汇率转换）
    ExchangeRateModule,

    // 微信支付模块（用于创建支付订单）
    WechatPayModule,

    // 日志模块（用于记录日志）
    LoggerModule,
  ],
  controllers: [UnitelOrderController, UnitelServiceController],
  providers: [UnitelApiService, UnitelOrderService],
  exports: [UnitelApiService, UnitelOrderService], // 导出供其他模块使用（如支付模块）
})
export class UnitelModule {}
