import { ApiProperty } from '@nestjs/swagger';

export class VatStockDto {
  @ApiProperty({ example: '8413100' })
  code: string;

  @ApiProperty({ example: 'Tulult' })
  name: string;

  @ApiProperty({ example: 'ш' })
  measureUnit: string;

  @ApiProperty({ example: '1.00' })
  qty: string;

  @ApiProperty({ example: '3000.00' })
  unitPrice: string;

  @ApiProperty({ example: '3000.00' })
  totalAmount: string;

  @ApiProperty({ example: '272.73' })
  vat: string;

  @ApiProperty({ example: '' })
  barCode: string;

  @ApiProperty({ example: '0.00' })
  cityTax: string;
}

export class VatInfoDto {
  @ApiProperty({ example: '000005036895100251018738410751059' })
  billId: string;

  @ApiProperty({ example: '3000.00' })
  amount: string;

  @ApiProperty({ example: '3000.00' })
  cashAmount: string;

  @ApiProperty({ example: '0.00' })
  nonCashAmount: string;

  @ApiProperty({ example: '272.73' })
  vat: string;

  @ApiProperty({ example: '2025-10-18 10:26:26' })
  date: string;

  @ApiProperty({
    example: '584A0C34215E61DB745EFFA5D21E23CA3896A7832EB7263722C0DE',
  })
  internalCode: string;

  @ApiProperty({ example: 'KX 74016742' })
  lottery: string;

  @ApiProperty({ example: '5036895' })
  merchantId: string;

  @ApiProperty({
    example:
      '2410248496750450404614502426819910361585873064837132130409610153625987929431182538129680659473549553499380944057530850708611199849311501589712089016711099666656658687910541474983666674714642463573060024912260897882723582024712332028024999220172925909104400330560526203898559442083845807641230246289807655924720499859',
  })
  qrData: string;

  @ApiProperty({ example: '0.00' })
  cityTax: string;

  @ApiProperty({ type: [Object], example: [] })
  bankTransactions: any[];

  @ApiProperty({ type: [VatStockDto] })
  stocks: VatStockDto[];

  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [Object], example: [] })
  bills: any[];

  @ApiProperty({ example: '1' })
  billType: string;

  @ApiProperty({ example: '' })
  customerNo: string;
}
