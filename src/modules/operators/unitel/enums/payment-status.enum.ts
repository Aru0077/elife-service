/**
 * 支付状态枚举
 */
export enum PaymentStatus {
  /** 未支付 */
  UNPAID = 'unpaid',

  /** 已支付 */
  PAID = 'paid',

  /** 已退款 */
  REFUNDED = 'refunded',
}
