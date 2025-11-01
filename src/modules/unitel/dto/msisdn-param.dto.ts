import { IsString, Matches } from 'class-validator';

/**
 * 手机号路径参数 DTO
 * 约束：8 位数字
 */
export class MsisdnParamDto {
  @IsString()
  @Matches(/^\d{8}$/, {
    message: 'msisdn 必须为 8 位数字手机号',
  })
  msisdn: string;
}
