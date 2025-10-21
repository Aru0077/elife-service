import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import unitelConfig from '@/modules/operators/unitel/config/unitel.config';
import { UnitelService } from '@/modules/operators/unitel/unitel.service';

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
  providers: [UnitelService],
  exports: [UnitelService],
})
export class UnitelModule {}
