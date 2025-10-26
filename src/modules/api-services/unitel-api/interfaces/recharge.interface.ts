/**
 * Unitel 充值接口（话费和流量）
 */

/**
 * VAT 发票库存项
 */
export interface VatStock {
  code: string;
  name: string;
  measureUnit: string; // 测量单位
  qty: string; // 数量
  unitPrice: string; // 单价
  totalAmount: string; // 总金额
  vat: string; // 增值税
  barCode: string; // 条形码
  cityTax: string; // 城市税
}

/**
 * VAT 发票信息
 */
export interface VatInfo {
  billId: string; // 账单ID
  amount: string; // 金额
  cashAmount: string; // 现金金额
  nonCashAmount: string; // 非现金金额
  vat: string; // 增值税
  date: string; // 日期 "2025-10-18 10:26:26"
  internalCode: string; // 内部代码
  lottery: string; // 彩票号 "KX 74016742"
  merchantId: string; // 商户ID
  qrData: string; // 二维码数据
  cityTax: string; // 城市税
  bankTransactions: any[]; // 银行交易
  stocks: VatStock[]; // 库存项
  success: boolean; // 是否成功
  bills: any[]; // 账单列表
  billType: string; // 账单类型
  customerNo: string; // 客户编号
}

/**
 * 充值响应（话费和流量通用）
 * POST /service/recharge (话费)
 * POST /service/datapackage (流量)
 */
export interface RechargeResponse {
  result: string; // "success"
  code: string; // "000"
  msg: string; // "success"
  sv_id: string | null; // Unitel服务ID
  seq: string; // 序列号
  method: string; // 支付方式 "cash"
  vat: VatInfo; // VAT发票信息
}

/**
 * 支付后付费账单响应
 * POST /service/payment
 * 注意：文档中响应暂时未知，待补充
 */
export interface PaymentResponse {
  result: string;
  code: string;
  msg: string;
  [key: string]: any; // 其他未知字段
}
