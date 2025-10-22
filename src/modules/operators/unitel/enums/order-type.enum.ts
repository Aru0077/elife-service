/**
 * 订单类型枚举
 */
export enum OrderType {
  /** 话费充值 */
  BALANCE = 'balance',

  /** 流量充值 */
  DATA = 'data',

  /** 后付费账单支付 */
  INVOICE_PAYMENT = 'invoice_payment',
}
