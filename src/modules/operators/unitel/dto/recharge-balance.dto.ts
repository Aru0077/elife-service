import { IsString } from 'class-validator';

/**
 * 话费充值 DTO
 */
export class RechargeBalanceDto {
  /** 手机号 */
  @IsString()
  msisdn: string;

  /** 套餐代码（如 "SD5000"） */
  @IsString()
  packageCode: string;
}
