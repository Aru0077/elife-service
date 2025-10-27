#!/bin/sh
set -e  # 若迁移失败，立即退出容器，避免启动应用

# 执行Prisma数据库迁移（生产环境专用命令）
echo "开始执行数据库迁移..."
npx prisma migrate deploy

# 迁移成功后，启动NestJS应用
echo "迁移完成，启动应用服务..."
node dist/main