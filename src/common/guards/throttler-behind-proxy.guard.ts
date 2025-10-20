import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

interface RequestWithIp {
  ips?: string[];
  ip?: string;
}

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as RequestWithIp;
    const ip =
      request.ips && request.ips.length > 0 ? request.ips[0] : request.ip;
    return Promise.resolve(ip || 'unknown');
  }
}
