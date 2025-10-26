/**
 * 充值状态枚举
 */
export enum RechargeStatus {
  /** 待处理（订单已创建但未支付） */
  PENDING = 'pending',

  /** 处理中（正在调用 Unitel API） */
  PROCESSING = 'processing',

  /** 充值成功 */
  SUCCESS = 'success',

  /** 充值失败 */
  FAILED = 'failed',

  /** 充值超时（第三方API超时30秒） */
  TIMEOUT = 'timeout',
}
