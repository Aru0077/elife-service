import { ApiProperty } from '@nestjs/swagger';
import { OrderType, PaymentStatus, RechargeStatus } from '../enums';

/**
 * 订单响应 DTO
 */
export class OrderResponseDto {
  @ApiProperty({ description: '订单号' })
  orderNo: string;

  @ApiProperty({ description: '用户 openid' })
  openid: string;

  @ApiProperty({ description: '手机号' })
  msisdn: string;

  @ApiProperty({ description: '订单类型', enum: OrderType })
  orderType: string;

  @ApiProperty({ description: '蒙古国货币金额(MNT)' })
  amountMnt: string;

  @ApiProperty({ description: '人民币金额(CNY)' })
  amountCny: string;

  @ApiProperty({ description: '汇率快照', nullable: true })
  exchangeRate: string | null;

  @ApiProperty({ description: '套餐代码' })
  packageCode: string;

  @ApiProperty({ description: '套餐名称（蒙古语）' })
  packageName: string;

  @ApiProperty({ description: '套餐英文名称' })
  packageEngName: string;

  @ApiProperty({ description: '话费单位', nullable: true })
  packageUnit: number | null;

  @ApiProperty({ description: '流量大小', nullable: true })
  packageData: string | null;

  @ApiProperty({ description: '有效期天数', nullable: true })
  packageDays: number | null;

  @ApiProperty({ description: '支付状态', enum: PaymentStatus })
  paymentStatus: string;

  @ApiProperty({ description: '充值状态', enum: RechargeStatus })
  rechargeStatus: string;

  @ApiProperty({ description: 'Unitel服务ID', nullable: true })
  svId: string | null;

  @ApiProperty({ description: 'Unitel序列号', nullable: true })
  seq: string | null;

  @ApiProperty({ description: '支付方式', nullable: true })
  method: string | null;

  @ApiProperty({ description: 'VAT标志', nullable: true })
  vatFlag: string | null;

  @ApiProperty({ description: 'VAT注册号', nullable: true })
  vatRegisterNo: string | null;

  @ApiProperty({ description: 'API返回结果', nullable: true })
  apiResult: string | null;

  @ApiProperty({ description: 'API返回代码', nullable: true })
  apiCode: string | null;

  @ApiProperty({ description: 'API返回消息', nullable: true })
  apiMsg: string | null;

  @ApiProperty({ description: '错误消息', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ description: '错误代码', nullable: true })
  errorCode: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '支付时间', nullable: true })
  paidAt: Date | null;

  @ApiProperty({ description: '完成时间', nullable: true })
  completedAt: Date | null;
}

/**
 * 订单列表响应 DTO
 */
export class OrderListResponseDto {
  @ApiProperty({ description: '订单列表', type: [OrderResponseDto] })
  items: OrderResponseDto[];

  @ApiProperty({
    description: '分页元数据',
    type: 'object',
    properties: {
      total: { type: 'number', description: '总记录数' },
      page: { type: 'number', description: '当前页码' },
      limit: { type: 'number', description: '每页数量' },
      totalPages: { type: 'number', description: '总页数' },
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
