import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { OrderType } from '../enums';

/**
 * ��U DTO
 */
export class CreateOrderDto {
  /** K:� */
  @IsString()
  msisdn: string;

  /** �U{� */
  @IsEnum(OrderType)
  orderType: OrderType;

  /** W� */
  @IsString()
  packageCode: string;

  /** W
����	 */
  @IsString()
  packageName: string;

  /** W�
� */
  @IsString()
  packageEngName: string;

  /** ���'ѝ(MNT) */
  @IsNumber()
  @Min(0)
  amountMnt: number;

  /** �ѝ(CNY) */
  @IsNumber()
  @Min(0)
  amountCny: number;

  /** �9UM�9E<��k	 */
  @IsOptional()
  @IsNumber()
  packageUnit?: number;

  /** A�'A�E<��k�"3GB"	 */
  @IsOptional()
  @IsString()
  packageData?: string;

  /** 	H)pA�E<��k	 */
  @IsOptional()
  @IsNumber()
  packageDays?: number;
}
