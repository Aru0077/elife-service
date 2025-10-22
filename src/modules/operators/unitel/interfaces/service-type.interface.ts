/**
 * Unitel 资费列表接口
 */

/**
 * 套餐卡片项
 */
export interface CardItem {
  code: string; // 套餐代码 "SD5000"
  name: string; // 套餐名称（蒙古语）
  eng_name: string; // 英文名称
  price: number; // 价格（MNT）
  unit?: number; // 话费单位
  data?: string; // 流量大小 "3GB"
  days?: number; // 有效期天数
  short_name: string; // 简称
}

/**
 * 资费列表响应
 * POST /service/servicetype
 */
export interface ServiceTypeResponse {
  servicetype: string; // "PREPAID"
  productid: string;
  name: string;
  '3rdparty_name': string;
  billtype: string;
  service_bill_type: string;
  status: string;
  code: string;
  result: string;
  msg: string;
  service: {
    name: string;
    cards: {
      day: CardItem[]; // 可续租期话费
      noday: CardItem[]; // 纯话费
      special: CardItem[]; // 特殊套餐
    };
    data: {
      data: CardItem[]; // 流量包
      days: CardItem[]; // 按天流量包
      entertainment: CardItem[]; // 专用流量（游戏、音乐等）
    };
  };
}
