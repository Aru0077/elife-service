import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RECHARGE_QUEUE, RECHARGE_JOB } from '../constants/queue.constants';
import { RechargeJobData } from '../interfaces/recharge-job.interface';
import { RechargeLogService } from '../services/recharge-log.service';
import { UnitelOrderService } from '@/modules/operators/unitel/services/unitel-order.service';

/**
 * 充值队列处理器
 * 处理异步充值任务，无重试策略
 */
@Processor(RECHARGE_QUEUE)
export class RechargeProcessor extends WorkerHost {
  private readonly logger = new Logger(RechargeProcessor.name);

  constructor(
    private readonly rechargeLogService: RechargeLogService,
    private readonly unitelOrderService: UnitelOrderService,
  ) {
    super();
  }

  /**
   * 处理充值任务
   * @param job BullMQ任务
   */
  async process(job: Job<RechargeJobData, any, string>): Promise<void> {
    const { orderNo, operator, msisdn, packageCode, amountMnt, rechargeType } =
      job.data;

    this.logger.log(`开始处理充值任务: ${orderNo}`);

    try {
      // 第3层防护：创建充值日志（unique constraint on orderNo）
      // 如果orderNo已存在，会抛出DUPLICATE_RECHARGE错误
      await this.rechargeLogService.createLog({
        orderNo,
        operator,
        msisdn,
        packageCode,
        amountMnt,
        rechargeType,
      });

      // 根据运营商调用相应的充值方法
      let result: {
        success: boolean;
        status: string;
        message?: string;
      };
      if (operator === 'unitel') {
        result = await this.unitelOrderService.executeRecharge(orderNo);
      } else {
        throw new Error(`不支持的运营商: ${operator}`);
      }

      // 根据充值结果更新日志
      if (result.success) {
        await this.rechargeLogService.markSuccess(orderNo, {
          result: 'SUCCESS',
        });
        this.logger.log(`充值任务处理成功: ${orderNo}`);
      } else {
        // 根据状态更新日志
        if (result.status === 'timeout') {
          await this.rechargeLogService.markTimeout(orderNo);
        } else {
          await this.rechargeLogService.markFailed(orderNo, {
            message: result.message || '充值失败',
          });
        }
        this.logger.warn(`充值任务失败: ${orderNo}, 状态: ${result.status}`);
      }
    } catch (error) {
      // 处理重复充值错误
      if (error.message === 'DUPLICATE_RECHARGE') {
        this.logger.warn(`重复充值被拦截（数据库层）: ${orderNo}`);
        // 不抛出错误，任务成功完成（已被幂等性保护）
        return;
      }

      // 其他错误：记录并抛出（任务失败）
      this.logger.error(`充值任务处理失败: ${orderNo}`, error.stack);
      throw error;
    }
  }
}
