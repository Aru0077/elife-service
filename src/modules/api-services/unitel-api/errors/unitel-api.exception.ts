/**
 * Unitel API 自定义异常
 * 用于在业务层透出关键调试信息，便于人工排查
 */
export interface UnitelApiExceptionPayload {
  traceId: string;
  statusCode?: number;
  unitelResult?: string;
  unitelCode?: string;
  unitelMsg?: string;
  originalError?: unknown;
}

export class UnitelApiException extends Error {
  readonly traceId: string;
  readonly statusCode?: number;
  readonly unitelResult?: string;
  readonly unitelCode?: string;
  readonly unitelMsg?: string;
  readonly originalError?: unknown;

  constructor(payload: UnitelApiExceptionPayload) {
    const { traceId, statusCode, unitelResult, unitelCode, unitelMsg } =
      payload;
    const messageParts = [
      `Unitel API 调用失败`,
      `traceId=${traceId}`,
      statusCode ? `status=${statusCode}` : undefined,
      unitelResult ? `result=${unitelResult}` : undefined,
      unitelCode ? `code=${unitelCode}` : undefined,
      unitelMsg ? `msg=${unitelMsg}` : undefined,
    ].filter(Boolean);

    super(messageParts.join(', '));
    this.name = 'UnitelApiException';
    this.traceId = traceId;
    this.statusCode = statusCode;
    this.unitelResult = unitelResult;
    this.unitelCode = unitelCode;
    this.unitelMsg = unitelMsg;
    this.originalError = payload.originalError;
  }
}
