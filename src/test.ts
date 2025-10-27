// 调试用：在创建并初始化 app 后、app.listen 之前调用 dumpExpressRoutes(app)
// 目的是在运行时列出 Express 注册的路由/层，定位含 '*' 的旧式路由（例如 "/api/*"）
// 使用 TypeScript 明确定义类型，避免 `never` 错误

import { INestApplication } from '@nestjs/common';

type RouteInfo = {
  type: 'route' | 'router' | 'layer';
  path?: string;
  methods?: Record<string, boolean>;
  regexp?: string;
  source?: string;
};

export function dumpExpressRoutes(app: INestApplication): void {
  try {
    // 取到 http adapter 和原生实例（Express app）
    const adapter = (
      app as unknown as { getHttpAdapter?: () => unknown }
    ).getHttpAdapter?.();
    const instance =
      typeof adapter === 'object' && adapter !== null
        ? (adapter as any).getInstance?.() // 最常见是 Express 实例
        : undefined;

    // 保护性检查
    const stack = (instance as unknown as { _router?: { stack?: unknown[] } })
      ._router?.stack;
    if (!Array.isArray(stack)) {
      console.log(
        '[dumpExpressRoutes] express router stack not found; this may not be platform-express or router not initialized yet.',
      );
      return;
    }

    const routes: RouteInfo[] = [];

    // 用受控的类型断言与运行时检查来避免 TS 报 never
    for (const item of stack) {
      const layer = item as Record<string, unknown>;

      // 情况 1：标准 route 层
      const route = layer['route'] as Record<string, unknown> | undefined;
      if (route && typeof route['path'] === 'string') {
        routes.push({
          type: 'route',
          path: route['path'],
          methods: (route['methods'] as Record<string, boolean>) ?? undefined,
        });
        continue;
      }

      // 情况 2：router 层（子路由）或其他 layer（regexp）
      const name =
        typeof layer['name'] === 'string'
          ? // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            (layer['name'] as string)
          : undefined;
      const regexpObj = layer['regexp'] as RegExp | string | undefined;

      if (name === 'router' && regexpObj) {
        routes.push({
          type: 'router',
          regexp:
            typeof regexpObj === 'string' ? regexpObj : regexpObj?.toString?.(),
        });
        continue;
      }

      if (regexpObj) {
        routes.push({
          type: 'layer',
          regexp:
            typeof regexpObj === 'string' ? regexpObj : regexpObj?.toString?.(),
        });
      }
    }

    // 先打印只含 '*' 或 '/*' 的候选项便于快速定位
    console.log('==== Registered routes that contain "*" or "/*" ====');
    for (const r of routes) {
      const hasStarInPath = typeof r.path === 'string' && r.path.includes('*');
      const hasStarInRegexp =
        typeof r.regexp === 'string' &&
        (r.regexp.includes('*') || r.regexp.includes('.*'));
      if (hasStarInPath || hasStarInRegexp) {
        console.log(JSON.stringify(r));
      }
    }

    // 如需完整列表（用于人工检查），可取消下面注释
    console.log('==== Full registered routes dump ====');
    for (const r of routes) {
      console.log(JSON.stringify(r));
    }
    console.log('==== End dump ====');
  } catch (err) {
    console.error('[dumpExpressRoutes] error dumping routes:', err);
  }
}
