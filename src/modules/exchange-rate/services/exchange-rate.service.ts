import { Injectable, NotFoundException } from '@nestjs/common';
import { ExchangeRate } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExchangeRateResponseDto } from '../exchange-rate.dto';

/**
 * 汇率服务
 * 提供汇率查询功能
 */
@Injectable()
export class ExchangeRateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ExchangeRateService.name);
  }

  /**
   * 获取蒙古国货币与人民币的汇率
   * 汇率固定为 440，换算公式: MNT / 440 = CNY
   */
  async getExchangeRate(): Promise<ExchangeRateResponseDto> {
    this.logger.debug('从数据库查询汇率: MNT_CNY');
    const exchangeRate: ExchangeRate | null =
      await this.prisma.exchangeRate.findUnique({
        where: { id: 'MNT_CNY' },
      });

    if (!exchangeRate) {
      this.logger.error('汇率信息不存在: MNT_CNY');
      throw new NotFoundException('汇率信息不存在');
    }

    this.logger.debug(`汇率查询成功: MNT_CNY=${exchangeRate.rate.toString()}`);
    return {
      id: exchangeRate.id,
      rate: exchangeRate.rate.toString(),
      createdAt: exchangeRate.createdAt,
      updatedAt: exchangeRate.updatedAt,
    };
  }
}
