import { ApiProperty } from '@nestjs/swagger';
import { VatInfoDto } from './vat-info.dto';

export class DataPackageResponseDto {
  @ApiProperty({ example: 'success' })
  result: string;

  @ApiProperty({ example: '000' })
  code: string;

  @ApiProperty({ example: 'success' })
  msg: string;

  @ApiProperty({ example: null, nullable: true })
  sv_id: string | null;

  @ApiProperty({ example: 'cash' })
  method: string;

  @ApiProperty({ example: '1760754538548' })
  seq: string;

  @ApiProperty({ type: VatInfoDto })
  vat: VatInfoDto;
}
