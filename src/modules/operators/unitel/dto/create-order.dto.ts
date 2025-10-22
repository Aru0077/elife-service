import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  Matches,
} from 'class-validator';
import { OrderType } from '../enums';

/**
 * 创建订单请求 DTO
 */
export class CreateOrderDto {
  @ApiProperty({
    description: '用户 openid（微信用户唯一标识）',
    example: 'oxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  openid: string;

  @ApiProperty({
    description: '手机号',
    example: '99887766',
  })
  @IsString()
  @Matches(/^\d{8}$/, { message: '手机号必须是8位数字' })
  msisdn: string;

  @ApiProperty({
    description: '订单类型',
    enum: OrderType,
    example: OrderType.BALANCE,
  })
  @IsEnum(OrderType)
  orderType: OrderType;

  @ApiProperty({
    description: '套餐代码',
    example: 'SD5000',
  })
  @IsString()
  packageCode: string;

  @ApiProperty({
    description: '套餐名称（蒙古语）',
    example: '5000₮ нөхөн төлөлт',
  })
  @IsString()
  packageName: string;

  @ApiProperty({
    description: '套餐英文名称',
    example: '5000₮ Credit',
  })
  @IsString()
  packageEngName: string;

  @ApiProperty({
    description: '蒙古国货币金额(MNT)',
    example: 5000,
  })
  @IsNumber()
  amountMnt: number;

  @ApiProperty({
    description: '话费单位',
    example: 5000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  packageUnit?: number;

  @ApiProperty({
    description: '流量大小（如"3GB"）',
    example: '3GB',
    required: false,
  })
  @IsOptional()
  @IsString()
  packageData?: string;

  @ApiProperty({
    description: '有效期天数',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  packageDays?: number;

  @ApiProperty({
    description: 'VAT标志（1=开发票, 0=不开）',
    example: '0',
    required: false,
  })
  @IsOptional()
  @IsString()
  vatFlag?: string;

  @ApiProperty({
    description: 'VAT注册号',
    example: '',
    required: false,
  })
  @IsOptional()
  @IsString()
  vatRegisterNo?: string;
}
