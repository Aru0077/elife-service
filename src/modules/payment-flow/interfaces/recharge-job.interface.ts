import { OrderType } from '@prisma/client';

/**
 * 充值任务数据接口
 * 用于BullMQ队列任务的数据结构
 */
export interface RechargeJobData {
  /** 订单号 */
  orderNo: string;

  /** 运营商标识 */
  operator: 'unitel' | 'ondo';

  /** 用户微信openid */
  openid: string;

  /** 充值手机号 */
  msisdn: string;

  /** 订单类型 */
  orderType: OrderType;

  /** 套餐代码 */
  packageCode: string;

  /** 充值金额（MNT） */
  amountMnt: number;

  /** 充值类型 */
  rechargeType: OrderType;

  /** 任务创建时间戳 */
  timestamp: number;
}
