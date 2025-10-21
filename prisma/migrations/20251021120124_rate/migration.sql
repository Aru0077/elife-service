-- CreateTable
CREATE TABLE "users" (
    "openid" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("openid")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL DEFAULT 'MNT_CNY',
    "rate" DECIMAL(10,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unitel_orders" (
    "order_no" TEXT NOT NULL,
    "openid" TEXT NOT NULL,
    "msisdn" TEXT NOT NULL,
    "order_type" TEXT NOT NULL,
    "amount_mnt" DECIMAL(10,2) NOT NULL,
    "amount_cny" DECIMAL(10,2) NOT NULL,
    "exchange_rate" DECIMAL(10,4),
    "package_code" TEXT NOT NULL,
    "package_name" TEXT NOT NULL,
    "package_eng_name" TEXT NOT NULL,
    "package_unit" INTEGER,
    "package_data" TEXT,
    "package_days" INTEGER,
    "payment_status" TEXT NOT NULL,
    "recharge_status" TEXT NOT NULL,
    "sv_id" TEXT,
    "seq" TEXT,
    "method" TEXT,
    "vat_flag" TEXT,
    "vat_register_no" TEXT,
    "vat_info" JSONB,
    "api_result" TEXT,
    "api_code" TEXT,
    "api_msg" TEXT,
    "api_raw" JSONB,
    "error_message" TEXT,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "unitel_orders_pkey" PRIMARY KEY ("order_no")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE INDEX "unitel_orders_openid_idx" ON "unitel_orders"("openid");

-- CreateIndex
CREATE INDEX "unitel_orders_msisdn_idx" ON "unitel_orders"("msisdn");

-- CreateIndex
CREATE INDEX "unitel_orders_payment_status_idx" ON "unitel_orders"("payment_status");

-- CreateIndex
CREATE INDEX "unitel_orders_recharge_status_idx" ON "unitel_orders"("recharge_status");

-- CreateIndex
CREATE INDEX "unitel_orders_order_type_idx" ON "unitel_orders"("order_type");

-- CreateIndex
CREATE INDEX "unitel_orders_created_at_idx" ON "unitel_orders"("created_at");

-- AddForeignKey
ALTER TABLE "unitel_orders" ADD CONSTRAINT "unitel_orders_openid_fkey" FOREIGN KEY ("openid") REFERENCES "users"("openid") ON DELETE RESTRICT ON UPDATE CASCADE;
