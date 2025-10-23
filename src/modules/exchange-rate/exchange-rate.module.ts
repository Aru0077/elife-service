import { Module } from '@nestjs/common';
import { ExchangeRateController } from './exchange-rate.controller';
import { ExchangeRateService } from './services/exchange-rate.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * 汇率模块
 * 提供汇率查询功能
 */
@Module({
  imports: [PrismaModule],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
