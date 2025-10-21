import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UnitelAuthService } from './services/unitel-auth.service';
import { UnitelApiService } from './services/unitel-api.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [UnitelAuthService, UnitelApiService],
  exports: [UnitelApiService, UnitelAuthService],
})
export class UnitelModule {}
