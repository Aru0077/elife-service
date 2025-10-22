/**
 * 阿里云 SLS 日志格式
 */
export interface SlsLogItem {
  time: number; // Unix 时间戳（秒）
  contents: Array<{
    key: string;
    value: string;
  }>;
}

/**
 * 阿里云 SLS 日志组
 */
export interface SlsLogGroup {
  logs: SlsLogItem[];
  topic?: string;
  source?: string;
  tags?: Array<{
    key: string;
    value: string;
  }>;
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
