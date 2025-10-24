/**
 * @alicloud/log TypeScript 类型定义
 * 官方 SDK 不支持 TypeScript，此文件提供基础类型支持
 */

declare module '@alicloud/log' {
  /**
   * 日志内容（键值对格式）
   */
  interface LogContent {
    [key: string]: string;
  }

  /**
   * 单条日志
   */
  interface Log {
    timestamp: number; // Unix 时间戳（秒）
    content: LogContent;
    timestampNsPart?: number; // 可选的纳秒部分
  }

  /**
   * 日志标签
   */
  interface LogTag {
    [key: string]: string;
  }

  /**
   * 日志组
   */
  interface LogGroup {
    logs: Log[];
    topic?: string;
    source?: string;
    tags?: LogTag[];
  }

  /**
   * Client 配置
   */
  interface ClientConfig {
    accessKeyId: string;
    accessKeySecret: string;
    endpoint: string;
    region?: string;
    net?: string;
    securityToken?: string;
    credentialsProvider?: {
      getCredentials: () => Promise<{
        accessKeyId: string;
        accessKeySecret: string;
        securityToken?: string;
      }>;
    };
  }

  /**
   * 请求选项
   */
  interface RequestOptions {
    timeout?: number;
    headers?: Record<string, string>;
  }

  /**
   * 查询响应
   */
  interface GetLogsResponse {
    headers: Record<string, string>;
    body: unknown;
  }

  /**
   * Aliyun Log Service Client
   */
  class Client {
    constructor(config: ClientConfig);

    /**
     * 写入日志到 Logstore
     * @param projectName 项目名称
     * @param logstoreName Logstore 名称
     * @param logGroup 日志组
     * @param options 请求选项
     */
    postLogStoreLogs(
      projectName: string,
      logstoreName: string,
      logGroup: LogGroup,
      options?: RequestOptions,
    ): Promise<void>;

    /**
     * 查询日志
     * @param projectName 项目名称
     * @param logstoreName Logstore 名称
     * @param from 开始时间
     * @param to 结束时间
     * @param query 查询参数
     * @param options 请求选项
     */
    getLogs(
      projectName: string,
      logstoreName: string,
      from: Date,
      to: Date,
      query?: {
        query?: string;
        line?: number;
        offset?: number;
        reverse?: boolean;
      },
      options?: RequestOptions,
    ): Promise<GetLogsResponse>;

    /**
     * 创建 Project
     */
    createProject(
      projectName: string,
      options: { description?: string },
    ): Promise<void>;

    /**
     * 创建 Logstore
     */
    createLogStore(
      projectName: string,
      logstoreName: string,
      options: {
        ttl: number;
        shardCount: number;
        autoSplit?: boolean;
        maxSplitShard?: number;
      },
    ): Promise<void>;
  }

  export = Client;
}
