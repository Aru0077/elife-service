import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 获取资费列表 - 请求
 */
export class GetServiceTypeRequestDto {
  @ApiProperty({ example: '88616609', description: '手机号码 (MSISDN)' })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({ example: '1', description: '信息标志' })
  @IsString()
  @IsNotEmpty()
  info: string;
}

/**
 * 套餐项
 */
export class CardItemDto {
  @ApiProperty({ example: 'SD5000', description: '套餐代码' })
  code: string;

  @ApiProperty({ example: '3GB', required: false, description: '数据流量' })
  data?: string;

  @ApiProperty({ example: 5, required: false, description: '有效天数' })
  days?: number;

  @ApiProperty({
    example: '1000 unit, 3GB data, 5 days',
    description: '英文名称',
  })
  eng_name: string;

  @ApiProperty({
    example: '1000 нэгж (Data 3gb/5 хоног)',
    description: '套餐名称',
  })
  name: string;

  @ApiProperty({ example: 5000, description: '价格' })
  price: number;

  @ApiProperty({ example: '1000/5D-5000', description: '简称' })
  short_name: string;

  @ApiProperty({ example: 1000, required: false, description: '单位' })
  unit?: number;
}

/**
 * 话费套餐
 */
export class CardsDto {
  @ApiProperty({ type: [CardItemDto], description: '可续租期话费' })
  day: CardItemDto[];

  @ApiProperty({ type: [CardItemDto], description: '纯话费' })
  noday: CardItemDto[];

  @ApiProperty({ type: [CardItemDto], description: '特殊套餐' })
  special: CardItemDto[];
}

/**
 * 流量套餐
 */
export class DataDto {
  @ApiProperty({ type: [CardItemDto], description: '流量包' })
  data: CardItemDto[];

  @ApiProperty({ type: [CardItemDto], description: '按天流量包' })
  days: CardItemDto[];

  @ApiProperty({ type: [CardItemDto], description: '专用流量（游戏、音乐等）' })
  entertainment: CardItemDto[];
}

/**
 * 服务信息
 */
export class ServiceDto {
  @ApiProperty({ type: CardsDto, description: '话费套餐' })
  cards: CardsDto;

  @ApiProperty({ example: 'Smart-data', description: '服务名称' })
  name: string;

  @ApiProperty({ type: DataDto, description: '流量套餐' })
  data: DataDto;
}

/**
 * 获取资费列表 - 响应
 */
export class ServiceTypeResponseDto {
  @ApiProperty({ example: 'PREPAID', description: '服务类型' })
  servicetype: string;

  @ApiProperty({ example: '1330787', description: '产品ID' })
  productid: string;

  @ApiProperty({ example: 'Smart Data Unlimited', description: '产品名称' })
  name: string;

  @ApiProperty({ example: 'smart-data', description: '第三方名称' })
  '3rdparty_name': string;

  @ApiProperty({ example: 'prepaid', description: '账单类型' })
  billtype: string;

  @ApiProperty({ example: 'PREPAID', description: '服务账单类型' })
  service_bill_type: string;

  @ApiProperty({ example: 'ACTIVE', description: '状态' })
  status: string;

  @ApiProperty({ example: '000', description: '响应码' })
  code: string;

  @ApiProperty({ example: 'success', description: '结果' })
  result: string;

  @ApiProperty({ example: 'success', description: '消息' })
  msg: string;

  @ApiProperty({ type: ServiceDto, description: '服务套餐详情' })
  service: ServiceDto;
}
