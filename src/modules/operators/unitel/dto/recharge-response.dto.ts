import { ApiProperty } from '@nestjs/swagger';
import { VatInfoDto } from './vat-info.dto';

export class RechargeResponseDto {
  @ApiProperty({ example: 'success' })
  result: string;

  @ApiProperty({ example: '000' })
  code: string;

  @ApiProperty({ example: 'success' })
  msg: string;

  @ApiProperty({ example: 'P_ETOPUP_0102493497' })
  sv_id: string;

  @ApiProperty({ example: '1760754386127' })
  seq: string;

  @ApiProperty({ example: 'cash' })
  method: string;

  @ApiProperty({ type: VatInfoDto })
  vat: VatInfoDto;
}
