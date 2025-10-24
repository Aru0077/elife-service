/**
 * 微信支付接口定义
 * 基于微信支付APIv3官方文档
 */

/**
 * 创建JSAPI支付订单 - 请求参数
 */
export interface CreateTransactionRequest {
  appid: string; // 公众号ID
  mchid: string; // 商户号
  description: string; // 商品描述
  out_trade_no: string; // 商户订单号（6-32位）
  notify_url: string; // 回调通知URL
  amount: {
    total: number; // 订单金额（分）
    currency?: string; // 货币类型，默认CNY
  };
  payer: {
    openid: string; // 用户openid
  };
  time_expire?: string; // 交易结束时间（RFC3339格式）
  attach?: string; // 附加数据（128字符以内）
  goods_tag?: string; // 订单优惠标记
}

/**
 * 创建JSAPI支付订单 - 响应结果
 */
export interface CreateTransactionResponse {
  prepay_id: string; // 预支付交易会话标识（2小时有效期）
}

/**
 * 查询订单 - 响应结果
 */
export interface QueryTransactionResponse {
  appid: string;
  mchid: string;
  out_trade_no: string; // 商户订单号
  transaction_id: string; // 微信支付订单号
  trade_type: string; // 交易类型：JSAPI、NATIVE等
  trade_state: TransactionState; // 交易状态
  trade_state_desc: string; // 交易状态描述
  bank_type?: string; // 付款银行
  attach?: string; // 附加数据
  success_time?: string; // 支付完成时间（RFC3339格式）
  payer: {
    openid: string;
  };
  amount: {
    total: number; // 订单金额（分）
    payer_total: number; // 用户支付金额（分）
    currency: string; // 货币类型
    payer_currency: string; // 用户支付币种
  };
}

/**
 * 交易状态枚举
 */
export enum TransactionState {
  SUCCESS = 'SUCCESS', // 支付成功
  REFUND = 'REFUND', // 转入退款
  NOTPAY = 'NOTPAY', // 未支付
  CLOSED = 'CLOSED', // 已关闭
  REVOKED = 'REVOKED', // 已撤销（付款码支付）
  USERPAYING = 'USERPAYING', // 用户支付中
  PAYERROR = 'PAYERROR', // 支付失败
}

/**
 * 关闭订单 - 请求参数
 */
export interface CloseTransactionRequest {
  mchid: string; // 商户号
}

/**
 * 申请退款 - 请求参数
 */
export interface CreateRefundRequest {
  transaction_id?: string; // 微信支付订单号（与out_trade_no二选一）
  out_trade_no?: string; // 商户订单号（与transaction_id二选一）
  out_refund_no: string; // 商户退款单号（64字符以内）
  reason?: string; // 退款原因（80字符以内）
  notify_url?: string; // 退款回调URL
  amount: {
    refund: number; // 退款金额（分）
    total: number; // 原订单金额（分）
    currency: string; // 币种
  };
}

/**
 * 申请退款 - 响应结果
 */
export interface CreateRefundResponse {
  refund_id: string; // 微信退款单号
  out_refund_no: string; // 商户退款单号
  transaction_id: string; // 微信支付订单号
  out_trade_no: string; // 商户订单号
  channel: RefundChannel; // 退款渠道
  user_received_account: string; // 退款入账账户
  success_time?: string; // 退款成功时间
  create_time: string; // 退款创建时间
  status: RefundStatus; // 退款状态
  amount: {
    total: number; // 订单金额（分）
    refund: number; // 退款金额（分）
    payer_total: number; // 用户支付金额（分）
    payer_refund: number; // 用户退款金额（分）
  };
}

/**
 * 退款渠道
 */
export enum RefundChannel {
  ORIGINAL = 'ORIGINAL', // 原路退款
  BALANCE = 'BALANCE', // 退回到余额
  OTHER_BALANCE = 'OTHER_BALANCE', // 原账户异常退到其他余额账户
  OTHER_BANKCARD = 'OTHER_BANKCARD', // 原银行卡异常退到其他银行卡
}

/**
 * 退款状态
 */
export enum RefundStatus {
  SUCCESS = 'SUCCESS', // 退款成功
  CLOSED = 'CLOSED', // 退款关闭
  PROCESSING = 'PROCESSING', // 退款处理中
  ABNORMAL = 'ABNORMAL', // 退款异常
}

/**
 * 查询退款 - 响应结果
 */
export type QueryRefundResponse = CreateRefundResponse;

/**
 * 支付通知回调 - 请求头
 */
export interface PaymentCallbackHeaders {
  'wechatpay-timestamp': string; // 时间戳
  'wechatpay-nonce': string; // 随机串
  'wechatpay-signature': string; // 签名值
  'wechatpay-serial': string; // 证书序列号
  'wechatpay-signature-type': string; // 签名类型（通常为WECHATPAY2-SHA256-RSA2048）
}

/**
 * 支付通知回调 - 请求体（加密）
 */
export interface PaymentCallbackBody {
  id: string; // 通知ID
  create_time: string; // 通知创建时间
  resource_type: string; // 通知的资源数据类型
  event_type: string; // 通知的类型：TRANSACTION.SUCCESS等
  summary: string; // 回调摘要
  resource: {
    original_type: string; // 原始类型
    algorithm: string; // 加密算法类型：AEAD_AES_256_GCM
    ciphertext: string; // 数据密文（Base64编码）
    associated_data: string; // 附加数据
    nonce: string; // 随机串
  };
}

/**
 * 支付通知解密后的数据
 */
export interface PaymentCallbackResource {
  mchid: string;
  appid: string;
  out_trade_no: string; // 商户订单号
  transaction_id: string; // 微信支付订单号
  trade_type: string; // 交易类型
  trade_state: TransactionState; // 交易状态
  trade_state_desc: string; // 交易状态描述
  bank_type: string; // 付款银行
  attach?: string; // 附加数据
  success_time: string; // 支付完成时间
  payer: {
    openid: string;
  };
  amount: {
    total: number; // 订单金额（分）
    payer_total: number; // 用户支付金额（分）
    currency: string; // 货币类型
    payer_currency: string; // 用户支付币种
  };
}

/**
 * 退款通知解密后的数据
 */
export interface RefundCallbackResource {
  mchid: string;
  out_trade_no: string; // 商户订单号
  transaction_id: string; // 微信支付订单号
  out_refund_no: string; // 商户退款单号
  refund_id: string; // 微信退款单号
  refund_status: RefundStatus; // 退款状态
  success_time?: string; // 退款成功时间
  user_received_account: string; // 退款入账账户
  amount: {
    total: number; // 订单金额（分）
    refund: number; // 退款金额（分）
    payer_total: number; // 用户支付金额（分）
    payer_refund: number; // 用户退款金额（分）
  };
}

/**
 * 微信支付API错误响应
 */
export interface WechatPayErrorResponse {
  code: string; // 错误码
  message: string; // 错误描述
}
