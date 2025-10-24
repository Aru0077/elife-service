import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Prisma, UnitelOrder } from '@prisma/client';
import { nanoid } from 'nanoid';
import { PrismaService } from '@/prisma/prisma.service';
import { ExchangeRateService } from '@/modules/exchange-rate/services/exchange-rate.service';
import { CreateOrderDto, QueryOrderDto } from '../dto';
import { PaymentStatus, RechargeStatus } from '../enums';
import { CreateOrderResult } from '../interfaces/order.interface';
import { UnitelApiService } from './unitel-api.service';

/**
 * Unitel 订单服务
 * 负责处理订单相关的 CRUD 操作和业务逻辑
 */
@Injectable()
export class UnitelOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly unitelApiService: UnitelApiService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UnitelOrderService.name);
  }

  /**
   * 创建订单（带价格验证）
   * @param openid 用户的 openid
   * @param dto 创建订单的数据（只包含 msisdn, orderType, packageCode）
   * @returns 创建订单结果（包含价格变动提示）
   */
  async createOrder(
    openid: string,
    dto: CreateOrderDto,
  ): Promise<CreateOrderResult> {
    // 1. 从缓存/API获取套餐详情（实时价格验证）
    const packageDetail = await this.unitelApiService.findPackageByCode({
      packageCode: dto.packageCode,
      msisdn: dto.msisdn,
      openid,
      orderType: dto.orderType,
    });

    this.logger.info(
      `套餐查询成功: ${packageDetail.code} - ${packageDetail.price} MNT`,
    );

    // 2. 获取当前汇率
    const exchangeRateData = await this.exchangeRateService.getExchangeRate();
    const exchangeRate = exchangeRateData.rate; // 字符串类型的汇率值

    // 3. 计算人民币金额
    const amountCny = Number(
      (packageDetail.price / Number(exchangeRate)).toFixed(2),
    );

    // 4. 生成订单号
    const orderNo = `UNI${Date.now()}${nanoid(8).toUpperCase()}`;

    // 5. 创建订单（价格从后端获取，前端无法篡改）
    const order = await this.prisma.unitelOrder.create({
      data: {
        orderNo,
        openid,
        msisdn: dto.msisdn,
        orderType: dto.orderType,
        amountMnt: packageDetail.price, // 使用后端验证的价格
        amountCny,
        exchangeRate,
        packageCode: packageDetail.code,
        packageName: packageDetail.name,
        packageEngName: packageDetail.engName,
        packageUnit: packageDetail.unit,
        packageData: packageDetail.data,
        packageDays: packageDetail.days,
        paymentStatus: PaymentStatus.UNPAID,
        rechargeStatus: RechargeStatus.PENDING,
      },
    });

    this.logger.info(
      `订单创建成功: ${orderNo} | 金额: ${packageDetail.price} MNT (${amountCny} CNY)`,
    );

    // 6. 返回订单（不含价格变动提示，因为总是使用最新价格）
    return {
      order,
      priceChanged: false, // 默认无价格变动
    };
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
      apiRaw?: Prisma.JsonValue;
      errorCode?: string;
      errorMessage?: string;
    },
  ): Promise<UnitelOrder> {
    const order = await this.prisma.unitelOrder.update({
      where: { orderNo },
      data: {
        rechargeStatus,
        ...(apiResponse?.svId ? { svId: apiResponse.svId } : {}),
        ...(apiResponse?.seq ? { seq: apiResponse.seq } : {}),
        ...(apiResponse?.apiResult ? { apiResult: apiResponse.apiResult } : {}),
        ...(apiResponse?.apiCode ? { apiCode: apiResponse.apiCode } : {}),
        ...(apiResponse?.apiMsg ? { apiMsg: apiResponse.apiMsg } : {}),
        ...(apiResponse?.apiRaw ? { apiRaw: apiResponse.apiRaw } : {}),
        ...(apiResponse?.errorCode ? { errorCode: apiResponse.errorCode } : {}),
        ...(apiResponse?.errorMessage
          ? { errorMessage: apiResponse.errorMessage }
          : {}),
        ...(rechargeStatus === RechargeStatus.SUCCESS && {
          completedAt: new Date(),
        }),
      },
    });

    this.logger.info(`订单 ${orderNo} 充值状态已更新: ${rechargeStatus}`);
    return order;
  }
}
