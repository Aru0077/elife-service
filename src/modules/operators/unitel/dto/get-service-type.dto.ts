import { IsString } from 'class-validator';

/**
 * 获取服务类型 DTO
 */
export class GetServiceTypeDto {
  /** 手机号 */
  @IsString()
  msisdn: string;
}

/**
 * 获取账单 DTO
 */
export class GetInvoiceDto {
  /** 手机号 */
  @IsString()
  msisdn: string;
}
