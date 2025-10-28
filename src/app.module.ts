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
import { UserAuthModule } from '@/modules/auth/user/user-auth.module';
import { WechatPayApiModule } from '@/modules/api-services/wechat-pay-api';
import { UnitelApiModule } from '@/modules/api-services/unitel-api';
import { UnitelModule } from '@/modules/unitel/unitel.module';
import { PaymentFlowModule } from '@/modules/payment-flow/payment-flow.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 环境文件加载优先级（从高到低）:
      // 1. .env.[mode].local - 本地覆盖文件（不提交到 git）
      // 2. .env.[mode] - 环境特定配置文件
      // 3. .env - 仅作为生产环境回退（其他环境不应依赖此文件）
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}.local`,
        `.env.${process.env.NODE_ENV || 'development'}`,
      ],
      // 如果指定的 envFilePath 文件不存在，不使用 .env 作为回退
      ignoreEnvFile: false, // 仍然读取文件，但优先级由 envFilePath 数组控制
      expandVariables: true, // 支持变量展开 ${VAR}
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

    // 基础设施层
    LoggerModule, // 日志模块（全局）
    PrismaModule, // 数据库模块（全局）
    RedisModule, // Redis 模块（全局）
    HealthModule, // 健康检查

    // 业务公共模块
    ExchangeRateModule, // 汇率服务
    UserAuthModule, // 用户认证模块

    // API 服务层（纯第三方 API 封装）
    WechatPayApiModule, // 微信支付 API
    UnitelApiModule, // Unitel 运营商 API

    // 业务逻辑层
    UnitelModule, // Unitel 订单业务

    // 流程协调层
    PaymentFlowModule, // 支付流程（回调处理和充值队列）
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
