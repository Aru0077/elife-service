import { IsString } from 'class-validator';

/**
 * 流量充值 DTO
 */
export class RechargeDataDto {
  /** 手机号 */
  @IsString()
  msisdn: string;

  /** 套餐代码（如 "SD5000"） */
  @IsString()
  packageCode: string;
}
