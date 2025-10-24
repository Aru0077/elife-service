/**
 * 阿里云 SLS 日志格式
 */
export interface SlsLogItem {
  timestamp: number; // Unix 时间戳（秒）
  content: Record<string, string>; // 日志内容键值对
  timestampNsPart?: number; // 可选的纳秒部分
}

/**
 * 阿里云 SLS 日志组
 */
export interface SlsLogGroup {
  logs: SlsLogItem[];
  topic?: string;
  source?: string;
  tags?: Record<string, string>[];
}

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
