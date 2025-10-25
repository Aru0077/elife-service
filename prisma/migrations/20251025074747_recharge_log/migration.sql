-- CreateTable
CREATE TABLE "recharge_logs" (
    "id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "msisdn" TEXT NOT NULL,
    "package_code" TEXT NOT NULL,
    "amount_mnt" DECIMAL(10,2) NOT NULL,
    "recharge_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "error_code" TEXT,
    "api_result" TEXT,
    "api_code" TEXT,
    "api_msg" TEXT,
    "api_raw" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "recharge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recharge_logs_order_no_key" ON "recharge_logs"("order_no");

-- CreateIndex
CREATE INDEX "recharge_logs_order_no_idx" ON "recharge_logs"("order_no");

-- CreateIndex
CREATE INDEX "recharge_logs_operator_idx" ON "recharge_logs"("operator");

-- CreateIndex
CREATE INDEX "recharge_logs_status_idx" ON "recharge_logs"("status");

-- CreateIndex
CREATE INDEX "recharge_logs_started_at_idx" ON "recharge_logs"("started_at");
