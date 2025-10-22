import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExchangeRateResponseDto } from '../dto';

/**
 * 汇率服务
 */
@Injectable()
export class ExchangeRateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取蒙古国货币与人民币的汇率
   * 汇率固定为 440，换算公式: MNT / 440 = CNY
   */
  async getExchangeRate(): Promise<ExchangeRateResponseDto> {
    const exchangeRate = await (this.prisma as any).exchangeRate.findUnique({
      where: { id: 'MNT_CNY' },
    });

    if (!exchangeRate) {
      throw new Error('汇率信息不存在');
    }

    return {
      id: exchangeRate.id as string,
      rate: (exchangeRate.rate as { toString(): string }).toString(),
      createdAt: exchangeRate.createdAt as Date,
      updatedAt: exchangeRate.updatedAt as Date,
    };
  }

  /**
   * 将蒙古国货币转换为人民币
   * @param mntAmount 蒙古国货币金额
   * @returns 人民币金额
   */
  async convertMntToCny(mntAmount: number): Promise<number> {
    const exchangeRate = await this.getExchangeRate();
    const rate = parseFloat(exchangeRate.rate);
    return mntAmount / rate;
  }

  /**
   * 将人民币转换为蒙古国货币
   * @param cnyAmount 人民币金额
   * @returns 蒙古国货币金额
   */
  async convertCnyToMnt(cnyAmount: number): Promise<number> {
    const exchangeRate = await this.getExchangeRate();
    const rate = parseFloat(exchangeRate.rate);
    return cnyAmount * rate;
  }
}
