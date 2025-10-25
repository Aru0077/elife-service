import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validationSchema } from '@/config/env.validation';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisModule } from '@/redis/redis.module';
import { HealthModule } from '@/health/health.module';
import { LoggerModule } from '@/logger/logger.module';
import { ThrottlerBehindProxyGuard } from '@/common/guards/throttler-behind-proxy.guard';
import { ExchangeRateModule } from '@/modules/exchange-rate';
import { UnitelModule } from '@/modules/operators/unitel/unitel.module';
import { UserAuthModule } from '@/modules/auth/user/user-auth.module';
import { WechatPayModule } from '@/modules/wechat-pay';
import { PaymentProcessorModule } from '@/modules/payment-processor/payment-processor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('THROTTLE_TTL') || 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT') || 10,
          },
        ],
      }),
    }),
    LoggerModule, // 日志模块（全局）
    PrismaModule,
    RedisModule,
    HealthModule,
    ExchangeRateModule,
    UnitelModule,
    UserAuthModule, // 用户认证模块
    WechatPayModule, // 微信支付模块
    PaymentProcessorModule, // 支付处理器模块（回调处理和充值队列）
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
