import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 交易信息（共享）
 */
export class TransactionDto {
  @ApiProperty({ example: 'wechat-test', description: '交易流水号' })
  @IsString()
  @IsNotEmpty()
  journal_id: string;

  @ApiProperty({ example: '3000.00', description: '交易金额' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ example: 'wechat-test', description: '交易描述' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'wechat-test', description: '账户标识' })
  @IsString()
  @IsNotEmpty()
  account: string;
}

/**
 * VAT 发票商品明细
 */
export class VatStockDto {
  @ApiProperty({ example: '8413100', description: '商品代码' })
  code: string;

  @ApiProperty({ example: 'Tulult', description: '商品名称' })
  name: string;

  @ApiProperty({ example: 'ш', description: '计量单位' })
  measureUnit: string;

  @ApiProperty({ example: '1.00', description: '数量' })
  qty: string;

  @ApiProperty({ example: '3000.00', description: '单价' })
  unitPrice: string;

  @ApiProperty({ example: '3000.00', description: '总金额' })
  totalAmount: string;

  @ApiProperty({ example: '272.73', description: '增值税' })
  vat: string;

  @ApiProperty({ example: '', description: '条形码' })
  barCode: string;

  @ApiProperty({ example: '0.00', description: '城市税' })
  cityTax: string;
}

/**
 * VAT 发票信息（完整）
 */
export class VatInfoDto {
  @ApiProperty({
    example: '000005036895100251018738410751059',
    description: '发票ID',
  })
  billId: string;

  @ApiProperty({ example: '3000.00', description: '总金额' })
  amount: string;

  @ApiProperty({ example: '3000.00', description: '现金金额' })
  cashAmount: string;

  @ApiProperty({ example: '0.00', description: '非现金金额' })
  nonCashAmount: string;

  @ApiProperty({ example: '272.73', description: '增值税' })
  vat: string;

  @ApiProperty({ example: '2025-10-18 10:26:26', description: '日期时间' })
  date: string;

  @ApiProperty({
    example: '584A0C34215E61DB745EFFA5D21E23CA3896A7832EB7263722C0DE',
    description: '内部代码',
  })
  internalCode: string;

  @ApiProperty({ example: 'KX 74016742', description: '抽奖号码' })
  lottery: string;

  @ApiProperty({ example: '5036895', description: '商户ID' })
  merchantId: string;

  @ApiProperty({ example: '241024849675...', description: 'QR码数据' })
  qrData: string;

  @ApiProperty({ example: '0.00', description: '城市税' })
  cityTax: string;

  @ApiProperty({ type: [Object], example: [], description: '银行交易记录' })
  bankTransactions: any[];

  @ApiProperty({ type: [VatStockDto], description: '商品明细' })
  stocks: VatStockDto[];

  @ApiProperty({ example: true, description: '是否成功' })
  success: boolean;

  @ApiProperty({ type: [Object], example: [], description: '账单列表' })
  bills: any[];

  @ApiProperty({ example: '1', description: '账单类型' })
  billType: string;

  @ApiProperty({ example: '', description: '客户编号' })
  customerNo: string;
}

/**
 * 充值话费 - 请求
 */
export class RechargeBalanceRequestDto {
  @ApiProperty({ example: '88616609', description: '手机号码 (MSISDN)' })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({ example: 'SD3000', description: '话费套餐代码' })
  @IsString()
  @IsNotEmpty()
  card: string;

  @ApiProperty({ example: '1', description: 'VAT标志 (1=开发票, 0=不开)' })
  @IsString()
  @IsNotEmpty()
  vatflag: string;

  @ApiProperty({ example: '', description: 'VAT注册号（可选）' })
  @IsString()
  vat_register_no: string;

  @ApiProperty({ type: [TransactionDto], description: '交易详情' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  transactions: TransactionDto[];
}

/**
 * 充值话费 - 响应
 */
export class RechargeBalanceResponseDto {
  @ApiProperty({ example: 'success', description: '结果' })
  result: string;

  @ApiProperty({ example: '000', description: '响应码' })
  code: string;

  @ApiProperty({ example: 'success', description: '消息' })
  msg: string;

  @ApiProperty({ example: 'P_ETOPUP_0102493497', description: '服务ID' })
  sv_id: string;

  @ApiProperty({ example: '1760754386127', description: '序列号' })
  seq: string;

  @ApiProperty({ example: 'cash', description: '支付方式' })
  method: string;

  @ApiProperty({ type: VatInfoDto, description: 'VAT发票信息' })
  vat: VatInfoDto;
}

/**
 * 充值流量 - 请求
 */
export class RechargeDataRequestDto {
  @ApiProperty({ example: '88616609', description: '手机号码 (MSISDN)' })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({ example: 'data3gb2d', description: '流量套餐代码' })
  @IsString()
  @IsNotEmpty()
  package: string;

  @ApiProperty({ example: '1', description: 'VAT标志 (1=开发票, 0=不开)' })
  @IsString()
  @IsNotEmpty()
  vatflag: string;

  @ApiProperty({ example: '', description: 'VAT注册号（可选）' })
  @IsString()
  vat_register_no: string;

  @ApiProperty({ type: [TransactionDto], description: '交易详情' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  transactions: TransactionDto[];
}

/**
 * 充值流量 - 响应
 */
export class RechargeDataResponseDto {
  @ApiProperty({ example: 'success', description: '结果' })
  result: string;

  @ApiProperty({ example: '000', description: '响应码' })
  code: string;

  @ApiProperty({ example: 'success', description: '消息' })
  msg: string;

  @ApiProperty({
    example: null,
    nullable: true,
    description: '服务ID（可能为null）',
  })
  sv_id: string | null;

  @ApiProperty({ example: 'cash', description: '支付方式' })
  method: string;

  @ApiProperty({ example: '1760754538548', description: '序列号' })
  seq: string;

  @ApiProperty({ type: VatInfoDto, description: 'VAT发票信息' })
  vat: VatInfoDto;
}
