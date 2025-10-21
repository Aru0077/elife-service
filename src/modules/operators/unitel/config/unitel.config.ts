export const UNITEL_CONFIG = {
  baseUrl: 'https://api.unitel.mn/api/v1',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const;

export interface UnitelCredentials {
  username: string;
  password: string;
}
