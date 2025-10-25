import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  Prisma,
  UnitelOrder,
  PaymentStatus,
  RechargeStatus,
} from '@prisma/client';
import { nanoid } from 'nanoid';
import { PrismaService } from '@/prisma/prisma.service';
import { ExchangeRateService } from '@/modules/exchange-rate/services/exchange-rate.service';
import { WechatPayApiService } from '@/modules/wechat-pay';
import { CreateOrderDto, QueryOrderDto } from '../dto';
import { CreateOrderResult } from '../interfaces/order.interface';
import { UnitelApiService } from './unitel-api.service';
import { RechargeResponse, PaymentResponse } from '../interfaces';

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
    private readonly wechatPayApiService: WechatPayApiService,
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
        paymentStatus: PaymentStatus.unpaid,
        rechargeStatus: RechargeStatus.pending,
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
        ...(paymentStatus === PaymentStatus.paid && { paidAt: new Date() }),
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
        ...(rechargeStatus === RechargeStatus.success && {
          completedAt: new Date(),
        }),
      },
    });

    this.logger.info(`订单 ${orderNo} 充值状态已更新: ${rechargeStatus}`);
    return order;
  }

  /**
   * 创建微信支付订单
   * @param orderNo 订单号
   * @param openid 用户的 openid
   * @returns 微信支付预支付交易会话标识
   */
  async createWechatPayment(
    orderNo: string,
    openid: string,
  ): Promise<{ prepayId: string }> {
    // 查询订单
    const order = await this.findByOrderNo(orderNo);

    // 验证订单状态
    if (order.paymentStatus !== 'unpaid') {
      throw new Error(`订单状态不允许支付: ${order.paymentStatus}`);
    }

    if (order.openid !== openid) {
      throw new Error('订单不属于当前用户');
    }

    // 调用微信支付API创建订单
    const result = await this.wechatPayApiService.createTransaction({
      description: `${order.packageEngName} - ${order.msisdn}`,
      out_trade_no: orderNo,
      amount: {
        total: Math.round(order.amountCny.toNumber() * 100), // 转换为分
      },
      payer: { openid },
    });

    this.logger.info(`微信支付订单创建成功: ${orderNo}`);

    return {
      prepayId: result.prepay_id,
    };
  }

  /**
   * 执行充值操作（带超时控制和状态机保护）
   * @param orderNo 订单号
   * @returns 充值结果
   */
  async executeRecharge(orderNo: string): Promise<{
    success: boolean;
    status: RechargeStatus;
    message?: string;
  }> {
    try {
      // 第2层防护：数据库状态机 - 原子更新（只有pending状态才能开始充值）
      const updateResult = await this.prisma.unitelOrder.updateMany({
        where: {
          orderNo,
          rechargeStatus: RechargeStatus.pending, // WHERE条件：只更新pending状态
        },
        data: {
          rechargeStatus: RechargeStatus.processing,
        },
      });

      // 如果更新失败（count === 0），说明状态不是pending（可能已经充值过）
      if (updateResult.count === 0) {
        this.logger.warn(`订单状态不允许充值（状态机保护）: ${orderNo}`);
        return {
          success: false,
          status: RechargeStatus.pending,
          message: '订单状态不允许充值',
        };
      }

      this.logger.info(`开始执行充值: ${orderNo}`);

      // 获取订单信息
      const order = await this.findByOrderNo(orderNo);

      // 构造 transactions 参数
      const transactions = [
        {
          journal_id: orderNo, // 使用订单号作为交易ID
          amount: order.amountMnt.toFixed(2), // 转换为"3000.00"格式
          description: order.packageEngName || '', // 套餐英文名（可为空）
          account: '', // 账户标识（可为空）
        },
      ];

      // 调用 Unitel API 进行充值（30秒超时）
      const startTime = Date.now();
      let apiResponse: RechargeResponse | PaymentResponse;

      try {
        // 根据订单类型调用不同的API
        switch (order.orderType) {
          case 'balance':
            apiResponse = await this.unitelApiService.rechargeBalance({
              msisdn: order.msisdn,
              card: order.packageCode,
              vatflag: order.vatFlag || '0',
              vat_register_no: order.vatRegisterNo || '',
              transactions,
            });
            break;

          case 'data':
            apiResponse = await this.unitelApiService.rechargeData({
              msisdn: order.msisdn,
              package: order.packageCode,
              vatflag: order.vatFlag || '0',
              vat_register_no: order.vatRegisterNo || '',
              transactions,
            });
            break;

          case 'invoice_payment':
            apiResponse = await this.unitelApiService.payInvoice({
              msisdn: order.msisdn,
              amount: order.amountMnt.toString(),
              remark: `账单支付 ${order.packageCode}`,
              vatflag: order.vatFlag || '0',
              vat_register_no: order.vatRegisterNo || '',
              transactions,
            });
            break;

          default:
            throw new Error(`不支持的订单类型: ${String(order.orderType)}`);
        }

        const duration = Date.now() - startTime;
        this.logger.info(`充值API调用完成: ${orderNo}, 耗时: ${duration}ms`);

        // 判断充值结果 (检查 result 字段是否为 'success')
        const isSuccess = apiResponse.result === 'success';
        if (isSuccess) {
          // 充值成功 - 安全访问 RechargeResponse 特有字段
          const rechargeResp = apiResponse as RechargeResponse;
          await this.updateRechargeStatus(orderNo, RechargeStatus.success, {
            svId: rechargeResp.sv_id || undefined,
            seq: rechargeResp.seq,
            apiResult: rechargeResp.result,
            apiCode: rechargeResp.code,
            apiMsg: rechargeResp.msg,
            apiRaw: apiResponse as unknown as Prisma.JsonValue,
          });

          return {
            success: true,
            status: RechargeStatus.success,
          };
        } else {
          // 充值失败
          await this.updateRechargeStatus(orderNo, RechargeStatus.failed, {
            apiResult: apiResponse.result,
            apiCode: apiResponse.code,
            apiMsg: apiResponse.msg,
            apiRaw: apiResponse as unknown as Prisma.JsonValue,
            errorMessage: apiResponse.msg || '充值失败',
            errorCode: apiResponse.code,
          });

          return {
            success: false,
            status: RechargeStatus.failed,
            message: apiResponse.msg,
          };
        }
      } catch (apiError: unknown) {
        const duration = Date.now() - startTime;
        const error = apiError as Error & { code?: string };

        // 判断是否为超时错误（30秒）
        if (duration >= 30000 || error.code === 'ETIMEDOUT') {
          this.logger.warn(`充值API超时: ${orderNo}, 耗时: ${duration}ms`);

          await this.updateRechargeStatus(orderNo, RechargeStatus.timeout, {
            errorMessage: `第三方API超时（${duration}ms）`,
            errorCode: 'TIMEOUT',
          });

          return {
            success: false,
            status: RechargeStatus.timeout,
            message: '充值超时',
          };
        }

        // 其他API错误
        throw apiError;
      }
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      this.logger.error(`充值失败: ${orderNo}`, err.stack);

      // 尝试更新状态为失败
      try {
        await this.updateRechargeStatus(orderNo, RechargeStatus.failed, {
          errorMessage: err.message || '充值异常',
          errorCode: err.code || 'UNKNOWN',
        });
      } catch (updateError: unknown) {
        const updateErr = updateError as Error;
        this.logger.error(`更新充值状态失败: ${orderNo}`, updateErr.stack);
      }

      return {
        success: false,
        status: RechargeStatus.failed,
        message: err.message,
      };
    }
  }
}
