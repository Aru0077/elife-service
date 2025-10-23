import { IsString } from 'class-validator';

/**
 * ·ÖD9h DTO
 */
export class GetServiceTypeDto {
  /** K:÷ */
  @IsString()
  msisdn: string;
}

/**
 * ·ÖØ9&U DTO
 */
export class GetInvoiceDto {
  /** K:÷ */
  @IsString()
  msisdn: string;
}
