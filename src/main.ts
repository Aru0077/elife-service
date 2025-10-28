import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from '@/app.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true, // 缓冲日志直到 logger 准备好
  });

  // 使用 Pino Logger（替代默认的 NestJS Logger）
  const logger = app.get(Logger);
  app.useLogger(logger);

  // 环境变量验证日志
  logger.log('=== Environment Configuration ===');
  logger.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  logger.log(`LOG_LEVEL: ${process.env.LOG_LEVEL || 'undefined'}`);
  logger.log(`LOG_PRETTY: ${process.env.LOG_PRETTY || 'undefined'}`);
  logger.log(`DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'undefined'}`);
  logger.log('================================');

  // Trust proxy for rate limiting behind load balancers
  app.set('trust proxy', 'loopback');

  // Security
  app.use(helmet());
  app.enableCors();

  // Global prefix
  app.setGlobalPrefix('api');

  // API Versioning (Header-based)
  app.enableVersioning({
    type: VersioningType.HEADER,
    header: 'X-API-Version',
    defaultVersion: '1',
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  if (process.env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Elife Service API')
      .setDescription('Elife Service API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(
    `Rate limiting: ${process.env.THROTTLE_LIMIT} requests per ${process.env.THROTTLE_TTL} seconds`,
  );
}

void bootstrap();
