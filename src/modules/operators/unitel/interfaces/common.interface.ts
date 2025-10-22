/**
 * Unitel API 公共接口
 */

/**
 * Transaction 交易参数
 */
export interface Transaction {
  journal_id: string; // 交易ID
  amount: string; // 金额（字符串格式）
  description: string; // 描述
  account: string; // 账户
}

/**
 * 充值话费请求参数
 * POST /service/recharge
 */
export interface RechargeBalanceParams {
  msisdn: string; // 手机号
  card: string; // 套餐代码 如 "SD3000"
  vatflag: string; // VAT标志 "0" 或 "1"
  vat_register_no: string; // VAT注册号
  transactions: Transaction[]; // 交易列表
}

/**
 * 充值流量请求参数
 * POST /service/datapackage
 */
export interface RechargeDataParams {
  msisdn: string; // 手机号
  package: string; // 套餐代码 如 "data3gb2d"
  vatflag: string; // VAT标志 "0" 或 "1"
  vat_register_no: string; // VAT注册号
  transactions: Transaction[]; // 交易列表
}

/**
 * 支付后付费账单请求参数
 * POST /service/payment
 */
export interface PayInvoiceParams {
  msisdn: string; // 手机号
  amount: string; // 金额
  remark: string; // 备注
  vatflag: string; // VAT标志 "0" 或 "1"
  vat_register_no: string; // VAT注册号
  transactions: Transaction[]; // 交易列表
}

/**
 * Unitel API 错误响应
 */
export interface UnitelErrorResponse {
  result: string; // 如 "401"
  msg: string; // 如 "Unauthorized"
}
