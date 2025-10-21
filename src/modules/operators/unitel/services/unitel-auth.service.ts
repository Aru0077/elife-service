import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UNITEL_CONFIG } from '../config/unitel.config';
import { AuthResponseDto } from '../dto';

@Injectable()
export class UnitelAuthService {
  private readonly logger = new Logger(UnitelAuthService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get valid access token (from cache or fetch new one)
   */
  async getValidToken(username: string, password: string): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.isTokenValid()) {
      this.logger.debug('Using cached token');
      return this.accessToken;
    }

    // Fetch new token
    this.logger.debug('Fetching new access token');
    const tokenData = await this.fetchAccessToken(username, password);
    this.cacheToken(tokenData);

    return this.accessToken!;
  }

  /**
   * Fetch access token from Unitel API
   */
  private async fetchAccessToken(
    username: string,
    password: string,
  ): Promise<AuthResponseDto> {
    const basicAuth = this.generateBasicAuth(username, password);
    const url = `${UNITEL_CONFIG.baseUrl}/auth`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<AuthResponseDto>(
          url,
          {}, // Empty body
          {
            headers: {
              Authorization: `Basic ${basicAuth}`,
            },
            timeout: UNITEL_CONFIG.timeout,
          },
        ),
      );

      this.logger.debug('Successfully obtained access token');
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to fetch access token', error.message);
      throw new HttpException(
        'Failed to authenticate with Unitel API',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Generate Basic Auth header value
   */
  private generateBasicAuth(username: string, password: string): string {
    const credentials = `${username}:${password}`;
    return Buffer.from(credentials).toString('base64');
  }

  /**
   * Cache token with expiration time
   * Note: Unitel returns expires_in as "0", so we set a default expiration (e.g., 1 hour)
   */
  private cacheToken(tokenData: AuthResponseDto): void {
    this.accessToken = tokenData.access_token;

    // Since expires_in is "0", we set a default expiration of 1 hour (3600 seconds)
    const expiresInSeconds = 3600;
    this.tokenExpiresAt = Date.now() + expiresInSeconds * 1000;

    this.logger.debug(
      `Token cached, expires at ${new Date(this.tokenExpiresAt).toISOString()}`,
    );
  }

  /**
   * Check if cached token is still valid
   */
  private isTokenValid(): boolean {
    if (!this.tokenExpiresAt) {
      return false;
    }

    // Add 5-minute buffer before expiration
    const bufferMs = 5 * 60 * 1000;
    return Date.now() < this.tokenExpiresAt - bufferMs;
  }

  /**
   * Clear cached token (useful for testing or forced refresh)
   */
  clearToken(): void {
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.logger.debug('Token cache cleared');
  }
}
