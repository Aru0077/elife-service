/**
 * 微信网页授权 - 获取access_token接口响应
 * API: GET https://api.weixin.qq.com/sns/oauth2/access_token
 */
export interface WechatAccessTokenResponse {
  access_token: string; // 网页授权接口调用凭证
  expires_in: number; // access_token超时时间（秒）
  refresh_token: string; // 用户刷新access_token
  openid: string; // 用户唯一标识
  scope: string; // 用户授权的作用域（snsapi_base | snsapi_userinfo）
  is_snapshotuser?: number; // 是否为快照页模式虚拟账号（值为1时返回）
  unionid?: string; // 用户统一标识（仅snsapi_userinfo时返回）
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
  sub: string; // 标准JWT字段，存储openid
  openid: string; // 用户openid
  iat?: number; // 签发时间（自动生成）
  exp?: number; // 过期时间（自动生成）
}
