import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import unitelConfig from './config/unitel.config';
import { UnitelTokenService } from './services/unitel-token.service';
import { UnitelApiService } from './services/unitel-api.service';

/**
 * Unitel 运营商模块
 */
@Module({
  imports: [
    // 注册 Unitel 配置
    ConfigModule.forFeature(unitelConfig),
    // HTTP 模块
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [UnitelTokenService, UnitelApiService],
  exports: [UnitelApiService, UnitelTokenService],
})
export class UnitelModule {}
