import { IsString } from 'class-validator';

/**
 * ��D9h DTO
 */
export class GetServiceTypeDto {
  /** K:� */
  @IsString()
  msisdn: string;
}

/**
 * ���9&U DTO
 */
export class GetInvoiceDto {
  /** K:� */
  @IsString()
  msisdn: string;
}
