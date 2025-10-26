/**
 * Unitel Token 接口
 */

/**
 * Token 响应
 * POST /auth
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
  scope: string;
}
