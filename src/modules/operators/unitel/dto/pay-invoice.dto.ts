import { IsString } from 'class-validator';

/**
 * 账单支付 DTO
 */
export class PayInvoiceDto {
  /** 手机号 */
  @IsString()
  msisdn: string;

  /** 账单日期（如 "2025.09.01-2025.09.30"） */
  @IsString()
  invoiceDate: string;
}
