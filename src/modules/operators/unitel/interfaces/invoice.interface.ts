/**
 * Unitel 后付费账单接口
 */

/**
 * 后付费账单响应
 * POST /service/unitel
 */
export interface InvoiceResponse {
  invoice_amount: number; // 账单金额
  remain_amount: number; // 剩余金额
  invoice_date: string; // 账单日期 "2025.09.01-2025.09.30"
  broadcast_fee: string; // 广播费
  result: string;
  code: string;
  msg: string;
  total_unpaid: number; // 总未付金额
  invoice_unpaid: number; // 账单未付金额
  invoice_status: string; // 账单状态 "unpaid"
}
