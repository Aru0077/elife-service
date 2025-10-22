import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import unitelConfig from './config/unitel.config';
import { RedisModule } from '@/redis/redis.module';
import { UnitelApiService } from './services';

/**
 * Unitel 运营商模块
 * 提供 Unitel API 封装服务
 */
@Module({
  imports: [
    // 注册 Unitel 配置
    ConfigModule.forFeature(unitelConfig),

    // HTTP 客户端（用于调用 Unitel API）
    HttpModule,

    // Redis 模块（用于 Token 缓存）
    RedisModule,
  ],
  providers: [UnitelApiService],
  exports: [UnitelApiService], // 导出供其他模块使用
})
export class UnitelModule {}
