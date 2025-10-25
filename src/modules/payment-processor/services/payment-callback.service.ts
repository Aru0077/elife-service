import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { RECHARGE_QUEUE, RECHARGE_JOB } from '../constants/queue.constants';
import { RechargeJobData } from '../interfaces/recharge-job.interface';

/**
 * 支付回调服务
 * 负责处理微信支付回调，防重复检查，并将充值任务加入队列
 */
@Injectable()
export class PaymentCallbackService {
  private readonly logger = new Logger(PaymentCallbackService.name);

  // Redis回调ID缓存前缀
  private readonly CALLBACK_KEY_PREFIX = 'wechat:callback:';

  // 回调缓存TTL（24小时）
  private readonly CALLBACK_TTL = 24 * 60 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue(RECHARGE_QUEUE)
    private readonly rechargeQueue: Queue<RechargeJobData>,
  ) {}

  /**
   * 处理支付成功回调
   * @param transactionId 微信支付订单号
   * @param outTradeNo 商户订单号
   * @returns 处理结果
   */
  async handlePaymentSuccess(
    transactionId: string,
    outTradeNo: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 第1层防护：Redis防重复回调检查
      const isDuplicate = await this.checkDuplicateCallback(transactionId);
      if (isDuplicate) {
        this.logger.warn(`重复回调被拦截: ${transactionId}`);
        return {
          success: true,
          message: '重复回调，已忽略',
        };
      }

      // 查询订单信息（根据商户订单号）
      const order = await this.prisma.unitelOrder.findUnique({
        where: { orderNo: outTradeNo },
      });

      if (!order) {
        this.logger.error(`订单不存在: ${outTradeNo}`);
        return {
          success: false,
          message: '订单不存在',
        };
      }

      // 检查订单是否已支付
      if (order.paymentStatus === 'paid') {
        this.logger.warn(`订单已支付，忽略重复回调: ${outTradeNo}`);
        // 标记回调为已处理（防止重复）
        await this.markCallbackProcessed(transactionId);
        return {
          success: true,
          message: '订单已支付',
        };
      }

      // 更新支付状态为已支付
      await this.prisma.unitelOrder.update({
        where: { orderNo: outTradeNo },
        data: {
          paymentStatus: 'paid',
          paidAt: new Date(),
        },
      });

      this.logger.log(`订单支付成功: ${outTradeNo}`);

      // 标记回调为已处理
      await this.markCallbackProcessed(transactionId);

      // 将充值任务加入队列（异步处理）
      await this.enqueueRechargeJob(order);

      return {
        success: true,
        message: '回调处理成功，充值任务已加入队列',
      };
    } catch (error) {
      this.logger.error('处理支付回调失败', error);
      return {
        success: false,
        message: '处理失败',
      };
    }
  }

  /**
   * 检查是否为重复回调
   * @param transactionId 微信支付订单号
   * @returns 是否重复
   */
  private async checkDuplicateCallback(
    transactionId: string,
  ): Promise<boolean> {
    const key = this.CALLBACK_KEY_PREFIX + transactionId;
    return await this.redis.exists(key);
  }

  /**
   * 标记回调为已处理
   * @param transactionId 微信支付订单号
   */
  private async markCallbackProcessed(transactionId: string): Promise<void> {
    const key = this.CALLBACK_KEY_PREFIX + transactionId;
    await this.redis.set(key, '1', this.CALLBACK_TTL);
  }

  /**
   * 将充值任务加入队列
   * @param order 订单信息
   */
  private async enqueueRechargeJob(order: {
    orderNo: string;
    openid: string;
    msisdn: string;
    orderType: string;
    packageCode: string;
    amountMnt: { toNumber: () => number };
  }): Promise<void> {
    const jobData: RechargeJobData = {
      orderNo: order.orderNo,
      operator: 'unitel', // 当前只支持unitel
      openid: order.openid,
      msisdn: order.msisdn,
      orderType: order.orderType,
      packageCode: order.packageCode,
      amountMnt: order.amountMnt.toNumber(),
      rechargeType: order.orderType as 'balance' | 'data' | 'invoice_payment',
      timestamp: Date.now(),
    };

    await this.rechargeQueue.add(RECHARGE_JOB, jobData, {
      jobId: order.orderNo, // 使用订单号作为任务ID，确保幂等性
    });

    this.logger.log(`充值任务已加入队列: ${order.orderNo}`);
  }
}
