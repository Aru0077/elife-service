import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Prisma, UnitelOrder } from '@prisma/client';
import { nanoid } from 'nanoid';
import { PrismaService } from '@/prisma/prisma.service';
import { ExchangeRateService } from '@/modules/exchange-rate/exchange-rate.service';
import { CreateOrderDto, QueryOrderDto } from '../dto';
import { PaymentStatus, RechargeStatus } from '../enums';

/**
 * Unitel 订单服务
 * 负责处理订单相关的 CRUD 操作和业务逻辑
 */
@Injectable()
export class UnitelOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UnitelOrderService.name);
  }

  /**
   * 创建订单
   * @param openid 用户的 openid
   * @param dto 创建订单的数据
   * @returns 新创建的订单
   */
  async createOrder(openid: string, dto: CreateOrderDto): Promise<UnitelOrder> {
    // 1. 生成订单号（使用时间戳 + nanoid 保证唯一性）
    const orderNo = `UNI${Date.now()}${nanoid(8).toUpperCase()}`;

    // 2. 获取当前汇率（蒙古图格里克转人民币）
    const exchangeRate = await this.exchangeRateService.getExchangeRate();

    // 3. 创建订单
    const order = await this.prisma.unitelOrder.create({
      data: {
        orderNo,
        openid,
        msisdn: dto.msisdn,
        orderType: dto.orderType,
        amountMnt: dto.amountMnt,
        amountCny: dto.amountCny,
        exchangeRate,
        packageCode: dto.packageCode,
        packageName: dto.packageName,
        packageEngName: dto.packageEngName,
        packageUnit: dto.packageUnit,
        packageData: dto.packageData,
        packageDays: dto.packageDays,
        paymentStatus: PaymentStatus.UNPAID,
        rechargeStatus: RechargeStatus.PENDING,
      },
    });

    this.logger.info(`订单创建成功: ${orderNo}`);
    return order;
  }

  /**
   * 查询用户的订单列表
   * @param openid 用户的 openid
   * @param dto 查询参数
   * @returns 订单列表和分页信息
   */
  async findUserOrders(openid: string, dto: QueryOrderDto) {
    const {
      page = 1,
      pageSize = 20,
      paymentStatus,
      rechargeStatus,
      orderType,
    } = dto;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.UnitelOrderWhereInput = {
      openid,
      ...(paymentStatus && { paymentStatus }),
      ...(rechargeStatus && { rechargeStatus }),
      ...(orderType && { orderType }),
    };

    // 并行查询订单列表和总数
    const [orders, total] = await Promise.all([
      this.prisma.unitelOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.unitelOrder.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 根据订单号查询订单
   * @param orderNo 订单号
   * @returns 订单详情
   * @throws NotFoundException 订单不存在时抛出
   */
  async findByOrderNo(orderNo: string): Promise<UnitelOrder> {
    const order = await this.prisma.unitelOrder.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new NotFoundException(`订单不存在: ${orderNo}`);
    }

    return order;
  }

  /**
   * 更新支付状态
   * @param orderNo 订单号
   * @param paymentStatus 支付状态
   */
  async updatePaymentStatus(
    orderNo: string,
    paymentStatus: PaymentStatus,
  ): Promise<UnitelOrder> {
    const order = await this.prisma.unitelOrder.update({
      where: { orderNo },
      data: {
        paymentStatus,
        ...(paymentStatus === PaymentStatus.PAID && { paidAt: new Date() }),
      },
    });

    this.logger.info(`订单 ${orderNo} 支付状态已更新: ${paymentStatus}`);
    return order;
  }

  /**
   * 更新充值状态
   * @param orderNo 订单号
   * @param rechargeStatus 充值状态
   * @param apiResponse Unitel API 响应数据（可选）
   */
  async updateRechargeStatus(
    orderNo: string,
    rechargeStatus: RechargeStatus,
    apiResponse?: {
      svId?: string;
      seq?: string;
      apiResult?: string;
      apiCode?: string;
      apiMsg?: string;
      apiRaw?: any;
      errorCode?: string;
      errorMessage?: string;
    },
  ): Promise<UnitelOrder> {
    const order = await this.prisma.unitelOrder.update({
      where: { orderNo },
      data: {
        rechargeStatus,
        ...(apiResponse?.svId && { svId: apiResponse.svId }),
        ...(apiResponse?.seq && { seq: apiResponse.seq }),
        ...(apiResponse?.apiResult && { apiResult: apiResponse.apiResult }),
        ...(apiResponse?.apiCode && { apiCode: apiResponse.apiCode }),
        ...(apiResponse?.apiMsg && { apiMsg: apiResponse.apiMsg }),
        ...(apiResponse?.apiRaw && { apiRaw: apiResponse.apiRaw }),
        ...(apiResponse?.errorCode && { errorCode: apiResponse.errorCode }),
        ...(apiResponse?.errorMessage && {
          errorMessage: apiResponse.errorMessage,
        }),
        ...(rechargeStatus === RechargeStatus.SUCCESS && {
          completedAt: new Date(),
        }),
      },
    });

    this.logger.info(`订单 ${orderNo} 充值状态已更新: ${rechargeStatus}`);
    return order;
  }
}
