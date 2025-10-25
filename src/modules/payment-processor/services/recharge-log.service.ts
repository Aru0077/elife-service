import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * 充值日志服务
 * 负责管理充值日志记录，用于审计和幂等性保护
 */
@Injectable()
export class RechargeLogService {
  private readonly logger = new Logger(RechargeLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建充值日志（开始充值时）
   * @param data 充值日志数据
   * @returns 创建的日志记录
   */
  async createLog(data: {
    orderNo: string;
    operator: string;
    msisdn: string;
    packageCode: string;
    amountMnt: number;
    rechargeType: string;
  }) {
    try {
      const log = await this.prisma.rechargeLog.create({
        data: {
          orderNo: data.orderNo,
          operator: data.operator,
          msisdn: data.msisdn,
          packageCode: data.packageCode,
          amountMnt: new Prisma.Decimal(data.amountMnt),
          rechargeType: data.rechargeType,
          status: 'processing',
          startedAt: new Date(),
        },
      });

      this.logger.log(`充值日志已创建: ${data.orderNo}`);
      return log;
    } catch (error: any) {
      // 如果是唯一约束冲突（orderNo重复），说明已经有充值记录
      if (error.code === 'P2002') {
        this.logger.warn(`充值日志已存在（防重复）: ${data.orderNo}`);
        throw new Error('DUPLICATE_RECHARGE');
      }
      throw error;
    }
  }

  /**
   * 更新充值日志为成功状态
   * @param orderNo 订单号
   * @param apiResponse API响应数据
   */
  async markSuccess(
    orderNo: string,
    apiResponse: {
      result?: string;
      code?: string;
      msg?: string;
      raw?: any;
    },
  ) {
    const startTime = await this.getStartTime(orderNo);
    const duration = startTime ? Date.now() - startTime.getTime() : null;

    await this.prisma.rechargeLog.update({
      where: { orderNo },
      data: {
        status: 'success',
        apiResult: apiResponse.result,
        apiCode: apiResponse.code,
        apiMsg: apiResponse.msg,
        apiRaw: apiResponse.raw || Prisma.JsonNull,
        completedAt: new Date(),
        duration,
      },
    });

    this.logger.log(`充值成功: ${orderNo}, 耗时: ${duration}ms`);
  }

  /**
   * 更新充值日志为失败状态
   * @param orderNo 订单号
   * @param error 错误信息
   * @param apiResponse API响应数据（可选）
   */
  async markFailed(
    orderNo: string,
    error: {
      message: string;
      code?: string;
    },
    apiResponse?: {
      result?: string;
      code?: string;
      msg?: string;
      raw?: any;
    },
  ) {
    const startTime = await this.getStartTime(orderNo);
    const duration = startTime ? Date.now() - startTime.getTime() : null;

    await this.prisma.rechargeLog.update({
      where: { orderNo },
      data: {
        status: 'failed',
        errorMessage: error.message,
        errorCode: error.code,
        apiResult: apiResponse?.result,
        apiCode: apiResponse?.code,
        apiMsg: apiResponse?.msg,
        apiRaw: apiResponse?.raw || Prisma.JsonNull,
        completedAt: new Date(),
        duration,
      },
    });

    this.logger.error(`充值失败: ${orderNo}, 错误: ${error.message}`);
  }

  /**
   * 更新充值日志为超时状态
   * @param orderNo 订单号
   */
  async markTimeout(orderNo: string) {
    const startTime = await this.getStartTime(orderNo);
    const duration = startTime ? Date.now() - startTime.getTime() : null;

    await this.prisma.rechargeLog.update({
      where: { orderNo },
      data: {
        status: 'timeout',
        errorMessage: '第三方API超时（30秒）',
        errorCode: 'TIMEOUT',
        completedAt: new Date(),
        duration,
      },
    });

    this.logger.warn(`充值超时: ${orderNo}, 耗时: ${duration}ms`);
  }

  /**
   * 检查订单是否已有充值日志
   * @param orderNo 订单号
   * @returns 是否存在
   */
  async exists(orderNo: string): Promise<boolean> {
    const count = await this.prisma.rechargeLog.count({
      where: { orderNo },
    });
    return count > 0;
  }

  /**
   * 获取充值开始时间
   * @param orderNo 订单号
   * @returns 开始时间
   */
  private async getStartTime(orderNo: string): Promise<Date | null> {
    const log = await this.prisma.rechargeLog.findUnique({
      where: { orderNo },
      select: { startedAt: true },
    });
    return log?.startedAt || null;
  }
}
