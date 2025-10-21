import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { UNITEL_CONFIG } from '../config/unitel.config';
import { UnitelAuthService } from './unitel-auth.service';
import {
  ServiceTypeRequestDto,
  ServiceTypeResponseDto,
  InvoiceRequestDto,
  InvoiceResponseDto,
  RechargeRequestDto,
  RechargeResponseDto,
  DataPackageRequestDto,
  DataPackageResponseDto,
  PaymentRequestDto,
  PaymentResponseDto,
  UnitelErrorResponseDto,
} from '../dto';

@Injectable()
export class UnitelApiService {
  private readonly logger = new Logger(UnitelApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: UnitelAuthService,
  ) {}

  /**
   * Get service type and price list for a phone number
   * Returns complete cards (balance) and data (data packages) information
   */
  async getServiceType(
    dto: ServiceTypeRequestDto,
    username: string,
    password: string,
  ): Promise<ServiceTypeResponseDto> {
    const token = await this.authService.getValidToken(username, password);
    const url = `${UNITEL_CONFIG.baseUrl}/service/servicetype`;

    try {
      const response = await this.makeAuthenticatedRequest<ServiceTypeResponseDto>(
        url,
        dto,
        token,
        username,
        password,
      );

      this.logger.debug(
        `Retrieved service type for MSISDN: ${dto.msisdn}, type: ${response.servicetype}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get service type for ${dto.msisdn}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get postpaid invoice/bill information
   * Works for any Unitel number (prepaid/postpaid), some fields may be empty
   */
  async getInvoice(
    dto: InvoiceRequestDto,
    username: string,
    password: string,
  ): Promise<InvoiceResponseDto> {
    const token = await this.authService.getValidToken(username, password);
    const url = `${UNITEL_CONFIG.baseUrl}/service/unitel`;

    try {
      const response = await this.makeAuthenticatedRequest<InvoiceResponseDto>(
        url,
        dto,
        token,
        username,
        password,
      );

      this.logger.debug(
        `Retrieved invoice for MSISDN: ${dto.msisdn}, status: ${response.invoice_status}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to get invoice for ${dto.msisdn}`, error);
      throw error;
    }
  }

  /**
   * Recharge balance using card code
   * Returns response with complete VAT information
   */
  async rechargeBalance(
    dto: RechargeRequestDto,
    username: string,
    password: string,
  ): Promise<RechargeResponseDto> {
    const token = await this.authService.getValidToken(username, password);
    const url = `${UNITEL_CONFIG.baseUrl}/service/recharge`;

    try {
      const response = await this.makeAuthenticatedRequest<RechargeResponseDto>(
        url,
        dto,
        token,
        username,
        password,
      );

      this.logger.debug(
        `Balance recharged for MSISDN: ${dto.msisdn}, card: ${dto.card}, sv_id: ${response.sv_id}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to recharge balance for ${dto.msisdn}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Recharge data package
   * Returns response with complete VAT information
   */
  async rechargeDataPackage(
    dto: DataPackageRequestDto,
    username: string,
    password: string,
  ): Promise<DataPackageResponseDto> {
    const token = await this.authService.getValidToken(username, password);
    const url = `${UNITEL_CONFIG.baseUrl}/service/datapackage`;

    try {
      const response =
        await this.makeAuthenticatedRequest<DataPackageResponseDto>(
          url,
          dto,
          token,
          username,
          password,
        );

      this.logger.debug(
        `Data package recharged for MSISDN: ${dto.msisdn}, package: ${dto.package}, seq: ${response.seq}`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to recharge data package for ${dto.msisdn}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Pay postpaid invoice/bill
   * Note: Response format is unknown as per documentation
   */
  async payInvoice(
    dto: PaymentRequestDto,
    username: string,
    password: string,
  ): Promise<PaymentResponseDto> {
    const token = await this.authService.getValidToken(username, password);
    const url = `${UNITEL_CONFIG.baseUrl}/service/payment`;

    try {
      const response = await this.makeAuthenticatedRequest<PaymentResponseDto>(
        url,
        dto,
        token,
        username,
        password,
      );

      this.logger.debug(
        `Invoice paid for MSISDN: ${dto.msisdn}, amount: ${dto.amount}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to pay invoice for ${dto.msisdn}`, error);
      throw error;
    }
  }

  /**
   * Make authenticated request to Unitel API with automatic retry on 401
   */
  private async makeAuthenticatedRequest<T>(
    url: string,
    data: any,
    token: string,
    username: string,
    password: string,
    retryCount = 0,
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .post<T>(url, data, {
            headers: {
              Authorization: `Basic ${this.generateBasicAuth(username, password)}`,
            },
            timeout: UNITEL_CONFIG.timeout,
          })
          .pipe(
            catchError((error: AxiosError<UnitelErrorResponseDto>) => {
              throw error;
            }),
          ),
      );

      // Check if response indicates error
      const responseData = response.data as any;
      if (responseData.result === '401' && retryCount < UNITEL_CONFIG.retryAttempts) {
        this.logger.warn('Received 401 error, clearing token and retrying...');
        this.authService.clearToken();

        // Retry with new token
        const newToken = await this.authService.getValidToken(
          username,
          password,
        );
        return this.makeAuthenticatedRequest(
          url,
          data,
          newToken,
          username,
          password,
          retryCount + 1,
        );
      }

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401 && retryCount < UNITEL_CONFIG.retryAttempts) {
        this.logger.warn('Received HTTP 401, clearing token and retrying...');
        this.authService.clearToken();

        // Retry with new token
        const newToken = await this.authService.getValidToken(
          username,
          password,
        );
        return this.makeAuthenticatedRequest(
          url,
          data,
          newToken,
          username,
          password,
          retryCount + 1,
        );
      }

      // Handle other errors
      this.handleError(error);
      throw error;
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
   * Handle API errors
   */
  private handleError(error: any): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      this.logger.error(
        `Unitel API error: ${status} - ${JSON.stringify(data)}`,
      );

      if (status === 401) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      } else if (status >= 500) {
        throw new HttpException(
          'Unitel API service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        throw new HttpException(
          data?.msg || 'Unitel API request failed',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else if (error.code === 'ECONNABORTED') {
      this.logger.error('Request timeout');
      throw new HttpException('Request timeout', HttpStatus.REQUEST_TIMEOUT);
    } else {
      this.logger.error('Unknown error', error);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
