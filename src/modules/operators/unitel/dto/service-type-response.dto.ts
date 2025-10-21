import { ApiProperty } from '@nestjs/swagger';

// Card/Package item structure
export class CardItemDto {
  @ApiProperty({ example: 'SD5000' })
  code: string;

  @ApiProperty({ example: '3GB', required: false })
  data?: string;

  @ApiProperty({ example: 5, required: false })
  days?: number;

  @ApiProperty({ example: '1000 unit, 3GB data, 5 days' })
  eng_name: string;

  @ApiProperty({ example: '1000 нэгж (Data 3gb/5 хоног)' })
  name: string;

  @ApiProperty({ example: 5000 })
  price: number;

  @ApiProperty({ example: '1000/5D-5000' })
  short_name: string;

  @ApiProperty({ example: 1000, required: false })
  unit?: number;
}

// Cards structure
export class CardsDto {
  @ApiProperty({ type: [CardItemDto] })
  day: CardItemDto[];

  @ApiProperty({ type: [CardItemDto] })
  noday: CardItemDto[];

  @ApiProperty({ type: [CardItemDto] })
  special: CardItemDto[];
}

// Data structure
export class DataDto {
  @ApiProperty({ type: [CardItemDto] })
  data: CardItemDto[];

  @ApiProperty({ type: [CardItemDto] })
  days: CardItemDto[];

  @ApiProperty({ type: [CardItemDto] })
  entertainment: CardItemDto[];
}

// Service structure
export class ServiceDto {
  @ApiProperty({ type: CardsDto })
  cards: CardsDto;

  @ApiProperty({ example: 'Smart-data' })
  name: string;

  @ApiProperty({ type: DataDto })
  data: DataDto;
}

export class ServiceTypeResponseDto {
  @ApiProperty({ example: 'PREPAID' })
  servicetype: string;

  @ApiProperty({ example: '1330787' })
  productid: string;

  @ApiProperty({ example: 'Smart Data Unlimited' })
  name: string;

  @ApiProperty({ example: 'smart-data' })
  '3rdparty_name': string;

  @ApiProperty({ example: 'prepaid' })
  billtype: string;

  @ApiProperty({ example: 'PREPAID' })
  service_bill_type: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: '000' })
  code: string;

  @ApiProperty({ example: 'success' })
  result: string;

  @ApiProperty({ example: 'success' })
  msg: string;

  @ApiProperty({ type: ServiceDto })
  service: ServiceDto;
}
