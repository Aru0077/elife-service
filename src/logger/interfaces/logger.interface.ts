/**
 * 第三方 API 调用日志
 */
export interface ThirdPartyApiLog {
  traceId: string;
  service: string; // 服务名称（如 'Unitel'）
  method: string; // HTTP 方法
  url: string;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  duration?: number; // 毫秒
  error?: string;
  timestamp: string;
}
