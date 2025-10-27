# ============================================
# Stage 1: Dependencies - 安装所有依赖
# ============================================
FROM node:22-alpine AS dependencies

# 设置工作目录
WORKDIR /app

# 安装 OpenSSL（Prisma 需要）
RUN apk add --no-cache openssl

# 复制 package 文件
COPY package.json package-lock.json ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN npm ci

# ============================================
# Stage 2: Build - 构建应用
# ============================================
FROM node:22-alpine AS build

WORKDIR /app

# 安装 OpenSSL
RUN apk add --no-cache openssl

# 从 dependencies 阶段复制 node_modules
COPY --from=dependencies /app/node_modules ./node_modules

# 复制源代码和配置文件
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建 NestJS 应用
RUN npm run build

# ============================================
# Stage 3: Production - 生产环境镜像
# ============================================
FROM node:22-alpine AS production

WORKDIR /app

# 安装 OpenSSL（Prisma Client 运行时需要）
RUN apk add --no-cache openssl

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# 复制 package 文件
COPY package.json package-lock.json ./

# 安装生产依赖和 prisma CLI（用于 SAE 初始化容器中的数据库迁移）
RUN npm ci --only=production && \
    npm install prisma && \
    npm cache clean --force

# 从 build 阶段复制构建产物
COPY --from=build /app/dist ./dist

# 复制 Prisma schema（生成的 Prisma Client 需要）
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma

# 更改文件所有权
RUN chown -R nestjs:nodejs /app

# 切换到非 root 用户
USER nestjs

# 暴露应用端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令
CMD ["node", "dist/main"]