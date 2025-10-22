import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import unitelConfig from './config/unitel.config';
import { RedisModule } from '@/redis/redis.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { ExchangeRateModule } from '@/modules/exchange-rate';
import { UnitelApiService, UnitelBusinessService } from './services';
import { UnitelController } from './controllers/unitel.controller';

/**
 * Unitel 运营商模块
 * 提供 Unitel API 封装服务和业务逻辑
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
  ],
  controllers: [UnitelController],
  providers: [UnitelApiService, UnitelBusinessService],
  exports: [UnitelApiService, UnitelBusinessService], // 导出供其他模块使用
})
export class UnitelModule {}
