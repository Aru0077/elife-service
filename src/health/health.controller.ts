import { Controller, Get, Version } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @Version('1')
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check (v1)' })
  check() {
    return {
      status: 'ok',
      version: '1',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @Version('2')
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check (v2) - Enhanced' })
  checkV2() {
    return {
      status: 'ok',
      version: '2',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };
  }
}
