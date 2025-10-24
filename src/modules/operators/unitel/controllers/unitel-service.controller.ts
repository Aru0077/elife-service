import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/user/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/user/decorators';
import { UnitelApiService } from '../services/unitel-api.service';
import { GetServiceTypeDto, GetInvoiceDto } from '../dto';

/**
 * Unitel 服务控制器
 * 提供 Unitel 运营商 API 服务类型和账单接口
 *
 * ⚠️ 重要设计说明:
 * 1. 使用 @CurrentUser('openid') 获取当前用户 openid
 * 2. 调用 getCachedServiceTypes/getCachedInvoice 进行缓存(5分钟TTL)
 * 3. 缓存键格式: unitel:service_types:{openid}:{msisdn}
 * 4. 确保与订单创建时的缓存键一致,防止价格篡改
 */
@Controller('operators/unitel')
@UseGuards(JwtAuthGuard) // 所有接口需要 JWT 认证
export class UnitelServiceController {
  constructor(private readonly unitelApiService: UnitelApiService) {}

  /**
   * 获取资费列表(带缓存)
   * POST /operators/unitel/service-types
   *
   * 缓存策略:
   * - 首次请求调用第三方 API,缓存 5 分钟
   * - 后续请求直接从 Redis 返回
   * - 创建订单时会验证价格是否来自此缓存
   *
   * @param openid 当前用户的 openid (自动注入)
   * @param dto 手机号请求参数
   * @returns 服务类型列表信息
   */
  @Post('service-types')
  getServiceTypes(
    @CurrentUser('openid') openid: string,
    @Body() dto: GetServiceTypeDto,
  ) {
    return this.unitelApiService.getCachedServiceTypes(dto.msisdn, openid);
  }

  /**
   * 获取账单(带缓存)
   * POST /operators/unitel/invoices
   *
   * 缓存策略: 同 service-types
   *
   * @param openid 当前用户的 openid (自动注入)
   * @param dto 手机号请求参数
   * @returns 账单信息
   */
  @Post('invoices')
  async getInvoice(
    @CurrentUser('openid') openid: string,
    @Body() dto: GetInvoiceDto,
  ) {
    return this.unitelApiService.getCachedInvoice(dto.msisdn, openid);
  }
}
