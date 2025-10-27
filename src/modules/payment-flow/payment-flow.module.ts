import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from '@/logger/logger.module';
import { WechatPayApiModule } from '@/modules/api-services/wechat-pay-api';
import { UnitelModule } from '@/modules/unitel/unitel.module';
import { createRedisOptions } from '@/redis/redis.config';
import { RECHARGE_QUEUE } from './constants/queue.constants';
import { PaymentCallbackService } from './services/payment-callback.service';
import { RechargeLogService } from './services/recharge-log.service';
import { RechargeProcessor } from './processors/recharge.processor';
import { PaymentCallbackController } from './controllers/payment-callback.controller';

/**
 * 支付流程模块
 * 负责处理微信支付回调和充值业务的异步处理
 * 包含支付回调 Controller、回调服务、充值队列处理
 */
@Module({
  imports: [
    // 注册BullMQ队列（使用统一的 Redis 配置）
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = {
          host: configService.get<string>('redis.host')!,
          port: configService.get<number>('redis.port')!,
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db')!,
        };

        return {
          connection: {
            ...createRedisOptions(redisConfig),
            // 延迟连接：不在初始化时阻塞，而是在第一次使用时连接
            lazyConnect: true,
          },
        };
      },
      inject: [ConfigService],
    }),

    // 注册充值队列
    BullModule.registerQueue({
      name: RECHARGE_QUEUE,
      defaultJobOptions: {
        attempts: 1, // 不重试，失败直接标记
        removeOnComplete: false, // 保留成功的任务记录
        removeOnFail: false, // 保留失败的任务记录
      },
    }),

    LoggerModule,

    // 微信支付 API 模块（用于验证签名和解密）
    WechatPayApiModule,

    // Unitel 订单模块（用于更新订单和执行充值）
    UnitelModule,
  ],
  controllers: [PaymentCallbackController], // 支付回调 Controller
  providers: [PaymentCallbackService, RechargeLogService, RechargeProcessor],
  exports: [], // 顶层流程模块，不导出服务
})
export class PaymentFlowModule {}
