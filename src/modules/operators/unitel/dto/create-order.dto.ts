import { IsString, IsEnum } from 'class-validator';
import { OrderType } from '../enums';

/**
 * 创建订单 DTO
 * 安全设计：前端只传递套餐标识，后端从缓存获取实时价格
 */
export class CreateOrderDto {
  /** 手机号 */
  @IsString()
  msisdn: string;

  /** 订单类型 */
  @IsEnum(OrderType)
  orderType: OrderType;

  /**
   * 套餐/账单标识
   * - orderType = balance/data: 套餐code（如 "SD5000"）
   * - orderType = invoice_payment: 账单日期（如 "2025.09.01-2025.09.30"）
   */
  @IsString()
  packageCode: string;
}
