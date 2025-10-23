/**
 * 微信网页授权 - 获取access_token接口响应
 * API: GET https://api.weixin.qq.com/sns/oauth2/access_token
 * 注：只保留实际使用的字段，access_token等字段不需要（微信支付仅需openid）
 */
export interface WechatAccessTokenResponse {
  openid: string; // 用户唯一标识
  scope?: string; // 用户授权的作用域（snsapi_base | snsapi_userinfo）
}

/**
 * 微信网页授权 - 错误响应
 */
export interface WechatErrorResponse {
  errcode: number; // 错误码
  errmsg: string; // 错误信息
}

/**
 * JWT Payload 数据结构
 */
export interface JwtPayload {
  sub: string; // 标准JWT字段，存储用户openid
  iat?: number; // 签发时间（自动生成）
  exp?: number; // 过期时间（自动生成）
}
